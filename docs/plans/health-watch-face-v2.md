# Plan: Health watch — real watch-face v2 (Garmin fēnix face mimic)

**Status:** Approved & implemented (2026-08-26)
**Branch:** `migrate-google-health-to-garmin`
**Supersedes the layout in:** `docs/plans/health-watch-redesign.md` (rings-only face)

## Final decisions (as built)

Refined interactively after approval:

- **Face:** round screen (not squircle), five bands separated by SVG **chord
  dividers** — wide across the middle, short near the top/bottom rim, none
  touching the bezel — mirroring the real fēnix. Fills the vertical space.
- **Time:** live, ticking **seconds** shown baseline-aligned to the right (like
  the watch's small seconds), minutes in accent.
- **HR:** the bottom battery slot shows **resting HR** (heart + number, no "bpm").
- **Glances (all "fill the face"):** Forecast = day columns; Sun = large
  gradient day-arc (night→gold) + glowing sun marker; Time = full-face analog
  clock (no title); Calories/Steps = vertical bars; Resting HR = big current
  BPM over an area-filled 3-day line.
- **Theme:** bezel ring / face vignette / drop shadow tokenised
  (`--watch-bezel-ring`, `--watch-face-vignette`, `--watch-drop-shadow`) so the
  light theme reads as pale steel instead of getting a dark band round the face.
- **Removed:** the three activity rings and the `sleep` metric (face + fetch +
  JSON) — no zone for them on the photo face.
- **Cadence:** bake every 6h (`0 0,6,12,18` UTC).

## Goal

Redesign the Health section watch to mimic Jonny's *real* Garmin fēnix watch
face (photo provided), and make each zone interactive with an in-face drill-down.
Also add the new data the face needs (weather, sunrise/sunset, 3-day histories)
and increase the bake cadence to every 6 hours.

### Target face layout (top → bottom), mirroring the photo

```
            WED 26                 ← date (top)
     ☁ 18°     20:12 ↓            ← weather (temp) | sun (next sun event + arrow)
          11:40                    ← time (big, centre) + HR accent digits
     🔥 1127     506 🏃           ← calories/energy | steps
            ❤ 62                   ← heart rate (bottom; replaces "8% battery")
```

The real face shows battery % at the bottom. A website has no battery, so that
slot becomes **resting heart rate** (with a small heart), which the user
explicitly suggested. Calories map to Garmin's active/total kilocalories.

### Row-2 sun display: NEXT event, live, self-flipping

The `20:12 ↓` slot mimics the real fēnix: it shows the **next** sun event
relative to the current client time, not a fixed "today's sunset":

- Before today's sunrise → show **sunrise** time with **↑** (rising arrow).
- Between sunrise and sunset → show **sunset** time with **↓** (setting arrow).
- After today's sunset → show **tomorrow's sunrise** with **↑**.

The instant sunset passes, the display flips to the sunrise time and vice versa.
This is computed **client-side from `now`** (the baked data only supplies the
event times), and re-evaluated on a lightweight timer so it flips at the moment
of transition without waiting for the next 6-hour bake. Because it can need
*tomorrow's* sunrise after tonight's sunset, the baked `sun` object must carry
**today's sunrise + sunset AND tomorrow's sunrise** (Open-Meteo `forecast_days`
already returns multiple days, so this is free). Reduced-motion doesn't affect
correctness here — it's a data/time computation, not an animation; the timer is
a plain `setInterval` re-check (cheap, ~30s tick is enough) regardless.

## Interactions (in-face swap)

Clicking any zone morphs the whole face into a detail "glance", with a tap
(anywhere on the detail) or a back affordance returning to the main face. Every
zone is a real `<button>`; Enter/Space work; a polite live region announces the
active glance. The crown power button (existing behaviour) is kept.

Glances:

1. **Weather** → 3-day forecast (today + next 2): hi/lo temp, condition icon.
2. **Sun** → sunrise **and** sunset times for today, with a day-arc indicator
   showing the current position (from `now`) between them. Row-2 shows only the
   *next* event; this glance shows both.
3. **Time** → analog clock face: hour/minute/second hands drawn in SVG, ticking
   live client-side (respects reduced motion → static hands at load time).
4. **Calories** → last 3 days of energy as small bars.
5. **Steps** → last 3 days of steps as small bars.
6. **Heart rate** → last 3 days of resting HR as a small line/sparkline graph.

Return: tapping the detail glance, pressing Escape, or a small ‹ back chip.

## Data pipeline changes

### New/changed fields in `public/data/health.json`

Current payload keeps `fetchedAt`, `date`, `steps`, `activeMinutes`,
`sleepHours`, `restingHeartRate` (unchanged, still consumed by nothing-breaks
degradation). Add:

```jsonc
{
  "fetchedAt": "…",
  "date": "2026-08-26",
  // existing single-day metrics (kept)
  "steps": 8421,
  "activeMinutes": 43,
  "restingHeartRate": 62,
  // (sleepHours removed — no zone on the new face)
  // NEW single-day
  "calories": 2431,              // total (or active) kcal for the day, nullable
  // NEW 3-day histories (most-recent-last), each entry {date, value|null}
  "history": {
    "steps":    [ {"date":"2026-08-24","value":9002}, … 3 entries ],
    "calories": [ … 3 ],
    "restingHeartRate": [ … 3 ]
  },
  // NEW weather + sun (Open-Meteo, Rotherham UK), all nullable
  "weather": {
    "tempC": 18,
    "code": 3,                   // WMO weather code → icon mapping in component
    "forecast": [                // today + next 2 days
      {"date":"2026-08-26","hiC":19,"loC":11,"code":3},
      {"date":"2026-08-27","hiC":17,"loC":10,"code":61},
      {"date":"2026-08-28","hiC":20,"loC":12,"code":1}
    ]
  },
  // today's sunrise+sunset AND tomorrow's sunrise, so the row-2 "next event"
  // display can flip to tomorrow's sunrise after tonight's sunset without
  // waiting for the next bake. Local HH:MM, all nullable.
  "sun": {
    "sunrise": "05:58",
    "sunset": "20:12",
    "sunriseTomorrow": "06:00"
  }
}
```

All new fields are independently nullable and the component degrades per-zone
(em-dash / hidden glance) exactly like today — **graceful degradation is
preserved**.

### `scripts/fetch-health.mjs`

- **Garmin (existing auth, unchanged):** keep steps / activeMinutes /
  restingHeartRate; **drop the sleep fetch** (`getSleepDuration`) and the
  `sleepHours` payload field. Add **calories** (daily summary `totalKilocalories` or
  `activeKilocalories` — pick whichever matches the watch's 🔥 number; verify
  against real data) and **3-day histories** by fetching the last 3 calendar
  days for steps, calories, resting HR (loop `getSteps(date)` etc. over 3 dates,
  each wrapped in `safeMetric` so a missing day → null entry).
- **Open-Meteo (new, no key):** one `fetch()` to
  `https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset&forecast_days=3&timezone=Europe/London`
  with Rotherham UK coords (`53.43, -1.36`) as module constants. Wrapped so a
  weather-API failure nulls `weather`/`sun` but never fails the bake.
  `daily.sunrise[0]`/`sunset[0]` = today, `sunrise[1]` = tomorrow (all local per
  `timezone=Europe/London`) → the three `sun` fields. Store as local `HH:MM`;
  the client compares against `now`'s local wall-clock time to pick the next
  event (before-sunrise → sunrise↑, before-sunset → sunset↓, else tomorrow's
  sunrise↑), so no timezone maths is needed in the browser.
- Token-rotation + bundle-print logic unchanged.

### `src/data/health.ts`

Extend `HealthData` type with the new optional fields (`calories`, `history`,
`weather`, `sun`), all `| null`/optional, and **remove `sleepHours`** from the
type. Hook logic unchanged.

### `.github/workflows/bake-health-data.yml`

- Change cron `'0 8,20 * * *'` → **`'0 0,6,12,18 * * *'`** (every 6h: midnight,
  6am, midday, 6pm UTC). Update the header comment ("twice daily" → "every 6
  hours"). No new secrets (Open-Meteo is keyless). Everything else unchanged.

## Component changes — `src/components/Health.tsx` + `src/index.css`

- Rework the face from rings-centric to the **6-zone photo layout** above. The
  three activity rings are **removed** (decided) — the face is a clean digital
  layout matching the photo, no bezel arc. `RINGS`/`Ring`/ring CSS + the
  ring-sweep `play` state are deleted; the removed ring goals constant goes too.
  **`sleepHours` is removed entirely** (decided) — from the face, the fetch
  script, and the JSON payload. No sleep zone exists on the photo face.
- Each zone → a `<button>` that sets `activeGlance` state; the face body
  conditionally renders either the **home layout** or the selected **glance**.
- Analog clock: SVG, `setInterval(1s)` for the second hand under motion; static
  under `useReducedMotion()`. Cleared on unmount / when glance closes.
- WMO weather-code → inline SVG icon map (sun / cloud / rain / snow / fog), a
  small `weatherIcon(code)` helper. No external icon deps.
- New CSS under the existing `Health — fitness-watch face` block: zone grid,
  glance transitions (fade/scale, motion-gated), mini bar charts, sparkline,
  analog hands. Reuse existing `--color-watch-*` tokens; keep light/dark parity.
- Keep: crown power button, `role=status` live region, all-null rest-day
  fallback, per-metric em-dash degradation.

## Decisions locked

- **Rings:** removed. Clean photo-accurate digital face.
- **Cadence:** `0 0,6,12,18` UTC (kept as-is; 1h summer-local drift accepted).
- **Sun display:** row-2 shows the *next* sun event, computed client-side from
  `now`, flipping the instant sunset/sunrise passes (see above).

## Still to confirm against real data (Garmin auth blocked)

- **Calories field:** `totalKilocalories` vs `activeKilocalories` — confirm which
  matches the watch's 🔥 1127 figure once the token bundle is minted.

## Verification

- `npm run build` (tsc) + `npm run lint` green.
- Manually run `node scripts/fetch-health.mjs` with the token bundle once Garmin
  auth is unblocked (see `[[garmin-migration-parked]]`) to confirm real shapes
  for calories/history and that Open-Meteo returns Rotherham data.
- Visual check in `npm run dev`: each glance opens/closes by mouse + keyboard;
  reduced-motion disables clock ticking + transitions; all-null and
  partial-null payloads render without breaking.
- Screen-reader pass on the live region + button labels.

## Out of scope

- No new styling framework (Tailwind + index.css as today).
- No auth/pipeline changes beyond the fields + cron above.
- Not a general analytics layer — 3 days of history only, per scope boundaries.
```