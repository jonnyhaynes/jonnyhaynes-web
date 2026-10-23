import { useEffect, useState } from 'react';

import type { HealthData, HistoryPoint } from '../data/health';
import {
  CloudIcon,
  FlameIcon,
  FootstepsIcon,
  HeartIcon,
  SunEventIcon,
} from './bits';

type View = 'face' | 'forecast' | 'sun' | 'analog' | 'cal' | 'steps' | 'hr';

type Bar = { value: string; height: number; today: boolean; day: string };

const pad = (n: number) => String(n).padStart(2, '0');

const FALLBACK = {
  temp: 9,
  condition: 'Cloudy',
  forecast: [
    { day: 'TODAY', hi: 11, lo: 7 },
    { day: 'FRI', hi: 14, lo: 8 },
    { day: 'SAT', hi: 12, lo: 8 },
  ],
  rise: '07:45',
  set: '17:53',
  calories: [
    { day: 'TUE', v: 2345 },
    { day: 'WED', v: 2448 },
    { day: 'THU', v: 696 },
  ],
  steps: [
    { day: 'TUE', v: 3135 },
    { day: 'WED', v: 4487 },
    { day: 'THU', v: 13 },
  ],
  hr: 57,
  synced: '10:01',
};

const WEEKDAY = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
};

function weatherLabel(code: number | null | undefined): string {
  if (code === null || code === undefined) return '';
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if (code <= 48) return 'Fog';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain';
  if (code <= 86) return 'Snow';
  return 'Thunderstorm';
}

function minutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function nextSun(
  sun: HealthData['sun'],
  now: Date,
): { time: string; dir: 'up' | 'down' } | null {
  if (!sun) return null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const rise = minutes(sun.sunrise);
  const set = minutes(sun.sunset);
  if (rise !== null && nowMin < rise) return { time: sun.sunrise!, dir: 'up' };
  if (set !== null && nowMin < set) return { time: sun.sunset!, dir: 'down' };
  if (sun.sunriseTomorrow) return { time: sun.sunriseTomorrow, dir: 'up' };
  if (sun.sunrise) return { time: sun.sunrise, dir: 'up' };
  return null;
}

function barsFor(points: HistoryPoint[] | undefined, fallback: { day: string; v: number }[]): Bar[] {
  const values =
    points && points.length
      ? points.slice(-3).map((p) => ({ day: WEEKDAY(p.date), v: p.value ?? 0 }))
      : fallback;
  const max = Math.max(...values.map((v) => v.v), 1);
  return values.map((v, i) => ({
    value: v.v.toLocaleString('en-GB'),
    height: Math.max(4, Math.round((v.v / max) * 46)),
    today: i === values.length - 1,
    day: v.day,
  }));
}

const hand = (deg: number, width: number, length: number, colour: string) =>
  ({
    width: `${width}px`,
    height: `${length}px`,
    marginLeft: `${-width / 2}px`,
    background: colour,
    transform: `rotate(${deg}deg)`,
  }) as const;

/** The watch object: a real local clock with the site's old glance drill-downs. */
export function Watch({ data, motion }: { data: HealthData | null; motion: boolean }) {
  const [view, setView] = useState<View>('face');
  const [screenOn, setScreenOn] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setNow((prev) => {
        const next = new Date();
        const changed = motion
          ? Math.floor(next.getTime() / 1000) !== Math.floor(prev.getTime() / 1000)
          : next.getMinutes() !== prev.getMinutes() ||
            next.getHours() !== prev.getHours() ||
            next.getDate() !== prev.getDate();
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [motion]);

  const shown = screenOn ? view : 'off';

  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());

  const date = `${now
    .toLocaleDateString('en-GB', { weekday: 'short' })
    .toUpperCase()} ${now.getDate()}`;

  const weather = data?.weather ?? null;
  const temp = weather?.tempC ?? FALLBACK.temp;
  const condition = weatherLabel(weather?.code) || FALLBACK.condition;
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const forecast =
    weather?.forecast?.length
      ? weather.forecast.slice(0, 3).map((day) => ({
          day: day.date === today ? 'TODAY' : WEEKDAY(day.date),
          hi: day.hiC,
          lo: day.loC,
        }))
      : FALLBACK.forecast;
  const sun = nextSun(data?.sun, now);
  const rise = data?.sun?.sunrise ?? FALLBACK.rise;
  const set = data?.sun?.sunset ?? FALLBACK.set;
  const calories = barsFor(data?.history?.calories, FALLBACK.calories);
  const steps = barsFor(data?.history?.steps, FALLBACK.steps);
  const hr = data?.restingHeartRate ?? FALLBACK.hr;
  const synced = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : FALLBACK.synced;

  const calToday = calories[calories.length - 1];
  const stepsToday = steps[steps.length - 1];
  const bars = view === 'cal' ? calories : steps;

  const hands = {
    hour: hand(((now.getHours() % 12) + now.getMinutes() / 60) * 30, 5, 46, '#FFFFFF'),
    minute: hand((now.getMinutes() + now.getSeconds() / 60) * 6, 3, 70, '#FFFFFF'),
    second: hand(now.getSeconds() * 6, 2, 76, 'var(--yellow)'),
  };

  return (
    <>
      <span className="wstrap top" aria-hidden="true" />
      <div className="wcase">
        <button
          type="button"
          className="crown"
          aria-label={screenOn ? 'Turn watch screen off' : 'Turn watch screen on'}
          onClick={() => {
            setScreenOn((on) => !on);
            setView('face');
          }}
        />
        <div className={`wface${shown === 'off' ? ' off' : ''}`} aria-live="polite">
          {shown === 'face' && (
            <div className="wv">
              <span className="wc mono wdate">{date}</span>
              <div className="wc wrow wrow-top">
                <button
                  type="button"
                  className="wbtn"
                  aria-label={`Weather, ${temp}°, ${condition}. Show 3-day forecast`}
                  onClick={() => setView('forecast')}
                >
                  <CloudIcon />
                  {temp}°
                </button>
                <button
                  type="button"
                  className="wbtn"
                  aria-label={`Next ${sun?.dir === 'up' ? 'sunrise' : 'sunset'} at ${
                    sun?.time ?? set
                  }. Show sun times`}
                  onClick={() => setView('sun')}
                >
                  {sun?.time ?? set}
                  <SunEventIcon />
                </button>
              </div>
              <button
                type="button"
                className="wc wbtn wtime"
                aria-label={`Time ${hh}:${mm}. Show analogue clock`}
                onClick={() => setView('analog')}
              >
                {hh}
                <span className="colon">:</span>
                <em>{mm}</em>
                {motion && <small aria-hidden="true">{ss}</small>}
              </button>
              <div className="wc wrow wrow-bottom">
                <button
                  type="button"
                  className="wbtn"
                  aria-label={`Calories, ${calToday.value} kilocalories. Show last 3 days`}
                  onClick={() => setView('cal')}
                >
                  <FlameIcon />
                  {calToday.value}
                </button>
                <button
                  type="button"
                  className="wbtn"
                  aria-label={`Steps, ${stepsToday.value}. Show last 3 days`}
                  onClick={() => setView('steps')}
                >
                  {stepsToday.value}
                  <FootstepsIcon />
                </button>
              </div>
              <button
                type="button"
                className="wc wbtn whr"
                aria-label={`Resting heart rate ${hr} beats per minute. Show more`}
                onClick={() => setView('hr')}
              >
                <HeartIcon />
                {hr}
              </button>
            </div>
          )}

          {shown === 'analog' && (
            <button
              type="button"
              className="wv analog"
              aria-label={`Analogue clock showing ${hh}:${mm}. Press to go back to the watch face`}
              onClick={() => setView('face')}
            >
              <span className="ticks" aria-hidden="true" />
              <span className="hand" aria-hidden="true" style={hands.hour} />
              <span className="hand" aria-hidden="true" style={hands.minute} />
              {motion && <span className="hand" aria-hidden="true" style={hands.second} />}
              <span className="pin" aria-hidden="true" />
            </button>
          )}

          {(shown === 'forecast' ||
            shown === 'sun' ||
            shown === 'cal' ||
            shown === 'steps' ||
            shown === 'hr') && (
            <div className="wv wdet">
              <span className="wtitle">
                <button
                  type="button"
                  className="wback"
                  aria-label="Back to watch face"
                  onClick={() => setView('face')}
                >
                  ‹
                </button>
                {shown === 'forecast' && 'FORECAST'}
                {shown === 'sun' && 'SUN'}
                {shown === 'cal' && 'CALORIES · 3 DAYS'}
                {shown === 'steps' && 'STEPS · 3 DAYS'}
                {shown === 'hr' && 'RESTING HR'}
              </span>

              {shown === 'forecast' && (
                <div className="wlist">
                  {forecast.map((day) => (
                    <span key={day.day} className="wline">
                      <span>{day.day}</span>
                      <span>
                        {day.hi ?? '—'}° <span className="dim">{day.lo ?? '—'}°</span>
                      </span>
                    </span>
                  ))}
                </div>
              )}

              {shown === 'sun' && (
                <div className="wsun">
                  <span>
                    {rise}
                    <small>↑ RISE</small>
                  </span>
                  <span>
                    {set}
                    <small>↓ SET</small>
                  </span>
                </div>
              )}

              {(shown === 'cal' || shown === 'steps') && (
                <div className="bars">
                  {bars.map((bar) => (
                    <span key={bar.day} className="bar">
                      <span>{bar.value}</span>
                      <i
                        className={bar.today ? 'today' : ''}
                        style={{ height: `${bar.height}px` }}
                      />
                      <span>{bar.day}</span>
                    </span>
                  ))}
                </div>
              )}

              {shown === 'hr' && (
                <div className="whrbig">
                  <span>{hr}</span>
                  <span className="mono">BPM · RESTING · {date.split(' ')[0]}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <span className="wstrap bottom" aria-hidden="true" />
      <p className="synced">
        <i aria-hidden="true" />
        SYNCED {synced}
      </p>
    </>
  );
}
