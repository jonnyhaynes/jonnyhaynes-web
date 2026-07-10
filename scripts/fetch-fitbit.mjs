// Fetches Fitbit activity + sleep + resting heart rate and writes
// public/data/fitbit.json.
//
// Run:
//   FITBIT_CLIENT_ID=xxx FITBIT_CLIENT_SECRET=yyy FITBIT_REFRESH_TOKEN=zzz \
//     node scripts/fetch-fitbit.mjs
//
// ROTATING REFRESH TOKEN: Fitbit returns a NEW refresh token on every refresh
// and invalidates the old one. This script writes the new token to the
// `refresh_token` GitHub Actions output (via $GITHUB_OUTPUT) so the workflow
// can persist it back to the FITBIT_REFRESH_TOKEN repo secret. If the token is
// not persisted, the NEXT run will fail to authenticate. When run locally
// (no $GITHUB_OUTPUT) it prints the new token instead.

import { writeFile, mkdir, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.FITBIT_REFRESH_TOKEN;
const OUT = 'public/data/fitbit.json';

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error(
    'Missing env vars: FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET, FITBIT_REFRESH_TOKEN',
  );
  process.exit(1);
}

/**
 * Exchange the rotating refresh token for a fresh access token AND a new
 * refresh token. Returns both — the caller MUST persist the new refresh token.
 */
async function refresh() {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN,
    }).toString(),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return { accessToken: json.access_token, refreshToken: json.refresh_token };
}

async function getJSON(token, path) {
  const res = await fetch(`https://api.fitbit.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Accept-Language': 'en_GB' },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/** Today in YYYY-MM-DD, UTC. Fitbit accepts a date or `today`; we want a
 *  stable string for the payload too, so format it explicitly. */
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  console.log('Refreshing Fitbit token…');
  const { accessToken, refreshToken } = await refresh();

  // Persist the rotated refresh token FIRST — before any data call can fail —
  // so a later error never strands us with a spent token.
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `refresh_token=${refreshToken}\n`);
    console.log('Wrote rotated refresh token to $GITHUB_OUTPUT.');
  } else if (refreshToken !== REFRESH_TOKEN) {
    console.log('\n⚠️  New refresh token (store as FITBIT_REFRESH_TOKEN):');
    console.log(`FITBIT_REFRESH_TOKEN=${refreshToken}\n`);
  }

  const date = todayUTC();
  console.log(`Fetching Fitbit data for ${date}…`);

  const [activity, sleep, heart] = await Promise.all([
    getJSON(accessToken, `/1/user/-/activities/date/${date}.json`),
    getJSON(accessToken, `/1.2/user/-/sleep/date/${date}.json`),
    getJSON(accessToken, `/1/user/-/activities/heart/date/${date}/1d.json`),
  ]);

  const summary = activity.summary ?? {};
  const activeMinutes =
    (summary.fairlyActiveMinutes ?? 0) + (summary.veryActiveMinutes ?? 0);
  const minutesAsleep = sleep.summary?.totalMinutesAsleep ?? null;
  const restingHeartRate =
    heart['activities-heart']?.[0]?.value?.restingHeartRate ?? null;

  const payload = {
    fetchedAt: new Date().toISOString(),
    date,
    steps: summary.steps ?? null,
    activeMinutes,
    sleepHours: minutesAsleep != null ? Math.round((minutesAsleep / 60) * 10) / 10 : null,
    restingHeartRate,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Wrote ${OUT}: ${payload.steps ?? '—'} steps, ${payload.sleepHours ?? '—'}h sleep, ${payload.restingHeartRate ?? '—'} bpm`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
