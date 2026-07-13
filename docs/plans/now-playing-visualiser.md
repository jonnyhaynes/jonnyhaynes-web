# Now Playing visualiser + "What I listen to" two-column layout

**Status:** Draft — awaiting human approval (plan-first per CLAUDE.md)
**Type:** `[ai-assisted]`
**Related:** `src/components/NowPlaying.tsx`, `src/components/Listening.tsx`, `api/now-playing.js`, `src/data/spotify.ts`, `src/index.css`

## Goal

Enrich the live "Now Playing" card into a small ambient **visualiser**, and rejig
the "What I listen to" section into two columns on desktop:

- **Left column:** the Now Playing visualiser.
- **Right column:** Heavy Rotation + Coding Fuel (stacked).

Single column on mobile (visualiser first), unchanged.

## What the Spotify API gives us (verified against current docs)

From the **existing** `currently-playing` call — free, no extra request:

- `progress_ms` (response root) + `item.duration_ms` → **live progress bar**.
- `item.album.images` → dominant-colour extraction for an **art colour glow**.

From **one extra call** — `GET /v1/audio-features/{id}`:

- `tempo` (BPM) → equalizer bounce speed.
- `energy` / `valence` / `danceability` → **audio-features meters**.

> **Risk flagged:** Spotify restricted `audio-features` for apps registered after
> Nov 2024. This app pre-dates that, so it *should* still have access — but the
> feature is built defensively: on any non-200 from `audio-features`, those fields
> return `null` and every dependent visual degrades (equalizer falls back to its
> current fixed 0.9s speed; meters section is omitted). Nothing breaks.

## Design decisions (flagged)

- **CLAUDE.md doc drift:** CLAUDE.md says "plain CSS in `src/app.css`", but the repo
  actually uses **Tailwind utilities + keyframes in `src/index.css`**. I'll match the
  real code. Suggest updating CLAUDE.md's Stack section separately — out of scope here.
- **Scope boundary ("personality, not a dashboard"):** the audio-features *panel* is
  the most dashboard-y ask. Kept deliberately light — three slim labelled meters
  (energy / positivity / danceability), no numbers-heavy readout, no historical data.
- **No real audio FFT is possible** (server-polled, no Web Playback stream). The
  visualiser is data-*honest* (driven by real track metadata) but not reactive to
  live audio. Documented so nobody expects a waveform.

## Changes

### 1. `api/now-playing.js`

- Extend `trackShape` to also return: `progressMs`, `durationMs`, `trackId`.
- After resolving the playing/recent track, make a **best-effort** `audio-features`
  call for `trackId`. On success attach `{ tempo, energy, valence, danceability }`;
  on any failure attach `null` for each (never throw). Only fetch for the *playing*
  track (skip for recently-played — progress/tempo are meaningless when paused).
- Keep the existing 30s cache header.

### 2. `src/data/spotify.ts`

- Extend the `NowPlaying` type with the new optional fields
  (`progressMs?`, `durationMs?`, `trackId?`, `tempo?`, `energy?`, `valence?`,
  `danceability?` — all nullable/optional to preserve graceful degradation).
- `useNowPlaying` unchanged in shape. Consumers derive a **client-side ticking
  position**: store the poll's `progressMs` + a timestamp, and interpolate with
  `requestAnimationFrame`/`setInterval(1s)` between polls so the bar advances
  smoothly without hammering the API. Reset on each new poll / track change.

### 3. `src/components/NowPlaying.tsx` — square full-bleed card (revised)

**Revised direction (v2):** the card is a **square** with the album art filling its
full width. Everything else is overlaid on the art — no separate meta row, no
side-by-side thumbnail. The feature meters are **dropped**.

- **Square art, full-bleed:** `aspect-square`, art `object-cover` filling the card,
  `overflow-hidden` + `rounded-lg`. This is the whole card body.
- **Gradient scrim:** a dark bottom-up gradient (transparent → dark) over the lower
  ~45% of the art, so overlaid text and bars stay legible on *any* cover.
- **Visualiser bars in the scrim:** a row of ~12 equalizer bars anchored to the
  bottom edge, rising over the art within the scrim. Bounce **speed** driven by real
  `tempo` (via `--eq-duration`); a per-bar height loop supplies the (honest, non-audio)
  motion. `energy` optionally scales overall bar amplitude. Fallback: fixed speed.
- **Title / artist:** overlaid in the scrim above the bars, white text with the
  existing link/hover behaviour. `Now playing` / `Last played` label retained.
- **Progress bar:** a thin line pinned to the **very bottom edge** of the card,
  width = `position / durationMs`. Only when playing with both values present.
- **Colour glow:** dominant colour from `albumArt` (canvas sampler, no dependency)
  kept as a soft glow *behind* the card (`box-shadow`), accent fallback.
- **Fallback / not-playing:** when there's no art or nothing has ever played, show
  the existing `// Currently enjoying the silence.` state (no square art). When
  showing `Last played`, render the art statically with no bars/progress.
- **Removed:** the `FeatureMeters` component and all energy/positivity/dance UI.
  (Audio-features `tempo`/`energy` still fetched and used to drive the bars.)

### 4. `src/components/Listening.tsx`

- Wrap content in a responsive grid: `lg:grid-cols-2` (single col below `lg`).
  Left cell = `<NowPlaying />`; right cell = `<HeavyRotation />` + `<CodingFuel />`
  stacked with existing gap. Mobile order: NowPlaying first (matches current).
- `CodingFuel`'s inner `sm:grid-cols-2` may need to drop to single-col inside the
  narrower right column — verify visually and adjust breakpoint.

### 5. `src/index.css`

- Parameterise `.is-playing .eq-bar` animation to read `var(--eq-duration, 0.9s)`.
- Add progress-bar + meter styles if not expressible purely in Tailwind.
- Keep all existing `prefers-reduced-motion` guards; add them for any new motion
  (progress bar tick is fine; glow pulse — if any — must be gated).

## Out of scope

- Changing the baking job / `spotify-top.json` (this is all live now-playing).
- Re-auth / scope changes (audio-features needs no new scope on an existing token).
- Updating CLAUDE.md's stale "plain CSS" line (flag separately).

## Verification

- `npm run build` (tsc + vite) and `npm run lint` green.
- Manual: play a track → progress bar advances, glow matches art, eq speed tracks
  tempo, meters render. Pause → falls back to "Last played" with no progress/meters.
- Force `audio-features` failure (temporarily) → confirm graceful fallback.
- Mobile + desktop layouts; `prefers-reduced-motion` disables animation.

## Acceptance criteria

1. Two-column layout on `lg+`, single column below, visualiser first on mobile.
2. Live progress bar advancing smoothly between 60s polls.
3. Album-art colour glow with accent fallback.
4. Equalizer speed reflects tempo, clamped, with reduced-motion + null fallbacks.
5. Light energy/positivity/danceability meters, omitted when data absent.
6. Section renders cleanly when any/all live data is missing (graceful degradation).
