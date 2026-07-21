# Plan: Now Playing switcher — live mini-screen previews

## Context

The visualizer switcher (`NowPlaying.tsx`) is a 3-segment control. Each button
currently shows a small centred 16×16 SVG glyph (`VisualizerIcon` in
`visualizers.tsx`) that hand-approximates its visualizer and animates via CSS
(`.viz-icon.*` in `index.css`) only when selected.

Owner ask: the button animation should **fill the button** and **resemble the
playing screen** — i.e. each button should be a true live miniature of the actual
canvas visualizer, not an SVG approximation.

Decisions taken (with owner):
- **Live mini-canvas previews.** Reuse the real `Visualizer` canvas per button.
- **Animate only while a track is playing**, settle to a still frame when stopped
  — mirrors the main screen's ease-to-rest (`spinning` / `useCanvas` envelope).
- Under `prefers-reduced-motion`: still frame (already handled by `useCanvas`).

## Goal

Each switcher button renders a full-bleed live miniature of its visualizer
(spectrum / scope / plasma), reading as a tiny copy of the main screen, while
keeping the control accessible (labels, `aria-pressed`, AA) and reduced-motion-safe.

## Constraints (from CLAUDE.md)

- **Honest, non-audio motion.** The mini previews are the *same* tempo/energy-
  driven canvases as the screen — no new motion source. Gated on `playing` so they
  don't animate an idle card. Three RAF loops is the cost; acceptable because they
  pause when stopped and freeze under reduced motion (they only run while the main
  screen is already running one).
- **Graceful degradation / no new framework.** Reuse `Visualizer`; plain CSS +
  Tailwind. No new deps.
- **Accessibility.** Keep the `role="group"`, per-button `aria-pressed`, `title`,
  and `sr-only` full label. Canvases are decorative (`aria-hidden`, already set).
  Preserve #116's AA: active button = solid accent fill + `text-background`.

## Key problem to solve — accent-on-accent on the active button

The active button has a solid `bg-accent-start` fill (from #116). The visualizer
draws in `--color-accent-start`, so an active mini-preview would be accent bars on
an accent fill → invisible, and would also undo the clear "selected" indicator.

**Resolution:** the active segment does NOT show a live mini-canvas. Instead:
- **Inactive buttons** → full-bleed live mini-canvas (the preview), on a small
  recessed dark "mini-screen" so the accent visualizer is legible (mirrors the LCD
  screen tokens: `--color-lcd-screen-*`, faint scanline).
- **Active button** → keeps the solid accent fill + inverted glyph/label as-is
  (the state indicator). It doesn't need to "preview" — it's the current screen.

This keeps AA intact, keeps a strong selected state, and still makes the *choice*
previews live miniatures of the screen. (If the owner prefers the active one to
also be a mini-screen, we'd drop the solid fill and re-solve AA — flagged as an
alternative, not the default.)

## Approach

1. **Mini-screen wrapper.** Give each button an inner element sized to fill it
   (`absolute inset-0` inside a `relative` button, or the button becomes the
   screen) with the LCD screen background tokens + faint scanline, `rounded`, and
   `overflow-hidden`. Aspect handled by the button box (make buttons a touch
   taller so the preview has room — check the grid still looks right).
2. **Render `Visualizer`** (`kind={v.kind}`) filling the inactive buttons, driven
   by the same `spinning`/`tempo`/`energy` the `Deck` already has → thread those
   into the switcher (they're already in `DeckProps`).
3. **Active button** keeps the current solid-fill + `VisualizerIcon` treatment
   (or a static label), unchanged from #116.
4. **Hover/focus** states preserved; `focus-visible` outline still on the button.
5. Retire the now-unused animated SVG paths only if nothing else uses them
   (`VisualizerIcon` may still render the active glyph — keep it for that).

## Verification

- Screenshot the switcher in both themes, playing + stopped + reduced-motion:
  inactive buttons show legible live miniatures on a mini-screen; active button
  is a clear solid accent chip; grid alignment intact.
- Confirm previews **animate only while playing** and settle when stopped.
- Re-run the #116 contrast checks — active label/glyph still ≥ 4.5:1; inactive
  mini-canvas is decorative (UI, not text) but the button must still be
  identifiable (label via tooltip/sr-only).
- Perf sanity: three extra canvases at ~28–40px; confirm RAF loops pause when
  stopped (they should, via `useCanvas` `active`).
- `npm run build` + `npm run lint` green.

## Out of scope

- Changing the visualizer algorithms or the honest-non-audio principle.
- The main screen, panel, or LCD readout (unchanged from #112/#114/#116).

## Rollout

Branch off `main`, `[ai-assisted]` PR referencing this plan, `Closes #117`,
human review against before/after screenshots, human merges. Tracking issue: #117.
