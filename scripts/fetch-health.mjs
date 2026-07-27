// Fetches steps + active minutes + sleep + resting heart rate from the Google
// Health API and writes public/data/health.json.
//
// Run:
//   GOOGLE_HEALTH_CLIENT_ID=xxx GOOGLE_HEALTH_CLIENT_SECRET=yyy \
//     GOOGLE_HEALTH_REFRESH_TOKEN=zzz node scripts/fetch-health.mjs
//
// NO TOKEN ROTATION: unlike Fitbit, Google does not rotate the refresh token on
// a normal refresh, so there is nothing to persist back to a secret — the token
// lasts until explicitly revoked or ~6 months unused (Production OAuth apps).
//
// Google returns GRANULAR data points, not pre-summarised daily totals, so this
// script aggregates per day. Every field is independently nullable; the Health
// component renders an em-dash for nulls, so a missing metric (or a rest/no-sync
// day) degrades gracefully rather than crashing the bake.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const CLIENT_ID = process.env.GOOGLE_HEALTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_HEALTH_REFRESH_TOKEN;
const OUT = 'public/data/health.json';
const BASE = 'https://health.googleapis.com/v4/users/me/dataTypes';

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error(
    'Missing env vars: GOOGLE_HEALTH_CLIENT_ID, GOOGLE_HEALTH_CLIENT_SECRET, GOOGLE_HEALTH_REFRESH_TOKEN',
  );
  process.exit(1);
}

/** Exchange the (non-rotating) refresh token for a fresh access token. */
async function refresh() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
    }).toString(),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

/** Today in YYYY-MM-DD, UTC — the day we aggregate and stamp on the payload. */
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

/** The day after `ymd` (YYYY-MM-DD), UTC — used as an exclusive upper bound. */
function nextDayUTC(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * AIP-160 filter for a day of an interval-based type. NOTE the field prefix is
 * the type's camelCase UNION-field name (e.g. `steps`, `sleep`), which differs
 * from the kebab-case PATH segment (e.g. `active-minutes`). `member` is the
 * interval field to bound on — `civil_start_time` for most, but sleep sessions
 * only support filtering by `civil_end_time`.
 */
function intervalDayFilter(unionField, date, nextDate, member = 'civil_start_time') {
  const field = `${unionField}.interval.${member}`;
  return `${field} >= "${date}T00:00:00" AND ${field} < "${nextDate}T00:00:00"`;
}

/**
 * List all data points of `dataType` whose civil start time falls within the
 * given UTC day, following pagination. AIP-160 filter per the Health API docs.
 * `restingHeartRate` is a daily record keyed by `date` (no interval), so it is
 * fetched without a filter and the matching day is picked by the caller.
 */
async function listDataPoints(token, dataType, filter, pageSize = 1000) {
  const points = [];
  let pageToken;
  do {
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (filter) params.set('filter', filter);
    if (pageToken) params.set('pageToken', pageToken);
    const url = `${BASE}/${dataType}/dataPoints?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      // Surface Google's actual error message (e.g. invalid filter field or
      // unknown data type) — status text alone ("Bad Request") is useless.
      const body = await res.text();
      throw new Error(
        `GET ${dataType} failed: ${res.status} — ${body.slice(0, 400)}`,
      );
    }
    const json = await res.json();
    points.push(...(json.dataPoints ?? []));
    pageToken = json.nextPageToken;
  } while (pageToken);
  console.log(`  ${dataType}: ${points.length} data point(s)`);
  return points;
}

/** Sum a list of stringy integers safely; returns null if the list is empty. */
function sumInts(values) {
  const nums = values.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  return nums.length ? nums.reduce((a, b) => a + b, 0) : null;
}

/**
 * Fetch one data type and reduce it to a single number for `date`. Any failure
 * (network, auth on a single scope, unexpected shape) is caught and logged, and
 * the field falls back to null so one bad metric never fails the whole bake.
 */
async function safeMetric(label, fn) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`⚠️  ${label} unavailable: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('Refreshing Google Health token…');
  const token = await refresh();

  const date = todayUTC();
  const nextDate = nextDayUTC(date);
  console.log(`Fetching Google Health data for ${date}…`);

  const [steps, activeMinutes, sleepHours, restingHeartRate] = await Promise.all([
    // Steps: sum `count` across interval data points. The count lives under the
    // camelCase union field on each point (p.steps.count), not at top level.
    safeMetric('steps', async () => {
      const filter = intervalDayFilter('steps', date, nextDate);
      const pts = await listDataPoints(token, 'steps', filter);
      if (pts[0]) console.log(`  steps[0] shape: ${JSON.stringify(pts[0])}`);
      return sumInts(pts.map((p) => p.steps?.count ?? p.count));
    }),

    // Active minutes: PATH segment is kebab-case (active-minutes); the union
    // field / filter prefix is camelCase (activeMinutes). Sum minutes across
    // all activity levels — mirrors Fitbit's fairly+very-active sum.
    safeMetric('activeMinutes', async () => {
      const filter = intervalDayFilter('activeMinutes', date, nextDate);
      const pts = await listDataPoints(token, 'active-minutes', filter);
      if (pts[0]) console.log(`  active-minutes[0] shape: ${JSON.stringify(pts[0])}`);
      const mins = pts.flatMap((p) => {
        const am = p.activeMinutes ?? p;
        return (am.activeMinutesByActivityLevel ?? []).map((a) => a.minutes);
      });
      return sumInts(mins);
    }),

    // Sleep: total minutesAsleep across sessions → hours, 0.1 precision.
    // Sleep sessions only support filtering by civil_end_time. pageSize max 25.
    safeMetric('sleep', async () => {
      const filter = intervalDayFilter('sleep', date, nextDate, 'civil_end_time');
      const pts = await listDataPoints(token, 'sleep', filter, 25);
      if (pts[0]) console.log(`  sleep[0] shape: ${JSON.stringify(pts[0])}`);
      const minutes = sumInts(pts.map((p) => (p.sleep ?? p).summary?.minutesAsleep));
      return minutes != null ? Math.round((minutes / 60) * 10) / 10 : null;
    }),

    // Resting HR: daily record keyed by `.date`. PATH is kebab-case
    // (daily-resting-heart-rate); filter prefix is the camelCase union field.
    safeMetric('restingHeartRate', async () => {
      const filter =
        `dailyRestingHeartRate.date >= "${date}" AND ` +
        `dailyRestingHeartRate.date < "${nextDate}"`;
      const pts = await listDataPoints(token, 'daily-resting-heart-rate', filter, 30);
      if (pts[0]) console.log(`  daily-resting-heart-rate[0] shape: ${JSON.stringify(pts[0])}`);
      const rec = pts[0]?.dailyRestingHeartRate ?? pts[0];
      const bpm = Number(rec?.beatsPerMinute);
      return Number.isFinite(bpm) ? bpm : null;
    }),
  ]);

  const payload = {
    fetchedAt: new Date().toISOString(),
    date,
    steps,
    activeMinutes,
    sleepHours,
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
