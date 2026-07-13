# Fix GitHub bake: push via auto-merging PR, not direct push to main

**Status:** Implemented — awaiting review (issue #54)
**Type:** `[ai-assisted]`
**Related:** `.github/workflows/bake-github-data.yml`; mirrors the Spotify fix
in PR #48 (`bake-spotify-data.yml`)

## Problem

`bake-github-data.yml` ends with a direct `git push` to `main`. But `main` is a
protected branch (PR required + Vercel status check), so the push is rejected
with `GH006` — exactly the failure PR #48 fixed for the Spotify bake. Every
scheduled GitHub bake since has silently failed to commit, leaving
`public/data/github.json` stale (observed: last successful bake 2026-07-10).

The Spotify workflow was already migrated to the correct pattern; the GitHub one
was missed.

## Fix

Port the Spotify workflow's push pattern onto the GitHub bake:

- Add `pull-requests: write` to the job `permissions` (was `contents: write`
  only).
- Replace the "Commit if changed" step (direct push to `main`) with an
  "Open/refresh data PR if changed" step that:
  - no-ops if `public/data/github.json` is unchanged;
  - otherwise commits to a fixed `bake/github-data` branch and force-pushes it
    (disposable, machine-owned data branch);
  - opens a PR against `main` only if one isn't already open for that branch;
  - enables `--auto --squash` merge — since the branch rule requires 0
    approvals, the PR merges itself once the Vercel check passes.

No change to `scripts/fetch-github.mjs` or any application code — this is purely
the CI push mechanism.

## Scope

Independent of PR #53 (the recency-based featured-projects code change). This PR
touches only the workflow file.

## Verification

- YAML validated locally.
- Behaviour confirmed by parity with the already-working `bake-spotify-data.yml`
  (PR #48/#49 merged and running).
- End-to-end verification is inherently post-merge: the workflow only runs on
  GitHub (schedule / `workflow_dispatch`). After merge, a manual
  `workflow_dispatch` run should open/auto-merge a `bake/github-data` PR (or
  no-op if data is unchanged).
