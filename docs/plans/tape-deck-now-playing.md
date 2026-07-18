# Plan: tape-deck styling for the Now Playing card (A/B trial)

> **Superseded.** The Deck variant won the A/B trial, but the cassette/reel
> metaphor was then dropped in favour of a Winamp-style visualizer. See
> [`now-playing-visualizers.md`](./now-playing-visualizers.md) for what shipped.
> This doc is kept for history.


## Goal

Make the music section's **Now Playing** card look like a cassette / tape deck.
Build **two variants** behind a temporary in-app toggle so the owner can compare
them live against real Spotify data, pick a winner, then ship the winner alone.

- **Variant A — Cassette shell.** The card *is* a cassette. Two reels spin at a
  speed derived from tempo/energy; album art shows through the shell window;
  track/artist sit on a "paper" label; the progress bar reads as tape wound
  between the reels. Heavy Rotation / Coding Fuel untouched.
- **Variant B — Full deck unit.** A brushed-metal front-panel wraps the cassette
  window: transport controls (decorative), VU-style meters, and the two
  playlists restyled as cassette spines on a rack.

## Constraints (from CLAUDE.md)

- **Graceful degradation** — must render fine when Spotify JSON is missing/stale
  (no track, no art, API offline). Reels simply don't spin; card falls back to
  the existing "enjoying the silence" / text-only states.
- **No new styling framework** — plain CSS in `src/index.css` (custom props,
  `@keyframes`, `@layer`) + Tailwind utilities, matching existing conventions.
- **Accessibility & reduced motion** — `prefers-reduced-motion` stops the reels
  (as the equaliser already does); keep the existing `aria-live` announcement,
  progressbar semantics, and focus-visible outlines. Transport buttons in B are
  decorative → `aria-hidden`, not real buttons (nothing to control).
- **Reuse existing signals** — reel speed from the same `tempo`/`energy` the
  equaliser uses; **freeze reels when the timer stops** (`position >= duration`),
  consistent with the freeze-on-stop behaviour already shipped.
- Keep it **light** — personality, not a dashboard. No new data, no new deps.

## Approach

### Toggle (temporary, removed before merge)

- A small segmented `[ A | B ]` control rendered above the card in
  `NowPlaying.tsx`, backed by `useState<'a' | 'b'>`. Persist choice to
  `localStorage` so a refresh keeps the current variant while comparing.
- Clearly marked `TODO: remove after A/B decision` so it's obvious in review and
  easy to strip. The loser variant + toggle come out in a follow-up commit on
  the same branch before the PR is marked ready.

### Shared internals

- Extract the current art/scrim/text/eq/progress markup into the default
  (control) render path, and add `<CassetteA>` / `<DeckB>` sibling components in
  the same file. All three consume the same `data` / `position` / `features`
  already computed in `NowPlaying`.
- New `timerRunning` flag already exists — pass it to the reels the same way it's
  passed to the visualiser, so reels freeze exactly when the eq does.
- Reel spin: one `@keyframes reel-spin` (360° rotate, linear infinite) applied to
  a `.reel` element; duration bound to `--reel-duration` derived from tempo
  (faster song → faster reel), clamped like the eq duration. Amplitude/energy can
  nudge a subtle wobble but keep it minimal. Gate on an `.is-spinning` class so
  freeze = remove class = reels hold position (mirrors `.is-playing`).

### Variant A — Cassette shell

- Card keeps the square-ish footprint. Layers: shell background (rounded, two
  screw-dots, subtle plastic sheen via gradients) → window showing album art →
  two reels over the art → paper label with track/artist → tape progress between
  reels → thin progress bar retained (or restyle as the tape spool fill).
- Reuse the existing scrim idea for text legibility over arbitrary covers.

### Variant B — Full deck unit

- Outer brushed-metal panel (layered linear-gradients for the brushed effect),
  the Variant-A cassette window embedded in it, a transport row
  (⏮ ▶ ⏸ ⏭ — decorative, `aria-hidden`), and VU meters. Simplest VU: reuse the
  eq-bar mechanism but styled as needles/segments, or keep the existing eq row
  restyled. Playlists (Coding Fuel) optionally restyled as cassette spines — but
  scope that as a *stretch*; the core comparison is the Now Playing card.

## Files touched

- `src/components/NowPlaying.tsx` — variants + temporary toggle.
- `src/index.css` — `.reel` / `@keyframes reel-spin`, cassette + deck styles,
  reduced-motion rules. Follow the existing eq-section conventions/comments.
- (stretch, Variant B only) `src/components/Listening.tsx` — cassette-spine
  restyle of Coding Fuel, gated so it doesn't affect Variant A.

## Out of scope

- No changes to data fetching, polling cadence, or the baked JSON shape.
- No audio. Motion stays "honest, non-audio" like the current equaliser.
- The 50/50 desktop width shipped in #100 stays as-is.

## Local dev / data

Plain `npm run dev` is Vite only — it does **not** run `api/now-playing.js`, so
`/api/now-playing` returns nothing and the card falls back to the idle state
(no track, no reels). To compare A vs B against a real playing track, use the
Vercel CLI so the serverless function runs locally against real Spotify:

1. `npm i -g vercel` (not installed yet) and `vercel link` the repo.
2. `vercel env pull .env.local` — pulls `SPOTIFY_CLIENT_ID/SECRET/REFRESH_TOKEN`.
   `.env*.local` is already gitignored, so secrets stay out of git.
3. `vercel dev` (instead of `npm run dev`), with something playing on Spotify.

No mock/fixture is added to the app — the local-data story is `vercel dev` only.

## Verification

- `npm run build` (tsc + vite) and `npm run lint` clean.
- Manual via `vercel dev` with a real track: toggle A↔B while playing (reels
  spin, freeze at track end), paused, and API-offline states all render without
  breaking.
- `prefers-reduced-motion` — reels static.

## Rollout

1. Build both + toggle on a branch off `main`; owner compares in dev.
2. Owner picks A or B.
3. Remove the loser + toggle; final self-review.
4. `[ai-assisted]` PR referencing this plan; human reviews & merges.
