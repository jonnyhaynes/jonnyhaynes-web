// Fetches steps + active minutes + resting heart rate + calories from Garmin
// Connect (plus 3-day histories), and weather + sun times from Open-Meteo, then
// writes public/data/health.json.
//
// Run:
//   GARMIN_TOKEN_BUNDLE='{"oauth1":{...},"oauth2":{...}}' node scripts/fetch-health.mjs
//
// AUTH (Garmin only): we never send a username/password here. A one-time local
// login (scripts/garmin-auth.mjs) captures an OAuth token bundle; this job loads
// that bundle via GarminConnect.loadToken(). Garmin's short-lived oauth2 token
// is refreshed from the long-lived oauth1 token during the run, so after
// fetching we print the (possibly refreshed) bundle for the workflow to persist
// back to the GARMIN_TOKEN_BUNDLE secret — see
// docs/plans/migrate-google-health-to-garmin.md.
//
// Open-Meteo needs no key. Weather/sun degrade to null on any failure.
//
// Every field is independently nullable; the Health component renders an em-dash
// (or hides a zone/glance) for nulls, so a missing metric (or a rest/no-sync
// day, or a weather-API hiccup) degrades gracefully rather than crashing the bake.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
// garmin-connect is CommonJS; import the default and destructure (Node ESM
// interop doesn't reliably expose named CJS exports).
import garminConnect from 'garmin-connect';
const { GarminConnect } = garminConnect;

const OUT = 'public/data/health.json';
const TOKEN_BUNDLE = process.env.GARMIN_TOKEN_BUNDLE;

// Rotherham, UK — weather + sun times location. Approximate town coords; lives
// in a public file by design (see docs/plans/health-watch-face-v2.md).
const LAT = 53.43;
const LON = -1.36;
const TZ = 'Europe/London';

// How many days of history the drill-down graphs show (today + 2 prior).
const HISTORY_DAYS = 3;

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

/** YYYY-MM-DD for a Date at UTC. */
function ymdOf(date) {
  return date.toISOString().slice(0, 10);
}

/** The last N calendar days ending today (UTC), oldest first: [{ymd, date}]. */
function recentDays(n) {
  const todayMs = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(todayMs - i * 86_400_000);
    out.push({ ymd: ymdOf(date), date });
  }
  return out;
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
 * The Garmin daily user-summary blob for a date. The library has no typed
 * method for most of these fields (intensity minutes, calories), so we hit the
 * daily user-summary endpoint directly via the generic get(). Cached per-date
 * within a run so steps/active/calories don't each re-request it.
 */
// connectapi host — the library's typed methods (getSteps/getHeartRate) hit
// this via its UrlClass (GC_API); the generic client.get() has no baseURL, so a
// relative path throws "Invalid URL". Prepend the host explicitly.
const GC_API = 'https://connectapi.garmin.com';
const summaryCache = new Map();
async function dailySummary(client, displayName, ymd) {
  if (summaryCache.has(ymd)) return summaryCache.get(ymd);
  const url =
    `${GC_API}/usersummary-service/usersummary/daily/${displayName}` +
    `?calendarDate=${ymd}`;
  const p = client.get(url);
  summaryCache.set(ymd, p);
  return p;
}

/**
 * Intensity ("active") minutes for a day = moderate + vigorous intensity
 * minutes — Garmin's analogue of the old "active minutes" tile. Returns null if
 * neither field is present (vs a genuine recorded 0, which we keep).
 */
async function fetchActiveMinutes(summary) {
  const moderate = Number(summary?.moderateIntensityMinutes) || 0;
  const vigorous = Number(summary?.vigorousIntensityMinutes) || 0;
  if (
    summary?.moderateIntensityMinutes == null &&
    summary?.vigorousIntensityMinutes == null
  ) {
    throw new Error('no intensity-minutes fields in daily summary');
  }
  return moderate + vigorous;
}

/**
 * Calories for a day. The watch's 🔥 figure is total kilocalories; fall back to
 * active if total is absent. Returned rounded to a whole kcal.
 */
function fetchCalories(summary) {
  const total = Number(summary?.totalKilocalories);
  if (Number.isFinite(total)) return Math.round(total);
  const active = Number(summary?.activeKilocalories);
  if (Number.isFinite(active)) return Math.round(active);
  throw new Error('no kilocalories fields in daily summary');
}

/** Resting HR for a day (field on the daily heart-rate payload). */
async function fetchRestingHr(client, date) {
  const hr = await client.getHeartRate(date);
  return hr?.restingHeartRate;
}

/**
 * Weather + sun times from Open-Meteo (no API key). Returns { weather, sun } or
 * { weather: null, sun: null } on any failure. sunrise/sunset stored as local
 * HH:MM; sunriseTomorrow lets the client show tomorrow's sunrise after tonight's
 * sunset without waiting for the next bake.
 */
async function fetchWeather() {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=temperature_2m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset` +
    `&forecast_days=3&timezone=${encodeURIComponent(TZ)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();

    // "2026-08-26T20:12" (local) → "20:12".
    const hhmm = (iso) =>
      typeof iso === 'string' && iso.includes('T') ? iso.slice(11, 16) : null;

    const d = j.daily ?? {};
    const forecast = (d.time ?? []).map((date, i) => ({
      date,
      hiC: round(d.temperature_2m_max?.[i]),
      loC: round(d.temperature_2m_min?.[i]),
      code: intOrNull(d.weather_code?.[i]),
    }));

    const weather = {
      tempC: round(j.current?.temperature_2m),
      code: intOrNull(j.current?.weather_code),
      forecast,
    };
    const sun = {
      sunrise: hhmm(d.sunrise?.[0]),
      sunset: hhmm(d.sunset?.[0]),
      sunriseTomorrow: hhmm(d.sunrise?.[1]),
    };
    return { weather, sun };
  } catch (err) {
    console.warn(`⚠️  weather/sun unavailable: ${err.message}`);
    return { weather: null, sun: null };
  }
}

const round = (n) => (Number.isFinite(Number(n)) ? Math.round(Number(n)) : null);
const intOrNull = (n) => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : null);

async function main() {
  const days = recentDays(HISTORY_DAYS);
  const today = days[days.length - 1];

  console.log('Loading Garmin token bundle…');
  // The constructor requires a truthy credentials object even for token-only
  // use (it throws "Missing credentials" otherwise). loadToken() never reads
  // these fields, so an empty placeholder is enough — no real password in CI.
  const client = new GarminConnect({ username: '', password: '' });
  client.loadToken(bundle.oauth1, bundle.oauth2);

  const profile = await client.getUserProfile();
  const displayName = profile?.displayName;
  if (!displayName) throw new Error('no displayName on user profile');

  console.log(
    `Fetching Garmin data for ${days.map((d) => d.ymd).join(', ')} + weather…`,
  );

  // Per-day metrics for the whole history window, plus weather, all in parallel.
  const [perDay, { weather, sun }] = await Promise.all([
    Promise.all(
      days.map(async ({ ymd, date }) => {
        const summary = await safeMetric('daily summary', () =>
          dailySummary(client, displayName, ymd),
        );
        const [steps, activeMinutes, calories, restingHeartRate] =
          await Promise.all([
            safeMetric(`steps ${ymd}`, () => client.getSteps(date)),
            safeMetric(`activeMinutes ${ymd}`, () =>
              fetchActiveMinutes(summary),
            ),
            safeMetric(`calories ${ymd}`, () => fetchCalories(summary)),
            safeMetric(`restingHeartRate ${ymd}`, () =>
              fetchRestingHr(client, date),
            ),
          ]);
        return { date: ymd, steps, activeMinutes, calories, restingHeartRate };
      }),
    ),
    fetchWeather(),
  ]);

  const todayMetrics = perDay[perDay.length - 1];

  // 3-day histories as {date, value} for the drill-down graphs (oldest first).
  const history = {
    steps: perDay.map((d) => ({ date: d.date, value: d.steps })),
    calories: perDay.map((d) => ({ date: d.date, value: d.calories })),
    restingHeartRate: perDay.map((d) => ({
      date: d.date,
      value: d.restingHeartRate,
    })),
  };

  const payload = {
    fetchedAt: new Date().toISOString(),
    date: today.ymd,
    steps: todayMetrics.steps,
    activeMinutes: todayMetrics.activeMinutes,
    restingHeartRate: todayMetrics.restingHeartRate,
    calories: todayMetrics.calories,
    history,
    weather,
    sun,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Wrote ${OUT}: ${payload.steps ?? '—'} steps, ${payload.activeMinutes ?? '—'} active min, ` +
      `${payload.calories ?? '—'} kcal, ${payload.restingHeartRate ?? '—'} bpm, ` +
      `weather ${weather?.tempC ?? '—'}°`,
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
