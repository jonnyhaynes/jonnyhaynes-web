# Plan: ASCII-art topographic background (Canvas 2D)

**Status:** proposed · awaiting human approval
**Ticket:** _create GitHub issue before branching_
**Owner review:** required before merge (repo convention)

## Goal

Replace the contour-line SVG background (`src/components/TopographicBackground.tsx`)
with an **ASCII-art relief** rendered on a **Canvas 2D** element. Keep the current
feel exactly: a low-opacity full-bleed field that **drifts** on a slow diagonal
and reveals an **accent-tinted spotlight** (~300px) that follows the cursor. Same
Sheffield / Dark Peak terrain, now shaded as characters instead of stroked as
contours.

Decision log (for reviewers):
- **Canvas 2D**, chosen over a DOM text grid after a side-by-side demo — DOM janks
  at density and can only spotlight whole rows; Canvas paints thousands of glyphs
  at ~60fps with a precise per-cell spotlight.
- **Re-fetch OS Terrain 50** for the height data (the "start from original data"
  path) — richer than deriving from the existing 40m-band SVG, because every grid
  cell shades a glyph, not just the contour lines.

## Load-bearing constraints (must not regress)

From `CLAUDE.md` + the current component:
- **Graceful degradation** — if the baked height data is missing/unfetchable, the
  page must still render fine (background simply doesn't draw). No throw, no blank
  page.
- **prefers-reduced-motion** — no drift; render a single static frame.
- **Fine-pointer only** — spotlight + pointer listeners only on `(pointer: fine)`;
  touch devices get the static field, no listeners.
- **Theme tinting** — base glyphs key off `--color-muted`, spotlight glyphs off
  `--color-accent-start`; both flip with the light/dark theme (read the CSS custom
  properties at runtime, don't hard-code hex).
- **No new styling framework** — Tailwind utility classes on the wrapper as now;
  canvas drawing is plain JS.
- **Secrets stay server-side** — the OS Downloads API key (if any) lives in the
  local/CI env for the bake step only; never in the client bundle.
- Stays `fixed inset-0 -z-10`, `aria-hidden`, `pointer-events-none`.

## Approach

Two pieces: a **build step** that bakes a compact height grid (mirrors how
`build-topography.mjs` bakes the SVG today — one-time, committed as a static
asset), and the **runtime component** that reads it and draws.

### 1. Data bake — `scripts/build-topography-grid.mjs`

Reuse the proven front half of `scripts/build-topography.mjs` verbatim: the same
`WIN` box, the same `.asc` ESRI-grid parser (`parseAsc`), the same `stitch()` into
one elevation grid. Then instead of marching-squares → contours:

- Downsample the stitched grid to a fixed render resolution — target **~200×160
  cells** (viewBox is 500×400; we don't need per-50m-cell fidelity for a
  background, and this keeps the asset small).
- Normalise elevations to `0..255` across the window's min/max (store min/max too,
  so the client could re-map if wanted).
- Emit `public/topography-grid.json`:
  ```json
  { "cols": 200, "rows": 160, "min": 12, "max": 548,
    "data": "<base64 of a Uint8 cols*rows array>" }
  ```
  Base64 of a byte array keeps it ~32kB (vs the 282kB SVG). Committed to the repo
  exactly like the SVG — **not** wired into the twice-daily cron (terrain doesn't
  change).
- Keep the OS provenance/licence comment (OGL v3, © Crown copyright) in the script
  header and in a sibling `public/topography-grid.LICENCE.txt` (the SVG carried it
  inline; JSON can't, so a sidecar file).
- Document the run command in the script header, same as today:
  `node scripts/build-topography-grid.mjs <dir-of-asc-tiles>`.

**Provenance note:** re-fetching the SK `.asc` tiles from the OS Downloads API is a
manual developer step (needs the free OS API key). The script consumes an already-
extracted tile directory — it does not call the API itself — matching the current
script's contract. Fetching instructions go in the header comment.

### 2. Runtime — rewrite `TopographicBackground.tsx`

Drop `motion` entirely (the drift + spotlight are now done in the draw loop, so we
no longer need `LazyMotion`/springs — smaller bundle). New shape:

- On mount: `fetch('/topography-grid.json')`. On failure or missing → set a
  `ready=false` flag and render nothing drawn (graceful degradation). Decode
  base64 → `Uint8Array` once.
- A `<canvas>` sized to viewport × `devicePixelRatio` (capped at 2), re-sized on a
  debounced `resize`.
- **Draw loop** (`requestAnimationFrame`):
  - Char ramp low→high: `" ·:-=+*#%@"`.
  - Per cell: sample the height grid (with drift offset), map to a ramp glyph,
    fill with `--color-muted` at elevation-scaled opacity.
  - Spotlight: for cells within radius of the spring-smoothed cursor, lerp colour
    toward `--color-accent-start` and boost opacity — same 300px feel as now. Keep
    a small spring/lerp on the cursor position so it trails pleasantly (cheap, in
    JS — no motion lib).
  - Drift: slow diagonal offset added to the sample coords, `t`-based.
- **Reduced motion:** skip the rAF loop; draw one static frame (and redraw on
  resize / theme change only).
- **Fine-pointer gating:** identical `matchMedia('(pointer: fine)')` logic; only
  attach `pointermove` and enable the spotlight when fine + motion allowed.
- **Theme tint:** read `getComputedStyle(el).getPropertyValue('--color-muted')` /
  `--color-accent-start` at draw time (or on a `MutationObserver`/theme-change
  hook) so the light-theme flip is honoured. Confirm how the theme toggle signals
  a change (class on `<html>`?) and re-read on that.

No change to `App.tsx` — same component name, same mount point, same props (none).

## Files

| File | Change |
|---|---|
| `scripts/build-topography-grid.mjs` | **new** — bake height-grid JSON from `.asc` tiles |
| `public/topography-grid.json` | **new** — baked asset (~42kB). **Ships as a labelled placeholder** (`"placeholder": true`) until the real OS bake is run |
| `public/topography-grid.LICENCE.txt` | **new** — OGL v3 / Crown copyright sidecar. **Written by the real bake**, not the placeholder (placeholder isn't OS data) |
| `src/components/TopographicBackground.tsx` | **rewrite** — Canvas 2D ASCII renderer |
| `public/topography-south-yorkshire.svg` | **kept for now** — deleting it would downgrade to invented terrain until the real bake lands. Removed in the real-bake follow-up |
| `scripts/build-topography.mjs` | **keep** for reference; delete in the real-bake follow-up |
| `package.json` | no new deps (`sharp` unused here; plain fs parse) |

### Follow-up (separate PR): run the real bake

This PR ships the renderer against a **procedural placeholder** so it can be
reviewed independently. A follow-up runs `build-topography-grid.mjs` against real
OS Terrain 50 SK tiles, replaces the placeholder JSON, writes the LICENCE sidecar,
and deletes the old SVG + `build-topography.mjs`. Owner supplies/points at the
extracted `.asc` tile directory.

**Note:** `motion` is now unused anywhere in the codebase (this was its only
consumer). Removing the dependency is a tidy bundle win but is left as its own
change to keep this PR scoped.

## Verification

- `npm run build` (tsc + vite) green; `npm run lint` clean.
- Dark **and** light theme: glyphs tint correctly, spotlight is accent-coloured.
- Reduced-motion (OS setting): static field, no drift, no rAF churn.
- Touch / coarse pointer: static field, no pointer listeners attached.
- Rename `topography-grid.json` away → page still renders (graceful degradation).
- Eyeball perf: full-viewport draw stays ~60fps on the dev machine; check the tab
  isn't pinned at high CPU when idle (drift loop is the only continuous cost —
  consider pausing rAF when the tab is hidden via `visibilitychange`).
- Compare against the demo's Canvas panel for the intended look/feel.

## Open questions for the reviewer

1. **Render resolution** — 200×160 is a starting guess. Denser = finer relief but
   more per-frame work. Tune during build.
2. **Idle cost** — the drift loop runs continuously. Acceptable, or should drift be
   very slow / pause when the tab is backgrounded? (Plan assumes: pause on hidden.)
3. **Keep the old SVG script?** Plan deletes the `.svg` asset but keeps
   `build-topography.mjs` one release for reference. OK to delete both now?

## Out of scope

- No change to any data-driven section, the cron bake, or routing.
- No new npm dependencies.
- Not touching the OS fetch/auth flow beyond documenting it in the script header.
