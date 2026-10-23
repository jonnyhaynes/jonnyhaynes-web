# jonnyhaynes.com

Jonny Haynes's personal site. The home page is **"The Desk"**: a one-screen
design-tool canvas with a grid-paper background, a big "Jonny." headline and a
scatter of draggable, resizable, rotatable objects — a turntable, laptop, name
badge, Steam Deck, watch, books and a portrait. Work and My Journey open richer
windows; several objects pull in live data (Spotify, Steam/Xbox, Garmin,
weather).

Built with **React 19 + Vite 8 + TypeScript**, styled with **Tailwind v4** tokens
plus hand-written CSS, routed with **react-router**, and deployed on **Vercel**.

## Getting started

Node 22 (see `.nvmrc`):

```bash
nvm use
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The page hot-reloads as you
edit.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc` type-check, then `vite build` → `dist/` |
| `npm run lint` | ESLint (flat config, `eslint.config.js`) |
| `npm run preview` | Serve the production build locally |

There's no test runner or Prettier config — `build` and `lint` are the checks.

## Project structure

```
src/
  desk/          The home-page canvas: Desk, Objects, Windows, drag/resize,
                 watch, content.ts (all hand-authored copy), desk.css
  pages/         Home (renders <Desk />) and Privacy (direct-link fallback)
  data/          Typed loaders for the baked JSON snapshots (health, gaming,
                 spotify) — all degrade to null/hidden on failure
  theme/         Light/dark theme context (useTheme)
  lib/           Small hooks (document title, reduced motion)
  index.css      Tailwind import + global tokens/themes
api/
  now-playing.js Vercel serverless function for the live turntable
scripts/         Node data-baking jobs + one-time auth helpers
public/data/     Baked JSON snapshots (health, gaming, spotify-audiobooks)
docs/            Source of truth for design, process and plans (see below)
```

Routes are just `/` (the desk) and `/privacy`; `vercel.json` rewrites everything
else to `index.html`. The CV download is `public/jonnyhaynes-cv.pdf`, with
`/resume.pdf` permanently redirected there.

## Live data

Nothing sensitive ever reaches the client bundle. Values are either baked to
static JSON by scheduled GitHub Actions or fetched through the one serverless
function:

| Data | Source | How it updates |
|---|---|---|
| Steps, calories, resting HR, weather, sun times | Garmin Connect + Open-Meteo | `.github/workflows/bake-health-data.yml`, every 4 hours → `public/data/health.json` |
| Recently played games | Steam + Xbox (OpenXBL) | `bake-gaming-data.yml`, every 3 days → `public/data/gaming.json` |
| Saved audiobooks | Spotify | `bake-spotify-audiobooks.yml`, every 3 days → `public/data/spotify-audiobooks.json` |
| Now playing / last played | Spotify | `/api/now-playing` at request time (10s edge cache) |

The bake workflows commit via an auto-merging PR to `main`. Every consumer
treats missing or stale data as absent rather than an error, so an API outage
never breaks the page. `now-playing.js` returns `{ isPlaying: false }` on any
failure for the same reason.

### Running the bakes locally

Each script writes into `public/data/` and needs its own secrets:

```bash
# Health + weather
GARMIN_TOKEN_BUNDLE='{"oauth1":{...},"oauth2":{...}}' node scripts/fetch-health.mjs

# Games
STEAM_API_KEY=xxx STEAM_ID=yyy XBL_API_KEY=zzz node scripts/fetch-gaming.mjs

# Audiobooks and the now-playing function
SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy SPOTIFY_REFRESH_TOKEN=zzz \
  node scripts/fetch-spotify-audiobooks.mjs
```

`scripts/garmin-auth.mjs` and `scripts/spotify-auth.mjs` are one-time local
helpers for capturing those tokens. Never commit them or put them in the repo.

## Deploy

Import the repo into [Vercel](https://vercel.com/new) — it auto-detects Vite
(`npm run build` → `dist`). `vercel.json` adds the SPA rewrite, the CV redirect,
and security headers (HSTS, frame denial, restrictive permissions policy). The
Spotify credentials for `/api/now-playing` live in Vercel environment variables;
the bake jobs read theirs from GitHub Actions secrets.

## Docs and conventions

Read these before a non-trivial change:

- `CLAUDE.md` — repo orientation, load-bearing principles, scope boundaries
- `docs/dev-workflow.md` — the plan-first loop and standing conventions
- `docs/plans/` — per-ticket implementation plans
- `docs/jonnyhaynes-site-handover/HANDOVER.md` — the full desk specification

Plan first, keep secrets server-side, and leave `build` + `lint` green.
