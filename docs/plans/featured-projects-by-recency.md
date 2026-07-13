# Featured projects: auto-select by recency + fix bake log bug

**Status:** Implemented — awaiting review (issue #52)
**Type:** `[ai-assisted]`
**Related:** `src/components/Projects.tsx`, `src/data/github.ts`,
`scripts/fetch-github.mjs`, `src/content/projects.ts` (deleted)

## Problem

Two issues in the Projects section:

1. **Silent-vanish featured list.** `Projects.tsx` rendered a hand-curated
   `FEATURED_ORDER` array (`skillswap`, `freestyle-libre-mcp-server`,
   `sitwellcc-web`) filtered against the baked GitHub data. The bake only writes
   the 6 most-recently-pushed repos, so if a featured repo dropped out of that
   top-6 its card silently disappeared — leaving two cards, or one, with nothing
   back-filling it.
2. **Bake log bug.** `scripts/fetch-github.mjs` logged `payload.repos.length` at
   the end of `main()`, but the payload has no `repos` key (it's `projects`), so
   the bake threw a `TypeError` on its final line.

## What changed

- **`Projects.tsx`** no longer reads `FEATURED_ORDER`. It calls a new
  `featuredProjects(data)` helper and renders whatever that returns. Empty-state
  ("Projects are loading…") behaviour is unchanged.
- **`src/data/github.ts`** gains `featuredProjects(data, limit = 3)`: takes the
  most-recently-pushed repos (baked data is already `pushedAt`-desc), excludes
  the portfolio itself, slices to `limit`. Returns `[]` when data is absent so
  the section still degrades gracefully.
- The `jonnyhaynes-web` exclusion set (`CURRENTLY_BUILDING_EXCLUDE`) was renamed
  to exported `SELF_EXCLUDE` and is now shared by both `featuredProjects` and
  `currentlyBuilding`, rather than each defining its own.
- **`scripts/fetch-github.mjs`** completion log now references
  `payload.projects.length`.
- **`src/content/projects.ts`** deleted — `FEATURED_ORDER` had no other
  importers.

## Behaviour

Against current baked data the grid now shows: `sitwellcc-web`, `skillswap`,
`apollo-events-bridge`. The three track latest work automatically as repos are
pushed — no hand-editing, no silent-vanish.

## Notes / follow-ups

- Per-repo **pitch / challenge** still come from each repo's own
  `.portfolio.json` (read during the bake). Repos without one fall back to the
  GitHub "About" for the pitch and show no challenge — existing graceful
  behaviour, not a regression. A newly-surfaced recent repo won't have curated
  copy until a `.portfolio.json` is added to it.
- The bake still only writes the top 6 projects, which comfortably covers a
  top-3 grid. No change needed there.

## Verification

- `npm run build` (tsc + vite) — green.
- `npm run lint` — green.
