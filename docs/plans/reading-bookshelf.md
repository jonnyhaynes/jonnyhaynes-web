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
