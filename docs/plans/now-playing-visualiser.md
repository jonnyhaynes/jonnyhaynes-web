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

### 3. `src/components/NowPlaying.tsx`

- **Progress bar:** thin bar under the track meta; width = `position / durationMs`.
  Show `m:ss / m:ss`. Only when playing and both values present.
- **Colour glow:** extract dominant colour from `albumArt` client-side (small
  canvas average or a tiny sampler — no new dependency) and apply as a soft
  `box-shadow`/radial background behind the card. Fallback: existing `accent-start`.
- **Tempo-driven equalizer:** pass `tempo` to `<Equalizer>`; map BPM → animation
  duration via CSS custom property (`--eq-duration`) instead of the fixed 0.9s.
  Clamp to a sane range (e.g. 0.4s–1.2s). Fallback to 0.9s when tempo is null.
- **Audio-features meters:** three slim bars (energy / positivity / danceability),
  each `0–1` → width %. Omitted entirely when features are null.

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
