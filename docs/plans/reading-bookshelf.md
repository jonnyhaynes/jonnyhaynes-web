# Plan: Reading section — featured cover + coloured spine bars

## Context

The reading section (`src/components/Reading.tsx`) rendered saved Spotify audiobooks
as a flat 2×4 grid of portrait covers with captions — it read like a captioned image
grid. The ask: make it feel more like books on a shelf.

After iterating on the design with the owner (a 3D flip/shelf concept and an Open
Library cover source were both tried and rejected as too fussy), the final, simpler
design is:

- The **most recent book** is shown face-out as a **large square cover** (Spotify's
  square audiobook art, uncropped), taking **half the width on desktop**.
- The **remaining books** sit beside it (right half on desktop) as a **stack of
  horizontal "spine" bars** — each a coloured strip in that cover's dominant colour,
  showing the **full title + author** reading left-to-right.
- **Every item links to its Spotify page.**
- **Mobile:** the cover goes full-width on top, the bars stack full-width beneath.
- Keep the graceful-degradation contract (renders nothing when data is missing).

Spotify's audiobook art is square, and the API exposes no spine images, so the spine
bars are synthesised from each cover's **dominant colour**, computed at bake time.

## Files touched

1. `scripts/fetch-spotify.mjs` — extract each cover's dominant colour + a legible ink
   colour into a `spine` field; bump the fetch from 4 → 7 audiobooks.
2. `src/data/spotify.ts` — add optional `spine?: { bg, ink }` to `SpotifyAudiobook`.
3. `src/components/Reading.tsx` — rewrite: featured square cover + linked spine bars.
4. `.github/workflows/bake-spotify-data.yml` — `npm ci` before the fetch step so
   `sharp` is available.
5. `package.json` / lockfile — add `sharp` (devDependency).

## 1. Bake-time colour extraction (`scripts/fetch-spotify.mjs`)

The script was zero-dependency. Add **`sharp`** to decode the JPEG cover;
`sharp(buf).stats().dominant` gives the dominant RGB. A `dominantColor(imageUrl)`
helper returns `{ bg: 'rgb(r g b)', ink }`, where `ink` is `#1a1b1e` (dark) or
`#e8ddcb` (light) chosen by WCAG relative luminance for legibility. Wrapped in
try/catch → `null` on failure so one bad cover never fails the bake (mirrors the
existing 403-tolerant audiobooks path). The `/me/audiobooks` limit goes 4 → 7.

## 2. Type (`src/data/spotify.ts`)

```ts
export type SpotifyAudiobook = {
  title: string;
  authors: string;
  url: string | null;
  cover: string | null;
  spine?: { bg: string; ink: string } | null; // dominant-colour bar, baked
};
```

Optional so older baked JSON still type-checks; the component falls back to an
accent-palette bar when `spine` is absent.

## 3. Component (`src/components/Reading.tsx`)

Keep the `useSpotifyAudiobooks()` hook, the cap (now 7), the `if (!books.length)
return null` guard, the heading, and external-link semantics + `focus-visible` outline.

- Split `books` into `[feature, ...rest]`.
- Container: `flex flex-col md:flex-row` — stacked on mobile, side-by-side on desktop.
- **Feature** (`md:w-1/2`): `<a>` → Spotify wrapping an `aspect-square w-full` cover
  (📖 placeholder when no cover); subtle `group-hover:scale`.
- **Rest** (`md:w-1/2`): a `<ul>` of `SpineBar`s stacked with `gap-2`. Each bar is an
  `<a>` → Spotify, `min-h-14`, background = `spine.bg`, text = `spine.ink`, full title +
  author (wraps rather than truncates so long titles stay complete), inset shadow to
  read as a printed strip, hover scale + focus outline.

No custom CSS — plain Tailwind utilities. (Earlier flip/shelf CSS was removed.)

## 4. CI workflow (`.github/workflows/bake-spotify-data.yml`)

Add `cache: npm` to the Node setup and an `npm ci` step before the fetch step so
`sharp` is installed (it ships prebuilt binaries). Requires the updated
`package-lock.json` with `sharp` committed.

## 5. Data regeneration

The committed `public/data/spotify-audiobooks.json` (4 books, no `spine`) is left as-is;
the next CI bake regenerates it with 7 books + `spine` fields. The component degrades to
accent-palette bars until then, so this isn't blocking for merge.

## Verification

1. `npm run build` (tsc) — passes.
2. `npm run lint` — passes.
3. `npm run dev` — featured square cover at half width (desktop); coloured spine bars
   stacked in the other half with full titles; every item links to Spotify; keyboard
   focus outline present; mobile stacks cover-over-bars; ink legible in light/dark.
4. Bake helper verified against real cover URLs: each yields `spine: { bg, ink }`; a
   null/broken cover yields `spine: null` without throwing.

## Risks / notes

- **New dependency (`sharp`) in a previously zero-dep script + a CI `npm ci` step** —
  the main footprint change, flagged per CLAUDE.md. Well-maintained, prebuilt binaries,
  runs on ≤7 images twice a day.
- Spine legibility depends on the ink-contrast calc; verified across light, dark and
  saturated dominant colours.

---

## Addendum: vertical leaning-shelf rework

The horizontal-bar layout above shipped, but read more like a captioned list than a
shelf. This follow-up reworks **only the presentation** (`Reading.tsx` + `index.css` +
the section width in `Home.tsx`) — no data, script, CI, or dependency changes. The
bake pipeline and the `spine: { bg, ink }` contract are untouched.

Design (desktop), iterated live with the owner:

- The most-recent book stands **face-out in the centre** as a large square cover, sized
  to **a third of the row width** (`w-1/3`).
- The other six stand **on their ends as tall vertical spines** — two on the left
  leaning right into the cover, four on the right leaning left into it. Title + author
  run **up the spine** (`writing-mode: vertical-rl`), wrapping into extra columns so the
  **full title always shows** (a long title makes a thicker book; width is
  `min/max`-bounded, never truncated).
- Spine **heights vary** (`SPINE_FRACTIONS`, ~0.78–0.98 of the cover height) so the shelf
  reads as a real mix of book sizes; heights scale off the cover via a container query
  (`container-type: inline-size`, `--cover-h: 33.33cqw`).
- Each spine **pivots on the bottom corner it rests on** (`transform-origin` set per lean
  direction via `--pivot-x`) so every base sits **flush on the baseline** — verified: all
  spine + cover bottoms share one Y.
- The **shelf line and section title** are constrained to `max-w-4xl px-6` to match the
  "What I'm playing" (Gaming) section width, so they align to it while the books span the
  wider `max-w-6xl` row. The shelf line is a separate element (border on an inner div so
  the padding insets it); `Home.tsx` moves the Reading wrapper `max-w-4xl` → `max-w-6xl`.
- **Mobile** keeps the simpler stacked fallback (cover on top, horizontal bars below).
- `prefers-reduced-motion`: spines stand straight, no lean or hover motion.

### Files touched (rework)

1. `src/components/Reading.tsx` — vertical-spine shelf; `FeatureCover` extracted;
   `SpineBar` gains `lean` / `heightFrac` / `horizontal`; separate shelf-line element.
2. `src/index.css` — `.bookshelf`, `.book-spine`, `.book-spine-text`, `.book-shelf-line`,
   `.book-feature` blocks with the reduced-motion guard.
3. `src/pages/Home.tsx` — Reading wrapper widened to `max-w-6xl`.

### Verification (rework)

- `npm run build` (tsc) + `npm run lint` — pass.
- Layout measured via headless Chrome (CDP): shelf line + title text align pixel-exactly
  with the "What I'm playing" section (216→1064 line; title text 216→389, identical to
  "What I'm playing"); all spine + cover bottoms flush at one baseline.
- **Caveat:** a true rendered screenshot wasn't possible in the sandbox (Spotify cover
  CDN is blocked headless); geometry is verified, final visual eyeball pending on a real
  browser.
