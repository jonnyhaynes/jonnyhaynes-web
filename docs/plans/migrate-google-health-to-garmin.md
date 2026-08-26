# Migrate Health section from Google Health → Garmin Connect

**Status:** Implemented on branch `migrate-google-health-to-garmin` (2026-08-26).
Code is in; the **live bake is gated on Jonny's manual steps** (capture the token
bundle, add `GARMIN_TOKEN_BUNDLE` + `GARMIN_TOKEN_PAT` secrets — see "Manual
steps" below). Until secrets exist the section renders the existing fixture /
degrades gracefully.

**Build notes (what the library actually exposes):** `getSteps(date)→number`,
`getSleepDuration(date)→{hours,minutes}`, `getHeartRate(date).restingHeartRate`.
There is **no typed intensity-minutes method** — active minutes are fetched via
the generic `client.get()` against
`/usersummary-service/usersummary/daily/{displayName}?calendarDate=YYYY-MM-DD`,
summing `moderateIntensityMinutes + vigorousIntensityMinutes` (null if absent).
`exportToken()`/`loadToken(oauth1, oauth2)` handle the bundle persistence.

**Goal:** Replace the Google Health data source behind the Health section
(`// Life beyond the keyboard`) with **Garmin Connect**, keeping the same four
stat tiles (steps, active minutes, sleep, resting HR), the existing
bake-to-static-JSON + graceful-degradation architecture, and — critically — the
**existing JSON schema and `Health.tsx` component untouched**.

**Trigger:** Jonny has ditched his Fitbit for a Garmin watch, so Google Health
(which sourced from the Fitbit-era Google account) no longer has data flowing in.
The watch is the new source of truth.

## Decisions locked in (with Jonny)

- **Approach: Node `garmin-connect` library** (`Pythe1337N/garmin-connect`,
  v1.6.2), keeping everything inside `scripts/fetch-health.mjs`. No Python, no
  SQLite, no GarminDB. Rationale below.
- **Fully automated** — the twice-daily CI bake stays. No manual/local-commit step.
- **No raw password in CI.** One-time local login captures an OAuth token bundle;
  CI authenticates with the token bundle only.

### Why not GarminDB / Python / official API

- **GarminDB** logs in with the raw Garmin **email + password** (unofficial
  endpoints), is Python + SQLite, and routinely trips CAPTCHA/MFA from GitHub
  runner IPs — worst fit for an unattended bake. Rejected.
- **`garth` (Python)** is solid but adds a Python step to a Node pipeline. Rejected
  for toolchain reasons only.
- **Official Garmin Health/Wellness API** is a business partner program requiring
  application/approval — likely slow or a dead end for a personal site. Rejected.
- **`garmin-connect` (Node)** keeps the whole bake in one `.mjs`, supports token
  persistence (`loadToken`/`oauth1Token`/`oauth2Token`), and covers 3 of 4 metrics
  directly. **Chosen.**

## Key API facts (verified against current library docs)

- **Auth model — two OAuth tokens.** After `login()`, the client holds
  `GCClient.client.oauth1Token` (long-lived) and `GCClient.client.oauth2Token`
  (short-lived, auto-refreshed from oauth1). Persist and reload with:
  ```js
  // one-time local capture
  await GCClient.login();
  const bundle = { oauth1: GCClient.client.oauth1Token, oauth2: GCClient.client.oauth2Token };
  // in CI
  GCClient.loadToken(bundle.oauth1, bundle.oauth2);
  ```
  Also available: `saveTokenToFile(dir)` / `loadTokenByFile(dir)`.
- **Token rotation — UNLIKE Google Health.** The oauth2 token is short-lived and
  the library refreshes it during a run using oauth1. The **refreshed bundle
  should be persisted back** so the next run starts from a fresh token. This
  re-introduces the Fitbit-era "write rotated token back to a secret" mechanism
  that Google Health let us drop. **This is the main added complexity vs today.**
- **Metric methods:**
  | Tile | Library call | Notes |
  |---|---|---|
  | `steps` | `getSteps(date)` | returns total step count (number) |
  | `sleepHours` | `getSleepDuration(date)` | returns duration; convert to hours, 0.1 precision |
  | `restingHeartRate` | `getHeartRate(date)` | resting HR is a field on the HR payload (e.g. `restingHeartRate`), not a top-level method — extract it |
  | `activeMinutes` | **no dedicated method** | Garmin calls this "intensity minutes"; pull from the daily/user summary (`getUserSummary`/`getDailySummary` or the underlying `connectapi` summary endpoint). **TBC exact field at build.** Degrades to `null` if unavailable. |
- **`date` semantics.** Library methods take a JS `Date`. We keep the current
  UTC "today" convention so `date`/`fetchedAt` fields behave as before.
- **Unofficial endpoints.** Not a supported Garmin API; occasional breakage on
  Garmin-side changes is an accepted trade-off for a personal site.

## Output contract — UNCHANGED

`public/data/health.json` keeps its exact shape. `src/data/health.ts`
(`HealthData`, `useHealthData`) and `src/components/Health.tsx` are **not touched**
except copy (see below). This is the whole point of the migration design.

```json
{
  "fetchedAt": "2026-08-26T08:27:58.381Z",
  "date": "2026-08-26",
  "steps": 84,
  "activeMinutes": null,
  "sleepHours": null,
  "restingHeartRate": null
}
```

Every field stays independently nullable → `safeMetric()`-style per-field
try/catch is retained so a missing metric (notably active/intensity minutes)
never fails the bake or breaks the section.

## Work items

### Code

1. **`scripts/fetch-health.mjs`** — rewrite the fetch layer:
   - Remove Google OAuth (`refresh()` + `health.googleapis.com` calls).
   - Add `garmin-connect`; construct client, `loadToken(oauth1, oauth2)` from
     env (`GARMIN_TOKEN_BUNDLE` — a JSON secret).
   - Fetch four metrics via the methods above, each wrapped in `safeMetric()`.
   - Map to the existing `{ fetchedAt, date, steps, activeMinutes, sleepHours,
     restingHeartRate }` payload. **No schema change.**
   - After fetching, read back the (possibly refreshed) `oauth1Token`/`oauth2Token`
     and emit them so the workflow can persist the rotated bundle (stdout marker
     or a temp file the workflow reads — decide at build).
2. **`scripts/garmin-auth.mjs`** (replaces `google-health-auth.mjs`) — one-time
   local helper: prompt for Garmin email/password (stdin only, never stored),
   `login()`, print the JSON token bundle to paste into the
   `GARMIN_TOKEN_BUNDLE` secret. Delete `google-health-auth.mjs`.
3. **`package.json`** — add `garmin-connect` dependency.
4. **`src/components/Health.tsx`** — copy only: any "Google Health"/"wearable"
   phrasing → "Garmin". No logic/JSX/type changes.
5. Leave `src/data/health.ts` and the JSON schema alone.

### Workflow / secrets

6. **`.github/workflows/bake-health-data.yml`**:
   - Swap the three `GOOGLE_HEALTH_*` env/secrets for `GARMIN_TOKEN_BUNDLE`.
   - **Re-add token-rotation persist step** (like the old Fitbit workflow): after
     the bake, write the refreshed bundle back to the `GARMIN_TOKEN_BUNDLE`
     secret. Needs a PAT with `secrets: write` (repo Actions secrets) — the
     `GITHUB_TOKEN` cannot update secrets. Add `GARMIN_TOKEN_PAT`.
   - Keep cron `0 8,20 * * *`, `contents: write` + `pull-requests: write`, and the
     commit-and-auto-merge-PR flow as-is.

### Docs

7. Update this plan's status on implementation; add a short note to
   `docs/about-page-plan.md` that Health now sources from Garmin.

## Manual steps (by Jonny) — gating the live bake

- Run `node scripts/garmin-auth.mjs` locally, log in (handle any MFA once,
  interactively), copy the printed token bundle.
- Add repo secrets: `GARMIN_TOKEN_BUNDLE` (the bundle JSON) and
  `GARMIN_TOKEN_PAT` (a fine-grained PAT with Actions **secrets: write**).
- Until secrets exist, the section renders the existing fixture / degrades
  gracefully (same as the Google Health gating today).

## Risks

- **Token-rotation persist-back is the fragile part** (as it was for Fitbit). If
  it fails, the oauth2 token eventually expires and the bake stops until re-auth.
  Mitigate: log clearly on refresh failure; the section degrades, doesn't break.
- **CAPTCHA/MFA** only bites at the one-time local `login()`, not in CI (CI uses
  the stored bundle) — this is the key reason the token-bundle approach beats
  GarminDB.
- **`activeMinutes` mapping is TBC** — Garmin "intensity minutes" may not map
  1:1 to the old "active minutes" ring goal (60). Confirm the field and consider
  whether the `GOALS.activeMinutes` target still makes sense (component change, if
  any, would be a one-line constant — flag before touching).
- **Unofficial API drift** — accepted for a personal site.
