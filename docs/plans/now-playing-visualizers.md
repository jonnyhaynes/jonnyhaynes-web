# Plan: Winamp-style visualizers for the Now Playing card

## Context / pivot

This supersedes [`tape-deck-now-playing.md`](./tape-deck-now-playing.md). That
plan built two cassette/tape-deck variants (Cassette / Deck) behind an A/B
toggle. In review the **Deck** variant won, but the spinning-reel cassette
metaphor was then dropped in favour of a **Winamp-style visualizer** as the
hero of the card. The deck's brushed-metal panel + LCD chrome are kept; the
cassette window and reels are gone.

## Goal

Make the Now Playing card's centrepiece a **switchable audio visualizer** in the
Winamp idiom, drawn in the site's own palette (heather accent, not literal
Winamp green), working in light and dark, accessible and reduced-motion-safe.

Three modes, switchable by the visitor and **persisted** like the site theme:

- **Spectrum bars** — vertical bars with peak-caps.
- **Oscilloscope** — a single glowing waveform.
- **Plasma** — a morphing colour field (MilkDrop-ish).

## Constraints (from CLAUDE.md)

- **Honest, non-audio motion.** The browser never receives Spotify's audio
  stream, so nothing reacts to real sound. Every visualizer is parametrised by
  the track's `tempo` (speed) and `energy` (amplitude) from the audio-features
  lookup, with sensible fallbacks — same principle as the equaliser it replaces.
- **Graceful degradation.** Renders fine with no track / no art / API offline
  (the "enjoying the silence" idle card is retained).
- **No new styling framework.** Plain CSS in `src/index.css` + Tailwind
  utilities; canvas for the generative graphics.
- **Accessibility & reduced motion.** Canvases are `aria-hidden` (decorative);
  the `aria-live` state announcement and progressbar semantics are kept. Under
  `prefers-reduced-motion` the visualizers paint a single static frame, the
  marquee holds still, and the LED stops pulsing.

## Approach

### Visualizers (`src/components/visualizers.tsx`)

- A shared `useCanvas(active, tempo, energy, draw)` driver: sizes the canvas at
  device resolution, reads the live `--color-accent-*` tokens each frame (so the
  graphics track the theme), and runs a RAF loop.
- Three `draw` functions (spectrum / scope / plasma), each drawing with
  transparency so the album art shows through behind them.
- **Motion envelope** — a single eased value (`0` = full motion … `1` = at rest)
  that eases toward its target at `EASE_MS` (3.5s), the *same rate in both
  directions*. On play the graphics swell up; on stop they decelerate + shrink to
  rest (bars sink, wave flatlines, plasma fades). The animation clock is slowed
  by the envelope so motion genuinely accelerates in / decelerates out rather
  than snapping.
- `VisualizerIcon` — inline SVG glyph per mode for the switcher; the active one
  animates (bars bounce, wave scrolls, plasma pulses) to preview its effect.
- Mode metadata (`VISUALIZERS`, `VisualizerKind`) lives in a sibling
  `visualizers-meta.ts` so `visualizers.tsx` only exports components (keeps React
  Fast Refresh happy).

### Card (`src/components/NowPlaying.tsx`)

- `useVisualizer()` — the chosen mode, persisted to `localStorage`
  (`now-playing-visualizer`), mirroring the theme toggle's persist-on-choice
  semantics.
- Layout (top → bottom): header strip (playing/last-played label + pulsing power
  LED) → **square** visualizer screen (album art behind, dimmed under a scrim,
  visualizer over) → accent marquee readout of the track → progress bar →
  icon-only segmented switcher.
- The power LED reuses the Gaming bezel's glowing-dot look and pulses while
  playing, winding down when stopped. The progress bar drains to empty over the
  ease duration when the track stops, so the whole card comes to rest together.

### Shared LED (`src/index.css`, `src/components/Gaming.tsx`)

- The pulsing power-LED style (`.deck-led`) is shared: the Gaming section's
  "Now playing" bezel dot pulses identically.

## Files touched

- `src/components/visualizers.tsx` — new: canvas visualizers + driver + icons.
- `src/components/visualizers-meta.ts` — new: mode metadata + type.
- `src/components/NowPlaying.tsx` — rebuilt around the visualizer; removed the
  cassette/reels, the A/B toggle, the old CSS equaliser, and the time readouts.
- `src/index.css` — visualizer screen (LCD), marquee, LED pulse/wind-down, icon
  animations; removed the reel/cassette + old equaliser CSS.
- `src/components/Listening.tsx` — dropped the now-stale top-padding nudge.
- `src/components/Gaming.tsx` — share the pulsing LED class.

## Out of scope

- No changes to data fetching, polling cadence, or the baked JSON shape.
- No audio. Motion stays "honest, non-audio".

## Addendum: visualizer engineering + data-honesty tightening (2026-07-21)

A post-implementation pass tightened the visualizer:

- **Derived per-track params.** Spotify's audio-features endpoint is restricted
  for apps registered after Nov 2024, so the card was falling back to fixed
  defaults (116 BPM / 0.62) and every track looked identical. The API now
  exposes `popularity`, and the client uses a deterministic per-track derivation
  when audio-features is unavailable: a djb2 hash of the track id picks a
  plausible tempo (80–170 BPM), and `popularity` stands in for energy. This is
  still honest, non-audio motion — each track has a stable, distinct rhythm.
- **Performance.** The canvas size is no longer measured per frame; a
  `ResizeObserver` updates a cached size. Accent colours are read once per frame
  and re-invalidated only when `<html data-theme>` changes. The spectrum bars
  share one full-height gradient per frame instead of 28 separate gradients.
- **Robustness.** `toRgb` was hex-only and would break if tokens became modern
  colour syntax; it now normalises any CSS colour via a canvas `fillStyle`
  round-trip. The knob drag had a stale-state bug where fast multi-step drags
  silently repeated the same adjacent mode; the current index is now tracked in
  a ref and updated synchronously. `prefers-reduced-motion` is observed live
  via `useSyncExternalStore`, so toggling the OS setting updates the visualizer
  without waiting for a track change.
- **Dead code removal.** The `staticFrame` prop (a leftover from a dropped
  chip-preview switcher design) was plumbed through all three components but
  never used. It, and its stale comments, have been removed.
- **Polish.** The marquee readout only scrolls when the text actually overflows.
  The `localStorage` read is try/catch'd. The `aria-live` announcement drops the
  non-null assertions.

## Verification

- `npm run build` (tsc + vite) and `npm run lint` clean.
- Manual via `vercel dev` with a real track: play → visualizer runs; track end →
  eases to rest; idle / API-offline → idle card. Switch modes (persists across
  reload). Toggle light/dark — graphics follow the accent.
- `prefers-reduced-motion` — visualizers static, marquee still, LED steady.

> Local dev note: plain `npm run dev` is Vite-only and does **not** run
> `api/now-playing.js`, so the card shows the idle state. Use `vercel dev` (after
> `vercel env pull .env.local`) to exercise it against real Spotify. No mock is
> committed to the app.
