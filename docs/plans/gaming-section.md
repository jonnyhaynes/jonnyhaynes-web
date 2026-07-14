# Gaming section: "recently played" from Steam + Xbox

**Status:** Implemented — awaiting review (approved 2026-07-14)
**Type:** `[ai-assisted]`
**Scope:** Minimal — recently-played tiles only (cover, title, platform, last-played).
No playtime, achievements or library stats (per CLAUDE.md scope boundary: these
sections are "personality, not a dashboard").
**Related (to be created):** `scripts/fetch-gaming.mjs`,
`.github/workflows/bake-gaming-data.yml`, `src/data/gaming.ts`,
`src/components/Gaming.tsx`, `public/data/gaming.json`

## Goal

Add a "recently played" games section that mirrors the existing GitHub/Spotify
data-baking pattern: secrets stay server-side, a scheduled job bakes a static
JSON file, and the React section degrades to hidden when data is absent.

## Sources & the honest trade-offs

### Steam — official, clean
- Endpoint: `GET IPlayerService/GetRecentlyPlayedGames/` (games played in the
  last ~2 weeks). Verified against current Steam Web API docs.
- Secrets: `STEAM_API_KEY` (free, from steamcommunity.com/dev/apikey) +
  `STEAM_ID` (your 64-bit SteamID — not secret, but kept in config/secrets for
  tidiness).
- **Your action required:** Steam profile privacy *and* "Game details" must be
  **Public**, or the endpoint returns an empty list even with a valid key.
- Cover art: derived from each game's `appid` via Steam's CDN
  (`.../steam/apps/{appid}/header.jpg`) — no extra API calls.
- **Limitation:** the recently-played endpoint exposes **no per-game last-played
  timestamp** — only `playtime_2weeks`. So for Steam games "last played" is
  unknown; they'll be ordered by recent playtime instead (see Merge, below).

### Xbox — works, but adds a third-party dependency
- No official personal "recently played" API. Realistic route: **OpenXBL
  (xbl.io)** — sign in with your Microsoft account, get an API key.
- Endpoint: `GET /api/v2/player/titleHistory` — recently played titles *with*
  last-played timestamps.
- Secret: `XBL_API_KEY`.
- **Trade-offs (flagged against the "graceful degradation / keep it light"
  principle):** a third party holds an Xbox Live token; free tier is
  rate-limited (~150 req/hr — fine for a twice-daily bake); it can go down. The
  bake must treat an Xbox failure as "no Xbox games this run", never as a hard
  error.

## Baked shape

`public/data/gaming.json`:

```jsonc
{
  "fetchedAt": "2026-07-14T09:00:00.000Z",
  "games": [
    {
      "title": "Hades II",
      "platform": "steam",              // 'steam' | 'xbox'
      "coverUrl": "https://.../header.jpg",
      "lastPlayed": null,               // ISO string | null (Steam: null)
      "url": "https://store.steampowered.com/app/1145350"
    },
    {
      "title": "Forza Horizon 5",
      "platform": "xbox",
      "coverUrl": "https://.../image.png",
      "lastPlayed": "2026-07-13T21:40:00.000Z",
      "url": null
    }
  ]
}
```

## Merge / ordering

Steam has playtime-but-no-timestamp; Xbox has timestamp-but-we-ignore-playtime.
There's no single clean sort key across both. Plan:

- Xbox games sort by `lastPlayed` desc (real timestamps).
- Steam games sort by `playtime_2weeks` desc (proxy for "recently active").
- Interleave: **Xbox games with a real `lastPlayed` first (newest first), then
  Steam games by recent playtime.** Cap the combined list at ~6 tiles.
- This is a deliberate, documented approximation — not a precise unified
  timeline. Called out here so a reviewer knows it's intentional.

## Files & pattern (mirrors Spotify bake)

1. **`scripts/fetch-gaming.mjs`**
   - Reads env: `STEAM_API_KEY`, `STEAM_ID`, `XBL_API_KEY`.
   - `fetchSteam()` and `fetchXbox()` each wrapped in try/catch: a thrown error
     logs a warning and returns `[]` so one source failing never fails the bake
     (matches the Spotify audiobooks-403 precedent).
   - If **both** sources return empty, still write a valid file with
     `games: []` so the section degrades to hidden rather than the fetch 404ing.
   - Normalise → merge → `writeFile('public/data/gaming.json', …)`.

2. **`.github/workflows/bake-gaming-data.yml`**
   - Copy of `bake-spotify-data.yml`.
   - Schedule: `cron: '0 9,21 * * *'` (09:00/21:00 UTC — a free slot; GitHub is
     06/18, Spotify 07/19, Fitbit 08/20).
   - Data-PR pattern: push to `bake/gaming-data`, open auto-merging PR to `main`.
   - Env passes the three secrets above.

3. **`src/data/gaming.ts`**
   - `GameTile` + `GamingData` types.
   - `useGamingData(): GamingData | null` — same fetch-and-degrade shape as
     `useGitHubData` (returns null while loading / on failure).
   - Optional `recentGames(data, limit = 6)` helper returning `[]` when absent.

4. **`src/components/Gaming.tsx`**
   - `const data = useGamingData(); if (!data || !data.games.length) return null;`
   - Renders a tile grid (cover, title, platform badge, relative last-played for
     Xbox / "recently" for Steam). Reuses existing card/grid CSS conventions in
     `src/app.css` — no new styling framework.
   - Respects `prefers-reduced-motion` for any hover/entrance animation.

5. **Wire into the page** — add `<Gaming />` to the About/home composition
   alongside the other activity sections (exact placement TBD with you).

## Secrets to add (you obtain these; they never go to the model)

| Secret | Where to get it |
|--------|-----------------|
| `STEAM_API_KEY` | steamcommunity.com/dev/apikey |
| `STEAM_ID` | your 64-bit SteamID (steamid.io) |
| `XBL_API_KEY` | xbl.io — sign in with Microsoft account |

Added to **GitHub Actions repository secrets**. No secret reaches the client
bundle; the baked JSON is public static data only.

## Implementation notes

- **Styling:** CLAUDE.md describes "plain CSS in `src/app.css`", but the actual
  V2 components (`Reading.tsx` etc.) use **Tailwind v4** utilities. `Gaming.tsx`
  matches the real code (Tailwind, mirroring the reading grid), not the stale
  doc. Worth updating CLAUDE.md separately.
- Grid is 2-up mobile / 3-up md so six tiles form a clean 2×3 / 3×2.
- Placed after `<Reading />` in `src/pages/Home.tsx`.
- A placeholder `public/data/gaming.json` (`games: []`) ships so the fetch
  degrades cleanly (section hidden) until the first real bake runs.

## Verification

- `npm run build` (tsc + vite) — green.
- `npm run lint` — green.
- Runtime bake untested until the three secrets are added and the workflow runs
  (or `node scripts/fetch-gaming.mjs` is run locally with env vars).
- Manual: run `node scripts/fetch-gaming.mjs` locally with the three env vars,
  confirm `public/data/gaming.json` is well-formed and the section renders;
  confirm the section hides when the file is missing/empty.

## Open questions for approval

1. **Xbox third-party dependency (OpenXBL): OK to proceed?** It's the only
   realistic route for personal Xbox data and cuts slightly against "keep it
   light". If not, we ship Steam-only and drop the Xbox half cleanly.
2. **Placement** of the section on the page.
3. **Tile count** — proposing 6 to match the Projects grid density.

## Follow-ups / notes

- If OpenXBL proves flaky in practice, the section still works Steam-only (Xbox
  half just yields `[]`).
- No test runner in repo; `build` + `lint` are the checks, per CLAUDE.md.
