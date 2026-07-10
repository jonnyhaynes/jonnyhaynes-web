# Portfolio V2 — "Modern Yorkshire" redesign

**Status:** In progress — Phase 0 merged to `develop`.
**Goal:** Rebuild the personal site into a full-stack-role portfolio with a "Modern
Yorkshire" theme, live GitHub + Spotify data, dark/light mode, and an interactive
topographic background. Supersedes the old About-page design.

Source spec: Gemini "Design & Architecture Specification V2" (pasted in the
originating conversation). This plan is the engineering translation of it.

## Decisions locked in (with Jonny)

- **Styling:** adopt **Tailwind CSS v4 + Framer Motion** (per spec).
- **Existing work:** **salvage the data layer, rebuild the UI.** Cherry-pick the
  reusable backend from `feature/fitbit` onto fresh branches off current `main`;
  rebuild all UI fresh for V2.
- **Fitbit:** **keep it** as an extra personality section beyond the spec.
- **Projects:** **auto-fetch from GitHub + hand annotation.** GitHub API supplies
  most-recently-pushed repos (name, description, stack, links, last commit); Jonny
  adds a pitch + "Hardest Technical Challenge" per project in a small content file
  keyed by repo name. Repos without an annotation still render with GitHub data.
- **Reading section (NEW, beyond spec):** sits alongside music, sourced from
  **Spotify saved audiobooks** (`GET /v1/me/audiobooks`). Verified: returns title,
  authors, cover image, Spotify URL. Requires adding the **`user-library-read`**
  scope to the Spotify token → **Spotify re-auth needed** (re-run `spotify-auth.mjs`
  with the extra scope). Physical/Kindle books are out of scope for V2.
- **Links:** LinkedIn `https://www.linkedin.com/in/jonnyhaynes/`, GitHub
  `https://github.com/jonnyhaynes`.
- **Resume PDF:** Jonny provides before go-live (placeholder link until then).
- **Spotify "Coding Fuel" playlists (§D):**
  `37i9dQZF1DX8ml53Dz6izK` and `37i9dQZF1DWXXKBeJuKnWE`.

## Deployment & branch strategy (IMPORTANT — production isolation)

V2 must never reach production until launch, regardless of what merges. Enforced by
branch, not by a feature flag:

- **`main` = production.** Vercel's Production Branch is set to `main` (confirmed).
  `main` is **frozen** for the duration of V2 — nothing V2-related merges to it until
  the single launch PR. Production keeps showing V1 until then.
- **`develop` = V2 integration branch + preview.** Every phase PR targets `develop`
  (NOT `main`). Vercel auto-builds `develop` as a **preview deployment** with a stable
  branch-alias URL — that's the review link.
- **Phase branches:** `feature/v2-<phase>` off `develop`; PR into `develop`.
- **Launch:** one PR `develop → main` when everything's ready and signed off.
- **History note:** the old `develop` (a diverged V1 CV/GitHub/Spotify line, ~20
  commits never merged to main) was archived to tag **`archive/develop-v1`** before
  `develop` was reset to mirror `main`. Retrieve it via that tag if ever needed.

Practical consequence: PRs are reviewed against this plan and merged to `develop`
freely; only the final `develop → main` merge is the "go live" action.

## What already exists and is reusable (from `feature/fitbit`)

`feature/fitbit` is the superset branch (scaffold → GitHub → Spotify → Fitbit),
built on **stale React 18** and it deletes the agent-setup files — so we salvage
files, not the branch. The genuinely valuable, reusable pieces:

| Asset | File(s) | Reuse verdict |
| --- | --- | --- |
| Spotify data hooks | `src/data/spotify.ts` (`useSpotifyTop`, `useNowPlaying`) | **Reuse as-is** — clean, typed, graceful-degrading |
| GitHub data hook | `src/data/github.ts` (`useGitHubData`) | **Reuse as-is** |
| Fitbit data hook | `src/data/fitbit.ts` | **Reuse as-is** |
| Live now-playing endpoint | `api/now-playing.js` (Vercel fn) | **Reuse as-is** — token refresh server-side, 30s cache |
| Fetch + OAuth scripts | `scripts/fetch-*.mjs`, `scripts/*-auth.mjs` | **Reuse as-is** |
| Bake workflows | `.github/workflows/bake-*.yml` (twice daily) | **Reuse as-is** |
| Baked data | `public/data/{github,spotify-top,fitbit}.json` | **Reuse** (regenerates on schedule) |
| `vercel.json` | routing for `/api` | **Reuse** |
| Old UI (Home/About/Privacy, app.css, Footer) | `src/pages/*`, `src/app.css` | **Do NOT reuse** — rebuilt for V2 |
| Old plan doc | `docs/about-page-plan.md` | Superseded by this doc |

## Gaps between spec and existing data (must address)

1. **GitHub "Currently Building" widget** wants repo name + **last commit message +
   timestamp**. Current `github.ts` shape has `repos[]` (pinned/most-recent) with
   name/description/language/stars but **no last-commit message or pushedAt**.
   → Extend `fetch-github.mjs` GraphQL query + the `GitHubData` type to include a
   `lastActivity: { repo, message, committedAt }` (query `defaultBranchRef →
   target → history(first:1)`).
2. **Projects auto-fetch** (new decision) needs the same fetch to also return the
   **top N most-recently-pushed repos** with per-repo `pushedAt`, `languages` (not
   just primary), and last commit — a superset of the "Currently Building" query.
   → One GraphQL extension covers both gaps 1 and 2. Add a `projects[]` array
   (most-recent, richer shape) to `GitHubData`. Jonny's hand annotations
   (pitch + hardest-challenge) live in `src/content/projects.ts` keyed by repo name
   and merge over the fetched data at render.
3. **Spotify "Current Vibe: [Genre]"** — the bake **dropped the genres field**
   (commit `29a3cc2`). → Re-add top-genre derivation to `fetch-spotify.mjs`
   (aggregate `artists[].genres`, pick modal) and to the `SpotifyTop` type.
4. **Spotify audiobooks (reading section)** — new. → Add `GET /v1/me/audiobooks`
   to `fetch-spotify.mjs` → `public/data/spotify-audiobooks.json`; new
   `useSpotifyAudiobooks()` hook + type. Requires `user-library-read` scope, so
   **re-run `spotify-auth.mjs` with the widened scope and update the refresh-token
   secret** (a one-time manual step; flag to Jonny in Phase 0).
5. **GitHub Language Breakdown bar** — data exists (`languages[]` with counts);
   only a new UI component is needed (percentage progress bar).

## Styling approach note (Tailwind v4, not the spec's v3 instructions)

The spec's directive #1 says "provide `tailwind.config.js` and `index.css`". That's
the **v3** setup. We're on Vite 8 + React 19, so we use **Tailwind v4** (verified
against current docs):
- `npm install tailwindcss @tailwindcss/vite`
- add `tailwindcss()` to `vite.config` plugins
- `@import "tailwindcss";` in the CSS entry
- design tokens via **`@theme { --color-background: …; }`** in CSS — **no
  `tailwind.config.js`**. This actually honours the spec's "managed via CSS
  variables" intent better than v3 did.

Dark mode: `@custom-variant dark` driven by a `class`/`data-theme` on `<html>`,
toggled by the theme context (spec §4A). Default dark.

## Work breakdown (phased, each phase = one PR into `develop`)

Branch naming: `feature/v2-<phase>` off `develop`. Every PR targets **`develop`**
(never `main`), `[ai-assisted]` title, references this plan, `Manually reviewed by
<name>`, human merges once CI (Vercel preview) is green.

### Phase 0 — Salvage backend ✅ DONE (merged to `develop`, PR #27)
Ported the reusable assets from `feature/fitbit` onto `feature/v2-data-layer` off
current `main` (React 19), WITHOUT the old UI:
- `src/data/*.ts`, `api/now-playing.js`, `scripts/*`, `.github/workflows/bake-*.yml`,
  `public/data/*.json`, `vercel.json`.
- Apply all four data-contract fixes here so it's final before UI is built:
  GitHub `lastActivity` + richer `projects[]`; Spotify top-genre; Spotify
  audiobooks bake + `useSpotifyAudiobooks()`.
- **Manual step for Jonny (flagged, not blocking code):** re-run `spotify-auth.mjs`
  with the `user-library-read` scope added and update the `SPOTIFY_REFRESH_TOKEN`
  secret, so the audiobooks bake works. Until then the reading section degrades to
  empty (fine — graceful degradation).
- Verify: `npm run build`, `npm run lint`, and a local invocation of each fetch
  script (or at least schema-check the committed JSON).
- No visual change to the site yet (data layer only; old Home still renders).

### Phase 1 — Foundation: Tailwind + theme + layout (`feature/v2-foundation`)
- Install Tailwind v4 + Framer Motion; wire the Vite plugin.
- Define the dual-mode Yorkshire palette as `@theme` tokens (both modes).
- **Big Light theme context** (§4A): React Context + `localStorage`, default dark,
  Sun/Moon toggle, the `title` easter-egg ("Put the big light on" / "Turn the big
  light off").
- App shell / layout, font, base typography. Route structure (keep `/`, fold in
  `/privacy`; `react-router` already available).
- Verify build/lint + manual dark↔light toggle.

### Phase 2 — Topographic background (`feature/v2-topo-bg`)
- SVG contour background, low opacity, Framer Motion **mouse-spotlight** (glow in
  `--accent-start` within 300px of cursor) + slow diagonal parallax pan.
- `prefers-reduced-motion`: disable pan/spotlight, show static low-opacity lines.
- Perf guard: throttle pointer updates; `pointer: coarse` (touch) gets the static
  fallback (no cursor to follow).

### Phase 3 — Hero + Projects (`feature/v2-hero-projects`)
- Hero (§A): `// Ey up. I'm Jonny.`, animated gradient headline, CTAs, GitHub/LinkedIn
  (URLs now known).
- Projects (§B): reusable project card (title, pitch, stack, live/repo links,
  "Hardest Technical Challenge"). Data auto-fetched from GitHub (`projects[]`);
  pitch + hardest-challenge merged in from `src/content/projects.ts`. Jonny fills
  annotations for whichever repos he wants featured; unannotated repos still render.
- **GitHub "Currently Building" widget** using the new `lastActivity` data.

### Phase 4 — Skills + GitHub languages (`feature/v2-skills`)
- Manual skills grid (Frontend / Backend / Tools-DevOps) — content from Jonny.
- **GitHub Language Breakdown** progress bar above it, from `languages[]`.

### Phase 5 — Spotify section + Reading (`feature/v2-spotify`)
- API health dot (`animate-pulse`, Connected/Offline).
- Live "Currently Playing" bar (`useNowPlaying`), 3 CSS equalizer bars animating
  only when `isPlaying`, 204 fallback `// Currently enjoying the silence.`
- Heavy Rotation: top 3 artists (circular avatars) + `Current Vibe: [Genre]`.
- Two themed Spotify iframe embeds — playlists `37i9dQZF1DX8ml53Dz6izK` and
  `37i9dQZF1DWXXKBeJuKnWE`.
- **Reading section (new):** saved audiobooks from `useSpotifyAudiobooks()` —
  cover, title, author, link. Degrades to hidden if the widened-scope re-auth
  hasn't happened yet.

### Phase 6 — Fitbit extra + Resume/Contact + Footer (`feature/v2-close`)
- Fitbit personality widget (kept as extra; light touch, using `useFitbitData`).
- Resume: "Download Resume" (PDF — Jonny to provide the file), `mailto:` link.
- Footer: "Forged in Yorkshire using React & Vite." Fold `/privacy` back in.

### Phase 7 — Polish (`feature/v2-polish`)
- Responsive pass, accessibility (focus states, contrast in both modes, reduced
  motion audit), Lighthouse, meta/OG tags, final copy pass.

## Cross-cutting requirements (carried from V1, still apply)

- **Secrets stay server-side** — all API tokens in Vercel env / Actions secrets;
  nothing sensitive in the client bundle. (Matches CLAUDE.md invariant.)
- **Graceful degradation** — every data-driven widget renders fine when its JSON /
  endpoint is missing or rate-limited. Hooks already return `null` on failure.
- **Accessibility & reduced motion** on all animation.

## Remaining inputs from Jonny (none block Phases 0–2)

- **Spotify re-auth** (Phase 0 manual step): widen scope to `user-library-read`,
  refresh the secret — enables the reading section. Non-blocking; degrades until done.
- **Project annotations** (Phase 3): pitch + "Hardest Technical Challenge" per
  featured repo, in `src/content/projects.ts`. Repos render without them meanwhile.
- **Skills lists** (Phase 4): Frontend / Backend / Tools-DevOps.
- **Resume PDF** (Phase 6): file + location (`public/`), provided before go-live.

Resolved: projects source (auto-fetch + annotate), reading source (Spotify
audiobooks), playlist IDs, LinkedIn + GitHub URLs.

## Suggested order

0 → 1 → 2 can start now (no content deps). 3–6 layer on content as it arrives;
each already degrades gracefully so partial content never blocks a phase. 7 last.
Each phase is an independent PR reviewed against this plan.
