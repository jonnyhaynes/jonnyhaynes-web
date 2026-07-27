# Migrate Health section from Fitbit → Google Health API

**Status:** Implemented on branch `migrate-fitbit-to-google-health` (2026-07-27).
Code + a placeholder `health.json` fixture are in; the **live bake is gated on
Jonny's Google Cloud setup** (see "Google Cloud setup" below) — until creds
exist the section renders the fixture / degrades gracefully.

**Build note:** the "verify at build" items resolved to **camelCase** data-type
slugs (`steps`, `sleep`, `dailyRestingHeartRate`, `activeMinutes`) — not the
kebab-case guessed below — and the read scopes are the three
`https://www.googleapis.com/auth/googlehealth.*.readonly` URLs. `restingHeartRate`
is a daily `date`-keyed record (no interval filter); the other three are summed
over the day's granular data points.
**Goal:** Replace the Fitbit data source behind the Health section
(`// Life beyond the keyboard`) with the **Google Health API**, keeping the same
four stat tiles (steps, active minutes, sleep, resting HR) and the existing
bake-to-static-JSON + graceful-degradation architecture.

Trigger: Fitbit is being retired as the source. Setup reference:
<https://developers.google.com/health/setup>.

## Decisions locked in (with Jonny)

- **Token durability: plan for Production.** Google OAuth clients start in
  "Testing" mode where refresh tokens **expire after 7 days** — that would break
  the twice-daily bake weekly. The OAuth app **must be published to "In
  Production"** so tokens persist (revoked only on ~6-months-unused or explicit
  revoke). Health scopes are sensitive and may trigger Google's verification
  review; **this is the main external risk and is partly outside our control**
  (Google's review timeline). See "Google Cloud setup (manual, by Jonny)" below.
- **Rename everything to `health` / `google-health`** (not keep Fitbit names):
  - `public/data/fitbit.json` → `public/data/health.json`
  - `scripts/fetch-fitbit.mjs` → `scripts/fetch-health.mjs`
  - `scripts/fitbit-auth.mjs` → `scripts/google-health-auth.mjs`
  - `.github/workflows/bake-fitbit-data.yml` → `bake-health-data.yml`
  - `src/data/fitbit.ts` (`useFitbitData`/`FitbitData`) → `src/data/health.ts`
    (`useHealthData`/`HealthData`)
  - `src/components/Health.tsx` — copy text updated ("pulled from my Fitbit" →
    generic, e.g. "pulled from my wearable"), imports updated.

## Key API facts (verified against current Google docs)

- **REST/OAuth, server-side friendly.** Not Android-only. Fits the existing bake
  pattern (GitHub Action runs a Node script that writes static JSON).
- **Token exchange:** `POST https://oauth2.googleapis.com/token` with
  `client_id`, `client_secret`, `refresh_token`, `grant_type=refresh_token`
  (form-encoded). Returns `access_token`, `expires_in`, `scope`, `token_type`.
- **Google does NOT rotate the refresh token** on a normal refresh. This is the
  big simplification vs Fitbit: **the entire "persist rotated token back to a
  repo secret" mechanism is removed** — no `FITBIT_TOKEN_PAT`, no `secrets:
  write` PAT, no `always()` persist step.
- **Data endpoint:**
  `GET https://health.googleapis.com/v4/users/me/dataTypes/{dataType}/dataPoints`
  - Data types (kebab-case): `steps`, `active-minutes` (TBC exact slug — verify at
    build), `sleep`, `daily-resting-heart-rate` (TBC exact slug — verify at build).
  - Query: `filter` (AIP-160), e.g.
    `filter=steps.interval.civil_start_time >= "2026-07-13" AND steps.interval.civil_start_time < "2026-07-14"`,
    plus `pageSize` / `pageToken`. Sleep/exercise `pageSize` max 25.
  - Response: `{ dataPoints: [...], nextPageToken }`, descending by start time.
- **Scopes required:**
  - `activity_and_fitness` — steps + active minutes
  - `sleep` — sleep sessions
  - `health_metrics_and_measurements` — resting heart rate
  (Exact fully-qualified scope URL strings to be confirmed against the Data
  Access page during build — the setup UI generates them.)

## Data shape: unchanged public contract

`public/data/health.json` keeps the **same fields** as `fitbit.json` so the
component barely changes:

```json
{
  "fetchedAt": "2026-07-13T20:00:00.000Z",
  "date": "2026-07-13",
  "steps": 8421,
  "activeMinutes": 37,
  "sleepHours": 7.2,
  "restingHeartRate": 54
}
```

**Aggregation note (differs from Fitbit).** Fitbit returned pre-summarised daily
totals (`activity.summary.steps`); Google returns **granular data points**. The
fetch script must aggregate for the target day:
- `steps` — sum step interval data points
- `activeMinutes` — sum active-minutes intervals
- `sleepHours` — total sleep-session duration → hours, rounded to 0.1
- `restingHeartRate` — read the single daily resting-HR record
Every field is independently nullable (component already renders `—` for null).

## Work breakdown (issue = unit of work)

1. **`scripts/google-health-auth.mjs`** — one-time local helper (adapt
   `fitbit-auth.mjs`): Google authorization-code flow, local callback server,
   prints the refresh token to store as `GOOGLE_HEALTH_REFRESH_TOKEN`. Uses
   Google's authorize URL + `oauth2.googleapis.com/token`. Redirect URI must
   match one registered on the OAuth client.
   *AC:* running it produces a working refresh token; scopes cover all four metrics.
2. **`scripts/fetch-health.mjs`** — refresh access token, fetch the four data
   types for `todayUTC()`, aggregate to the payload above, write
   `public/data/health.json`. No token-rotation persistence. Graceful per-field
   nulls; non-fatal on individual data-type failure where sensible.
   *AC:* with valid env vars, writes a well-formed `health.json`; missing/partial
   data yields nulls, not a crash.
3. **`.github/workflows/bake-health-data.yml`** — schedule (keep `0 8,20 * * *`),
   `workflow_dispatch`, `contents: write` only. Env:
   `GOOGLE_HEALTH_CLIENT_ID/_SECRET/_REFRESH_TOKEN`. Commit `health.json` if
   changed. **Delete the rotated-token persist step and the PAT.**
   *AC:* dispatch run writes/commits `health.json`; no `secrets: write` needed.
4. **`src/data/health.ts`** — rename module/type/hook, fetch `/data/health.json`.
   *AC:* `useHealthData()` returns the typed snapshot; null on failure.
5. **`src/components/Health.tsx`** — update import + copy line.
   *AC:* renders identically with `health.json`; hides on missing data.
6. **Remove Fitbit artifacts** — delete `fetch-fitbit.mjs`, `fitbit-auth.mjs`,
   `bake-fitbit-data.yml`, `src/data/fitbit.ts`, `public/data/fitbit.json`.
   Update references in `CLAUDE.md` and `docs/plans/v2-redesign.md` (Fitbit →
   Google Health).
7. **Secrets cleanup** — after go-live, remove `FITBIT_*` repo secrets and the
   `FITBIT_TOKEN_PAT`.

## Google Cloud setup (manual, by Jonny — blocks the bake)

Claude cannot do these; they need Jonny in the Google Cloud console:
1. Create/enable a Google Cloud project + **enable the Google Health API**.
2. Create an **OAuth 2.0 Client ID** (Web application); add the redirect URI the
   auth helper uses (e.g. `http://127.0.0.1:8889/callback` or `https://www.google.com`
   per Google's example — match whatever the helper registers).
3. On the **Data Access** page, add the three scopes (search "Google Health API").
4. Add Jonny as a **test user** for initial local auth.
5. Run `scripts/google-health-auth.mjs` locally → capture the refresh token.
6. Add repo secrets: `GOOGLE_HEALTH_CLIENT_ID`, `GOOGLE_HEALTH_CLIENT_SECRET`,
   `GOOGLE_HEALTH_REFRESH_TOKEN`.
7. **Publish the app to "In Production"** (and complete verification if Google
   requires it) so the refresh token survives past 7 days.

## Risks / open questions

- **Verification timeline (biggest risk).** If Google requires sensitive-scope
  verification for Production, go-live of the live bake is gated on their review.
  Mitigation: the section degrades gracefully (hides) with no/stale JSON, so the
  site is never broken; we can ship the code and let data flow once auth is live.
- **Exact data-type slugs & scope strings** — confirmed at build against the live
  Data Access page / dataTypes index; the plan lists the verified categories.
- **Does Google expose "active minutes" as a single type** matching Fitbit's
  fairly+very-active sum? If not, derive from a comparable
  activity/exercise-intensity type or drop the tile. Decide at build.
- **Data freshness** — depends on Jonny's device syncing to Google Health; a
  rest/no-sync day shows dashes (already the designed fallback).

## Verification (before PR)

- `npm run build` (includes `tsc`) and `npm run lint` green.
- `scripts/fetch-health.mjs` produces a valid `health.json` locally (with real
  creds) — or a hand-crafted fixture if creds aren't ready, to prove the
  component path.
- Manual: Health section renders with new JSON; hides when JSON absent.

---

*Plan-first per `CLAUDE.md` / `docs/dev-workflow.md`. A human approves this doc
before any code is written; a human reviews and merges the PR. Mark the PR
`[ai-assisted]` and reference this plan.*
