import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useHealthData } from '../data/health';
import type { HistoryPoint } from '../data/health';
import { useReducedMotion } from '../lib/useReducedMotion';
import { copy } from '../theme/copy';
import { useTheme } from '../theme/useTheme';
import { SectionHeading } from './SectionHeading';

/* ───────────────────────────────────────────────────────────────────────────
 * Health — a light-touch personality widget dressed as Jonny's real Garmin
 * fēnix watch face (see docs/plans/health-watch-face-v2.md). The home face
 * mirrors the physical watch, top → bottom:
 *
 *     WED 26                         date
 *     ☁ 18°     20:12 ↓             weather · next sun event
 *          11:40                     time (live)
 *     🔥 1127     8421 🏃           calories · steps
 *          ❤ 62                     resting heart rate
 *
 * Every zone is a real <button>. Clicking one morphs the whole face into an
 * in-face "glance" (a Garmin widget-glance): a 3-day forecast, both sun times,
 * an analog clock, or a 3-day mini graph. Tapping the glance, pressing Escape,
 * or the ‹ back chip returns home. A polite live region announces each change.
 * The crown is a real power button that turns the screen off/on.
 *
 * Graceful degradation: renders nothing if the fetch failed (data null). If the
 * data loaded but every metric is null, shows a quiet rest-day state. Individual
 * null metrics show an em-dash; glances whose data is missing don't open.
 * ─────────────────────────────────────────────────────────────────────────── */

/** en-GB number formatting; em-dash for a missing metric (never "0"). */
function fmt(n: number | null | undefined, digits = 0): string {
  return n === null || n === undefined
    ? '—'
    : n.toLocaleString('en-GB', { maximumFractionDigits: digits });
}

/** "HH:MM" (local) from the bake timestamp, or null if unparseable. */
function syncedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** Weekday + day-of-month for the date row, e.g. "WED 26". */
function faceDate(iso: string | undefined): string {
  const d = iso ? new Date(`${iso}T00:00:00`) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const wd = d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
  return `${wd} ${d.getDate()}`;
}

/** Short weekday for a history/forecast date, e.g. "Mon". */
function shortDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { weekday: 'short' });
}

/** "HH:MM" → minutes since local midnight, or null. */
function toMinutes(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * The NEXT sun event relative to `nowMin` (minutes since local midnight):
 * sunrise (↑) before dawn, sunset (↓) during the day, else tomorrow's sunrise
 * (↑). Mirrors the real watch, which flips the instant an event passes.
 */
function nextSunEvent(
  sun: { sunrise: string | null; sunset: string | null; sunriseTomorrow: string | null } | null | undefined,
  nowMin: number,
): { time: string; dir: 'up' | 'down' } | null {
  if (!sun) return null;
  const rise = toMinutes(sun.sunrise);
  const set = toMinutes(sun.sunset);
  if (rise !== null && nowMin < rise) return { time: sun.sunrise!, dir: 'up' };
  if (set !== null && nowMin < set) return { time: sun.sunset!, dir: 'down' };
  if (sun.sunriseTomorrow) return { time: sun.sunriseTomorrow, dir: 'up' };
  // After sunset with no tomorrow value: fall back to today's sunrise label.
  if (sun.sunrise) return { time: sun.sunrise, dir: 'up' };
  return null;
}

/* ── Weather-code → icon + label (WMO codes, grouped) ────────────────────── */

function weatherKind(code: number | null | undefined) {
  if (code === null || code === undefined) return null;
  if (code === 0) return 'clear' as const;
  if (code <= 2) return 'partly' as const;
  if (code === 3) return 'cloud' as const;
  if (code <= 48) return 'fog' as const;
  if (code <= 67) return 'rain' as const;
  if (code <= 77) return 'snow' as const;
  if (code <= 82) return 'rain' as const;
  if (code <= 86) return 'snow' as const;
  return 'storm' as const;
}

const WEATHER_LABEL: Record<string, string> = {
  clear: 'Clear',
  partly: 'Partly cloudy',
  cloud: 'Cloudy',
  fog: 'Fog',
  rain: 'Rain',
  snow: 'Snow',
  storm: 'Thunderstorm',
};

function WeatherIcon({ code }: { code: number | null | undefined }) {
  const kind = weatherKind(code);
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const cloud = <path d="M6.5 18a3.5 3.5 0 0 1 0-7 4.5 4.5 0 0 1 8.7-1.4A3.8 3.8 0 0 1 18 17H6.5z" />;
  switch (kind) {
    case 'clear':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      );
    case 'partly':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="8" cy="8" r="3" />
          <path d="M8 2.5v1.5M2.5 8H4M12.5 3.5l-1 1M3.5 12.5l1-1" />
          {cloud}
        </svg>
      );
    case 'fog':
      return (
        <svg {...common} aria-hidden="true">
          {cloud}
          <path d="M4 21h16M6 18.5h12" />
        </svg>
      );
    case 'rain':
      return (
        <svg {...common} aria-hidden="true">
          {cloud}
          <path d="M8 20l-1 2M12 20l-1 2M16 20l-1 2" />
        </svg>
      );
    case 'snow':
      return (
        <svg {...common} aria-hidden="true">
          {cloud}
          <path d="M8 20.5v.01M12 21v.01M16 20.5v.01" />
        </svg>
      );
    case 'storm':
      return (
        <svg {...common} aria-hidden="true">
          {cloud}
          <path d="M12 19l-2 3h3l-2 3" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden="true">
          {cloud}
        </svg>
      );
  }
}

/* ── Small inline glyphs ─────────────────────────────────────────────────── */

const StepsIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="7" cy="9" rx="2.4" ry="3.4" />
    <path d="M4.7 13.5c0 1.6.9 2.6 2.3 2.6s2.3-1 2.3-2.6" />
    <ellipse cx="16.5" cy="14" rx="2.4" ry="3.4" />
    <path d="M14.2 18.5c0 1.6.9 2.6 2.3 2.6s2.3-1 2.3-2.6" />
  </svg>
);

const FlameIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.6.8-2.9 1.6-3.8C9.2 9 9 10.4 10 11c0-2.3.8-5.5 2-8z" />
  </svg>
);

const HeartGlyph = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 21S3 14.6 3 8.7C3 5.6 5.3 3.5 8 3.5c1.6 0 3.1.9 4 2.3.9-1.4 2.4-2.3 4-2.3 2.7 0 5 2.1 5 5.2C21 14.6 12 21 12 21z" />
  </svg>
);

/* ── Glances ─────────────────────────────────────────────────────────────── */

type Glance = 'weather' | 'sun' | 'time' | 'calories' | 'steps' | 'hr' | null;

/** Header shown at the top of every glance: a ‹ back chip + a title. */
function GlanceHead({ title }: { title: string }) {
  return (
    <div className="wf-glance-head">
      <span className="wf-back" aria-hidden="true">
        ‹
      </span>
      <span className="wf-glance-title">{title}</span>
    </div>
  );
}

/** A 3-day mini bar chart (steps / calories). Values scaled to the max in view. */
function MiniBars({ points, colour }: { points: HistoryPoint[]; colour: string }) {
  const values = points.map((p) => p.value ?? 0);
  const max = Math.max(1, ...values);
  return (
    <div className="wf-bars">
      {points.map((p) => {
        const pct = p.value === null ? 0 : Math.round((p.value / max) * 100);
        return (
          <div className="wf-bar-col" key={p.date}>
            <div className="wf-bar-track">
              <div
                className="wf-bar-fill"
                style={{ height: `${pct}%`, background: colour } as CSSProperties}
              />
            </div>
            <span className="wf-bar-v">{p.value === null ? '—' : fmt(p.value)}</span>
            <span className="wf-bar-d">{shortDay(p.date)}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Resting-HR glance (design "A"): the latest BPM shown large with a small heart,
 * over a 3-day line graph with a soft accent area fill and day labels beneath.
 */
function HrArea({ points }: { points: HistoryPoint[] }) {
  const known = points
    .map((p) => p.value)
    .filter((v): v is number => v !== null);
  const min = known.length ? Math.min(...known) : 0;
  const max = known.length ? Math.max(...known) : 1;
  const span = Math.max(1, max - min);
  const W = 200;
  const H = 64;
  const pad = 10;
  const n = points.length;
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - ((v - min) / span) * (H - pad * 2) - pad;

  const coords = points.map((p, i) => (p.value === null ? null : { x: x(i), y: y(p.value) }));
  const drawn = coords.filter((c): c is { x: number; y: number } => c !== null);
  const line = drawn.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const area =
    drawn.length >= 2
      ? `M${drawn[0].x.toFixed(1)} ${H} ${drawn
          .map((c) => `L${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
          .join(' ')} L${drawn[drawn.length - 1].x.toFixed(1)} ${H} Z`
      : '';

  // Latest known reading = the "current" resting HR headline.
  const latest = [...points].reverse().find((p) => p.value !== null)?.value ?? null;

  return (
    <div className="wf-hrg">
      <div className="wf-hrg-cur">
        <span className="wf-hrg-heart" aria-hidden="true">
          {HeartGlyph}
        </span>
        <b>{fmt(latest)}</b>
        <span className="wf-hrg-u">bpm rest</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="wf-hrg-svg" aria-hidden="true">
        {area && <path d={area} className="wf-hrg-area" />}
        {line && <path d={line} className="wf-hrg-line" />}
        {drawn.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="2.6" className="wf-hrg-pt" />
        ))}
      </svg>
      <div className="wf-hrg-labels">
        {points.map((p) => (
          <span key={p.date}>{shortDay(p.date)}</span>
        ))}
      </div>
    </div>
  );
}

/** Live (or static) analog clock, hour/minute/second hands. */
function AnalogClock({ reduced }: { reduced: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (reduced) return; // static under reduced motion
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [reduced]);

  const s = now.getSeconds();
  const m = now.getMinutes();
  const h = now.getHours() % 12;
  const secDeg = s * 6;
  const minDeg = m * 6 + s * 0.1;
  const hourDeg = h * 30 + m * 0.5;
  const hand = (deg: number) => ({ transform: `rotate(${deg}deg)` }) as CSSProperties;

  return (
    <svg viewBox="0 0 100 100" className="wf-clock" aria-hidden="true">
      <circle cx="50" cy="50" r="46" className="wf-clock-face" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        const r1 = i % 3 === 0 ? 36 : 40;
        return (
          <line
            key={i}
            x1={50 + r1 * Math.sin(a)}
            y1={50 - r1 * Math.cos(a)}
            x2={50 + 44 * Math.sin(a)}
            y2={50 - 44 * Math.cos(a)}
            className={i % 3 === 0 ? 'wf-tick wf-tick--major' : 'wf-tick'}
          />
        );
      })}
      <g style={{ transformOrigin: '50px 50px' }}>
        <line x1="50" y1="50" x2="50" y2="26" className="wf-hand wf-hand--hour" style={hand(hourDeg)} />
        <line x1="50" y1="50" x2="50" y2="16" className="wf-hand wf-hand--min" style={hand(minDeg)} />
        {!reduced && (
          <line x1="50" y1="54" x2="50" y2="14" className="wf-hand wf-hand--sec" style={hand(secDeg)} />
        )}
      </g>
      <circle cx="50" cy="50" r="2.4" className="wf-clock-pin" />
    </svg>
  );
}

export function Health() {
  const data = useHealthData();
  const reduced = useReducedMotion();
  const { palette } = useTheme();

  const [powered, setPowered] = useState(true);
  const [glance, setGlance] = useState<Glance>(null);

  // Live "now": HH, MM, SS split out so the face shows ticking seconds (small,
  // like the real fēnix). Also drives nowMin for the next-sun-event flip. Ticks
  // per-second under motion; once a minute under reduced motion (no SS shown).
  const [t, setT] = useState(() => {
    const d = new Date();
    return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() };
  });
  const nowMin = t.h * 60 + t.m;
  const tick = useRef<number | undefined>(undefined);
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setT({ h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() });
    };
    update();
    tick.current = window.setInterval(update, reduced ? 30_000 : 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [reduced]);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hh = pad(t.h);
  const mm = pad(t.m);
  const ss = pad(t.s);

  if (!data) return null;

  const hasAny =
    data.steps !== null ||
    data.activeMinutes !== null ||
    data.restingHeartRate !== null ||
    data.calories !== null;

  const bpm = data.restingHeartRate;
  const beat = bpm && bpm > 0 ? `${(60 / bpm).toFixed(3)}s` : undefined;
  const synced = syncedAt(data.fetchedAt);
  const sunEvent = nextSunEvent(data.sun, nowMin);
  const weather = data.weather ?? null;
  const history = data.history ?? null;

  const closeGlance = () => setGlance(null);
  // Only open a glance if its backing data exists (else it'd be an empty face).
  const openGlance = (g: Exclude<Glance, null>, enabled: boolean) => () => {
    if (enabled) setGlance(g);
  };

  // Live-region text: screen state, or the open glance, or "home".
  const liveText = !powered
    ? 'Screen off'
    : glance
      ? `${glance} detail`
      : 'Watch face';

  const accent = 'var(--color-accent-start)';
  const accentDim = 'var(--color-accent-end)';
  const c = copy(palette).health;

  return (
    <section id="health" className="scroll-mt-16 py-16">
      <SectionHeading section="health" />
      <p className="mt-4 max-w-xl text-muted">{c.lead}</p>

      {!hasAny ? (
        <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
          <div className="watch" aria-hidden="true">
            <span className="watch-strap watch-strap--top" />
            <div className="watch-case">
              <span className="watch-crown-static" />
              <div className="watch-face">
                <div className="wf-off-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
            <span className="watch-strap watch-strap--bot" />
          </div>
          <p className="max-w-sm text-muted">
            <span className="font-medium text-foreground">Rest day.</span> The
            watch is off the charger and there&rsquo;s nothing to report — which{' '}
            {c.restDay}
          </p>
        </div>
      ) : (
        <div className="mt-8 flex justify-center">
          <div className="watch">
            <span className="watch-strap watch-strap--top" />
            <div className="watch-case">
              {/* Crown — a real power button. */}
              <button
                type="button"
                className="watch-crown"
                aria-pressed={powered}
                aria-label={powered ? 'Turn watch screen off' : 'Turn watch screen on'}
                onClick={() => {
                  setPowered((on) => !on);
                  setGlance(null);
                }}
              />

              <div
                className={`watch-face${powered ? '' : ' watch-face--off'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && glance) {
                    e.stopPropagation();
                    closeGlance();
                  }
                }}
              >
                {!powered && (
                  <span className="watch-standby" aria-hidden="true">
                    Standby
                  </span>
                )}

                <div className={`watch-screen${glance ? ' watch-screen--glance' : ''}`}>
                  {glance === null ? (
                    /* ── HOME FACE — divider-separated bands, round face ── */
                    <div className="wf-home">
                      {/* Divider rules drawn as chords of the round face: wide
                          across the middle, short near the top/bottom edge —
                          matching the real fēnix. Positioned to land on the
                          grid row-lines below. */}
                      <svg
                        className="wf-dividers"
                        viewBox="0 0 300 300"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                      >
                        {/* Every rule is inset from the rim by the same margin,
                            so the top/bottom ones stay short and clear of the
                            bezel and the middle ones are wide but never touch —
                            following the circle like the real fēnix. */}
                        {[
                          58, // row 1 ↔ 2
                          106, // row 2 ↔ 3
                          194, // row 3 ↔ 4
                          242, // row 4 ↔ 5
                        ].map((y) => {
                          const half = Math.sqrt(Math.max(0, 150 * 150 - (y - 150) ** 2));
                          const inset = 12; // consistent gap from the round edge
                          return (
                            <line
                              key={y}
                              x1={150 - half + inset}
                              x2={150 + half - inset}
                              y1={y}
                              y2={y}
                              className="wf-divider"
                            />
                          );
                        })}
                      </svg>

                      {/* date */}
                      <div className="wf-band wf-band--date">
                        <span className="wf-date">{faceDate(data.date)}</span>
                      </div>

                      {/* weather · next sun event */}
                      <div className="wf-band wf-band--wx">
                        <button
                          type="button"
                          className={`wf-zone wf-zone--weather${weather ? '' : ' wf-zone--dead'}`}
                          onClick={openGlance('weather', !!weather?.forecast?.length)}
                          aria-label={
                            weather?.tempC != null
                              ? `Weather, ${fmt(weather.tempC)} degrees, ${WEATHER_LABEL[weatherKind(weather.code) ?? ''] ?? ''}. Show 3-day forecast.`
                              : 'Weather unavailable'
                          }
                        >
                          <span className="wf-wx-ic" style={{ color: accent } as CSSProperties}>
                            <WeatherIcon code={weather?.code} />
                          </span>
                          <span className="wf-wx-t">{fmt(weather?.tempC)}°</span>
                        </button>

                        <span className="wf-vrule" aria-hidden="true" />

                        <button
                          type="button"
                          className={`wf-zone wf-zone--sun${sunEvent ? '' : ' wf-zone--dead'}`}
                          onClick={openGlance('sun', !!(data.sun && (data.sun.sunrise || data.sun.sunset)))}
                          aria-label={
                            sunEvent
                              ? `Next ${sunEvent.dir === 'up' ? 'sunrise' : 'sunset'} at ${sunEvent.time}. Show sun times.`
                              : 'Sun times unavailable'
                          }
                        >
                          <span className="wf-sun-t">{sunEvent ? sunEvent.time : '—'}</span>
                          <span className="wf-sun-arrow" aria-hidden="true">
                            {sunEvent ? (sunEvent.dir === 'up' ? '↑' : '↓') : ''}
                          </span>
                        </button>
                      </div>

                      {/* time (hero band) */}
                      <div className="wf-band wf-band--time">
                        <button
                          type="button"
                          className="wf-zone wf-time"
                          onClick={openGlance('time', true)}
                          aria-label={`Time ${hh}:${mm}. Show analog clock.`}
                        >
                          <span className="wf-time-v">
                            {hh}
                            <span className="wf-time-colon">:</span>
                            <span className="wf-time-min">{mm}</span>
                            {!reduced && <span className="wf-time-sec">{ss}</span>}
                          </span>
                        </button>
                      </div>

                      {/* calories · steps */}
                      <div className="wf-band wf-band--stats">
                        <button
                          type="button"
                          className={`wf-zone wf-zone--cal${history?.calories?.length ? '' : ' wf-zone--dead'}`}
                          onClick={openGlance('calories', !!history?.calories?.length)}
                          aria-label={`Calories, ${fmt(data.calories)} kcal. Show last 3 days.`}
                        >
                          <span className="wf-mini-ic" style={{ color: accent } as CSSProperties}>
                            {FlameIcon}
                          </span>
                          <span className="wf-mini-v">{fmt(data.calories)}</span>
                        </button>

                        <span className="wf-vrule" aria-hidden="true" />

                        <button
                          type="button"
                          className={`wf-zone wf-zone--steps${history?.steps?.length ? '' : ' wf-zone--dead'}`}
                          onClick={openGlance('steps', !!history?.steps?.length)}
                          aria-label={`Steps, ${fmt(data.steps)}. Show last 3 days.`}
                        >
                          <span className="wf-mini-v">{fmt(data.steps)}</span>
                          <span className="wf-mini-ic" style={{ color: accent } as CSSProperties}>
                            {StepsIcon}
                          </span>
                        </button>
                      </div>

                      {/* resting heart rate (where battery % is on the real face) */}
                      <div className="wf-band wf-band--hr">
                        <button
                          type="button"
                          className={`wf-zone wf-hr${history?.restingHeartRate?.length ? '' : ' wf-zone--dead'}`}
                          onClick={openGlance('hr', !!history?.restingHeartRate?.length)}
                          aria-label={
                            bpm != null
                              ? `Resting heart rate ${bpm} bpm. Show last 3 days.`
                              : 'Resting heart rate unavailable'
                          }
                        >
                          <span
                            className="wf-hr-heart"
                            style={
                              !reduced && beat ? ({ '--beat': beat } as CSSProperties) : undefined
                            }
                          >
                            {HeartGlyph}
                          </span>
                          <span className="wf-hr-v">{fmt(bpm)}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── GLANCE (in-face swap) ─────────────────────────── */
                    <button
                      type="button"
                      className="wf-glance"
                      onClick={closeGlance}
                      aria-label="Back to watch face"
                    >
                      {glance === 'weather' && weather && (
                        <>
                          <GlanceHead title="Forecast" />
                          <div className="wf-forecast">
                            {weather.forecast.slice(0, 3).map((day, i) => (
                              <div className="wf-fc-day" key={day.date}>
                                <span className="wf-fc-d">{i === 0 ? 'Today' : shortDay(day.date)}</span>
                                <span className="wf-fc-ic" style={{ color: accent } as CSSProperties}>
                                  <WeatherIcon code={day.code} />
                                </span>
                                <span className="wf-fc-t">
                                  <b>{fmt(day.hiC)}°</b>
                                  <em>{fmt(day.loC)}°</em>
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {glance === 'sun' && data.sun && (
                        <>
                          <GlanceHead title="Sun" />
                          <SunGlance
                            sunrise={data.sun.sunrise}
                            sunset={data.sun.sunset}
                            nowMin={nowMin}
                          />
                        </>
                      )}

                      {glance === 'time' && (
                        // No title — the clock fills the whole face.
                        <AnalogClock reduced={reduced} />
                      )}

                      {glance === 'calories' && history?.calories && (
                        <>
                          <GlanceHead title="Calories · 3 days" />
                          <MiniBars points={history.calories} colour={accent} />
                        </>
                      )}

                      {glance === 'steps' && history?.steps && (
                        <>
                          <GlanceHead title="Steps · 3 days" />
                          <MiniBars points={history.steps} colour={accentDim} />
                        </>
                      )}

                      {glance === 'hr' && history?.restingHeartRate && (
                        <>
                          <GlanceHead title="Resting HR" />
                          <HrArea points={history.restingHeartRate} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <span className="watch-strap watch-strap--bot" />

            {synced && (
              <span className="wf-synced" aria-hidden="true">
                <span className="wf-synced-dot" />
                Synced {synced}
              </span>
            )}
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {liveText}
          </p>
        </div>
      )}
    </section>
  );
}

/**
 * Sun glance (design "A1"): a large day-arc with a night→gold→night gradient
 * stroke and a glowing sun marker at the current position between sunrise and
 * sunset. Sunrise/sunset times read out below.
 */
function SunGlance({
  sunrise,
  sunset,
  nowMin,
}: {
  sunrise: string | null;
  sunset: string | null;
  nowMin: number;
}) {
  const rise = toMinutes(sunrise);
  const set = toMinutes(sunset);
  // Fraction of daylight elapsed (0 at sunrise → 1 at sunset), clamped.
  let t = 0.5;
  if (rise !== null && set !== null && set > rise) {
    t = Math.min(1, Math.max(0, (nowMin - rise) / (set - rise)));
  }
  // Semicircle arc (180°..0°); bigger than v1 per the brief.
  const W = 208;
  const H = 116;
  const cx = W / 2;
  const cy = H - 10;
  const r = 90;
  const ang = Math.PI * (1 - t);
  const mx = cx + r * Math.cos(ang);
  const my = cy - r * Math.sin(ang);

  return (
    <div className="wf-sun">
      <svg viewBox={`0 0 ${W} ${H}`} className="wf-sun-svg" aria-hidden="true">
        <defs>
          <linearGradient id="wf-sun-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" className="wf-sun-grad-edge" />
            <stop offset="0.5" className="wf-sun-grad-peak" />
            <stop offset="1" className="wf-sun-grad-edge" />
          </linearGradient>
        </defs>
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} className="wf-sun-horizon" />
        <path
          d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          className="wf-sun-arc"
          fill="none"
          stroke="url(#wf-sun-grad)"
        />
        <circle cx={mx} cy={my} r="7.5" className="wf-sun-dot" />
      </svg>
      <div className="wf-sun-times">
        <span>
          <b>{sunrise ?? '—'}</b>↑ Rise
        </span>
        <span>
          <b>{sunset ?? '—'}</b>↓ Set
        </span>
      </div>
    </div>
  );
}
