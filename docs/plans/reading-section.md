# Reading section: 4 books, portrait covers

**Status:** Complete — shipped in PR #47 (issue #46) + data fix PR #48/#49
**Type:** `[ai-assisted]`
**Related:** `src/components/Reading.tsx`, `scripts/fetch-spotify.mjs`,
`.github/workflows/bake-spotify-data.yml`

## What shipped

- Reading (saved audiobooks) section reworked from side-by-side cards into
  portrait cover tiles: **4 books**, two wide on mobile, four wide from `md` up,
  portrait `aspect-[2/3]` cover with the full title (wrapping freely) and author
  beneath. (#47)
- `pickImage` gained a `minWidth` arg (default 64px for the compact
  avatar/thumbnail grids); audiobook covers now request ~640px so the larger
  tiles aren't upscaled/blurry. Also fixed a latent bug where the no-match
  fallback returned the *smallest* image instead of the largest. (#47)
- The `Bake Spotify data` workflow was pushing straight to the protected `main`
  branch and silently failing (`GH006`). It now pushes to a `bake/spotify-data`
  branch and opens an auto-merging PR instead. (#48)

## Follow-ups (open — owner: Jonny)

These surfaced while getting the covers to actually deploy. Neither is code in
this repo; both are account/settings actions only a human can take.

### 1. Rotate the exposed Spotify credentials — SECURITY, do first

During the 2026-07-13 session the Spotify **client secret** and **refresh token**
were pasted into the Claude Code conversation (via `!`-prefixed commands, whose
input/output is piped into the model context). Per CLAUDE.md's load-bearing
principle *"Never put secrets, credentials, or client data into the model"*,
treat both as compromised.

- Regenerate the client secret in the Spotify developer dashboard.
- Re-mint the refresh token against the new secret using
  `scripts/spotify-auth.mjs` — **run it in a terminal outside the Claude Code
  session** so the values never re-enter model context.
- Update the `SPOTIFY_CLIENT_SECRET` and `SPOTIFY_REFRESH_TOKEN` GitHub Actions
  secrets. The client ID is not secret; no action needed there.

The bake fix (#48) keeps working across the rotation.

### 2. Enable "Allow GitHub Actions to create and approve pull requests"

The bake workflow (#48) pushes the data branch fine but currently **cannot open
the PR** — it fails with *"GitHub Actions is not permitted to create or approve
pull requests"*. This is an org/repo setting the `pull-requests: write` job
permission cannot override.

- Enable at **Settings → Actions → General → Workflow permissions →
  "Allow GitHub Actions to create and approve pull requests"**.
- Until then, scheduled bakes push fresh data to `bake/spotify-data` but leave
  the PR unopened; open it manually (`gh pr create --head bake/spotify-data`)
  and it auto-merges once the Vercel check passes.

Once enabled, the twice-daily bake is fully hands-off again.
