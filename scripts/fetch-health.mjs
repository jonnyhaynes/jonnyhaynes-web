// Fetches steps + active minutes + sleep + resting heart rate from Garmin
// Connect and writes public/data/health.json.
//
// Run:
//   GARMIN_TOKEN_BUNDLE='{"oauth1":{...},"oauth2":{...}}' node scripts/fetch-health.mjs
//
// AUTH: we never send a username/password here. A one-time local login
// (scripts/garmin-auth.mjs) captures an OAuth token bundle; this job loads that
// bundle via GarminConnect.loadToken(). Garmin's short-lived oauth2 token is
// refreshed from the long-lived oauth1 token during the run, so after fetching
// we print the (possibly refreshed) bundle for the workflow to persist back to
// the GARMIN_TOKEN_BUNDLE secret — see docs/plans/migrate-google-health-to-garmin.md.
//
// Every field is independently nullable; the Health component renders an em-dash
// for nulls, so a missing metric (or a rest/no-sync day) degrades gracefully
// rather than crashing the bake.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
// garmin-connect is CommonJS; import the default and destructure (Node ESM
// interop doesn't reliably expose named CJS exports).
import garminConnect from 'garmin-connect';
const { GarminConnect } = garminConnect;

const OUT = 'public/data/health.json';
const TOKEN_BUNDLE = process.env.GARMIN_TOKEN_BUNDLE;

// Marker the workflow greps stdout for to capture the refreshed bundle. Keeping
// the whole bundle on one line after the marker makes the workflow-side parse a
// single `grep | sed`.
const BUNDLE_MARKER = 'GARMIN_TOKEN_BUNDLE=';

if (!TOKEN_BUNDLE) {
  console.error(
    'Missing env var GARMIN_TOKEN_BUNDLE (JSON with {oauth1, oauth2}). ' +
      'Capture one locally with: node scripts/garmin-auth.mjs',
  );
  process.exit(1);
}

let bundle;
try {
  bundle = JSON.parse(TOKEN_BUNDLE);
  if (!bundle?.oauth1 || !bundle?.oauth2) throw new Error('missing oauth1/oauth2');
} catch (err) {
  console.error(`GARMIN_TOKEN_BUNDLE is not valid JSON with oauth1+oauth2: ${err.message}`);
  process.exit(1);
}

/** Today as a JS Date at UTC midnight — the day we stamp on the payload.
 *  Garmin's library methods key off the date's calendar day. */
function todayUTC() {
  const ymd = new Date().toISOString().slice(0, 10);
  return { ymd, date: new Date(`${ymd}T00:00:00Z`) };
}

/**
 * Fetch one metric and reduce it to a single number. Any failure (network, a
 * single unavailable endpoint, unexpected shape) is caught and logged, and the
 * field falls back to null so one bad metric never fails the whole bake.
 */
async function safeMetric(label, fn) {
  try {
    const v = await fn();
    return Number.isFinite(v) ? v : null;
  } catch (err) {
    console.warn(`⚠️  ${label} unavailable: ${err.message}`);
    return null;
  }
}

/**
 * Intensity ("active") minutes for the day. The library has no typed method for
 * this, so we hit the daily user-summary endpoint directly via the generic get()
 * and sum moderate + vigorous intensity minutes — Garmin's analogue of the old
 * "active minutes" tile. Returns null if the fields are absent.
 */
async function fetchActiveMinutes(client, ymd) {
  const profile = await client.getUserProfile();
  const displayName = profile?.displayName;
  if (!displayName) throw new Error('no displayName on user profile');
  const url =
    `/usersummary-service/usersummary/daily/${displayName}` +
    `?calendarDate=${ymd}`;
  const summary = await client.get(url);
  const moderate = Number(summary?.moderateIntensityMinutes) || 0;
  const vigorous = Number(summary?.vigorousIntensityMinutes) || 0;
  const total = moderate + vigorous;
  // Distinguish "genuinely zero recorded" (keep 0) from "fields absent" (null):
  // if neither field was present at all, treat as unavailable.
  if (summary?.moderateIntensityMinutes == null && summary?.vigorousIntensityMinutes == null) {
    throw new Error('no intensity-minutes fields in daily summary');
  }
  return total;
}

async function main() {
  const { ymd, date } = todayUTC();

  console.log('Loading Garmin token bundle…');
  // The constructor requires a truthy credentials object even for token-only
  // use (it throws "Missing credentials" otherwise). loadToken() never reads
  // these fields, so an empty placeholder is enough — no real password in CI.
  const client = new GarminConnect({ username: '', password: '' });
  client.loadToken(bundle.oauth1, bundle.oauth2);

  console.log(`Fetching Garmin data for ${ymd}…`);

  const [steps, activeMinutes, sleepHours, restingHeartRate] = await Promise.all([
    // Steps: a single daily total.
    safeMetric('steps', () => client.getSteps(date)),

    // Active minutes: moderate + vigorous intensity minutes (see above).
    safeMetric('activeMinutes', () => fetchActiveMinutes(client, ymd)),

    // Sleep: getSleepDuration returns {hours, minutes} → decimal hours, 0.1 precision.
    safeMetric('sleepHours', async () => {
      const { hours, minutes } = await client.getSleepDuration(date);
      const total = Number(hours) + Number(minutes) / 60;
      return Number.isFinite(total) ? Math.round(total * 10) / 10 : null;
    }),

    // Resting HR: a field on the daily heart-rate payload.
    safeMetric('restingHeartRate', async () => {
      const hr = await client.getHeartRate(date);
      return hr?.restingHeartRate;
    }),
  ]);

  const payload = {
    fetchedAt: new Date().toISOString(),
    date: ymd,
    steps,
    activeMinutes,
    sleepHours,
    restingHeartRate,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Wrote ${OUT}: ${payload.steps ?? '—'} steps, ${payload.activeMinutes ?? '—'} active min, ${payload.sleepHours ?? '—'}h sleep, ${payload.restingHeartRate ?? '—'} bpm`,
  );

  // Emit the (possibly refreshed) token bundle so the workflow can persist it
  // back to the secret. oauth2 is short-lived and gets refreshed from oauth1
  // during the run; persisting keeps the next bake from starting on a stale one.
  try {
    const refreshed = client.exportToken();
    const out = { oauth1: refreshed.oauth1, oauth2: refreshed.oauth2 };
    console.log(`${BUNDLE_MARKER}${JSON.stringify(out)}`);
  } catch (err) {
    console.warn(`⚠️  Could not export refreshed token bundle: ${err.message}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
