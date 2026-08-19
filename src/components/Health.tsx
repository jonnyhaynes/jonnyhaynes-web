import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useHealthData } from '../data/health';
import { useReducedMotion } from '../lib/useReducedMotion';

/**
 * Daily goals the activity rings fill against. These are personal targets, not
 * from the Google Health API — a full ring means the goal was met for the day.
 */
const GOALS = { steps: 10_000, activeMinutes: 60, sleepHours: 8 } as const;

/** Ring geometry (SVG user units), outermost → innermost. */
const RINGS = [
  { key: 'steps', r: 86, colour: '#a877bf' },
  { key: 'active', r: 68, colour: '#c79ad6' },
  { key: 'sleep', r: 50, colour: '#7a4988' },
] as const;

const circumference = (r: number) => 2 * Math.PI * r;

/** en-GB number formatting; em-dash for a missing metric (never "0"). */
function fmt(n: number | null, digits = 0): string {
  return n === null
    ? '—'
    : n.toLocaleString('en-GB', { maximumFractionDigits: digits });
}

/**
 * Steps formatting for the (small) complication slot: em-dash when missing,
 * comma-grouped up to 9,999, then compact "23k" once it hits five digits so a
 * big day doesn't overflow the corner. Rounds to one decimal in the compact
 * range only when it isn't a whole thousand (12.3k, but 23k not 23.0k).
 */
function fmtSteps(n: number | null): string {
  if (n === null) return '—';
  if (n < 10_000) return n.toLocaleString('en-GB');
  const k = n / 1000;
  const rounded = Math.round(k * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}k`;
}

/** Fraction 0–1 of a value toward its goal; 0 when the value is missing. */
function fill(value: number | null, goal: number): number {
  if (value === null) return 0;
  return Math.min(1, Math.max(0, value / goal));
}

/** "HH:MM" (local) from the bake timestamp, or null if unparseable. */
function syncedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** A ring stroke that sweeps to its fill on load (or shows final under reduced motion). */
function Ring({
  r,
  colour,
  filled,
  play,
  dim,
}: {
  r: number;
  colour: string;
  filled: number;
  play: boolean;
  dim: boolean;
}) {
  const len = circumference(r);
  return (
    <>
      {/* Track: the ring's own hue, dimmed via a theme-aware opacity token so it
          stays visible on both the dark OLED and the pale light-theme face. */}
      <circle
        className="watch-ring-track"
        cx="97"
        cy="97"
        r={r}
        fill="none"
        stroke={colour}
        strokeWidth="11"
      />
      <circle
        cx="97"
        cy="97"
        r={r}
        fill="none"
        stroke={colour}
        strokeWidth="11"
        strokeLinecap="round"
        className={`watch-ring${dim ? ' watch-ring--dim' : ''}`}
        style={{
          strokeDasharray: len,
          // Start empty, then reveal to the fill once `play` flips true so the
          // CSS transition animates. Reduced motion skips straight to the value.
          strokeDashoffset: play ? len * (1 - filled) : len,
        }}
      />
    </>
  );
}

/** One corner complication: an icon glyph + value, colour-keyed to its ring. */
function Complication({
  className,
  colour,
  icon,
  label,
  featured,
  children,
}: {
  className: string;
  colour: string;
  icon: React.ReactNode;
  label: string;
  featured: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`watch-comp ${className}${featured ? ' watch-comp--featured' : ''}`}
      style={{ color: colour } as CSSProperties}
      aria-label={label}
    >
      <span className="watch-comp-ic" aria-hidden="true">
        {icon}
      </span>
      <span className="watch-comp-v" aria-hidden="true">
        {children}
      </span>
    </div>
  );
}

const StepsIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <ellipse cx="7" cy="9" rx="2.4" ry="3.4" />
    <path d="M4.7 13.5c0 1.6.9 2.6 2.3 2.6s2.3-1 2.3-2.6" />
    <ellipse cx="16.5" cy="14" rx="2.4" ry="3.4" />
    <path d="M14.2 18.5c0 1.6.9 2.6 2.3 2.6s2.3-1 2.3-2.6" />
  </svg>
);

const ActiveIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </svg>
);

const SleepIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z" />
  </svg>
);

const HEART_PATH =
  'M16 28.5C16 28.5 2 20.4 2 10.2 2 5.1 5.9 1.5 10.3 1.5 12.9 1.5 15 3 16 5.1 17 3 19.1 1.5 21.7 1.5 26.1 1.5 30 5.1 30 10.2 30 20.4 16 28.5 16 28.5Z';

/**
 * The four things the watch can feature in the centre of the rings. Tapping the
 * screen advances through them; `hr` shows the pulsing heart, the others show a
 * big value + its goal and emphasise their own ring. `ring` names which ring to
 * keep lit (null = all lit, for HR).
 */
type FeatureKey = 'hr' | 'steps' | 'active' | 'sleep';
const FEATURES: readonly {
  key: FeatureKey;
  ring: 'steps' | 'active' | 'sleep' | null;
}[] = [
  { key: 'hr', ring: null },
  { key: 'steps', ring: 'steps' },
  { key: 'active', ring: 'active' },
  { key: 'sleep', ring: 'sleep' },
];

/**
 * Health section — a light-touch personality widget backed by the baked health
 * snapshot. The four daily metrics are dressed as a fitness watch to match the
 * page's other physical-object sections (Gaming's CRT, Reading's bookshelf):
 * three activity rings (steps / active / sleep) fill toward daily goals, and a
 * heart pulses at the resting rate in the centre with its BPM knocked out of the
 * heart shape.
 *
 * Interaction (mirrors Gaming's TV power + the Now Playing knob): the crown is a
 * real power button that turns the screen off/on; tapping the screen cycles which
 * metric is featured in the centre. Both are ordinary buttons — click, Enter and
 * Space all work — and each change is announced via a polite live region, so the
 * whole thing is keyboard- and screen-reader-navigable (no timing gestures).
 *
 * Graceful degradation: renders nothing if the fetch failed (data null). If the
 * data loaded but every metric is null (no successful bake), shows a quiet
 * rest-day state — empty rings, no pulse, no controls — rather than a
 * broken/blank section. Individual null metrics show an em-dash and an unfilled
 * ring.
 */
export function Health() {
  const data = useHealthData();
  const reduced = useReducedMotion();

  // Ring-sweep trigger. Under reduced motion `play` starts true so rings render
  // at their final fill immediately; otherwise it starts false (empty rings) and
  // flips on after mount via rAF so the CSS transition animates the sweep.
  const [play, setPlay] = useState(reduced);
  const raf = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (reduced) return;
    raf.current = requestAnimationFrame(() =>
      requestAnimationFrame(() => setPlay(true)),
    );
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [reduced]);

  // Which metric is featured in the centre, and whether the screen is powered.
  const [featureIndex, setFeatureIndex] = useState(0);
  const [powered, setPowered] = useState(true);

  if (!data) return null;

  const hasAny =
    data.steps !== null ||
    data.activeMinutes !== null ||
    data.sleepHours !== null ||
    data.restingHeartRate !== null;

  const bpm = data.restingHeartRate;
  // Beat period in seconds = 60 / bpm, so the heart pulses at the real rate.
  const beat = bpm && bpm > 0 ? `${(60 / bpm).toFixed(3)}s` : undefined;
  const synced = syncedAt(data.fetchedAt);

  const feature = FEATURES[featureIndex];
  const nextFeature = () =>
    setFeatureIndex((i) => (i + 1) % FEATURES.length);

  // Human-readable value + goal per feature, for the centre readout and the
  // live-region announcement.
  const readout: Record<
    FeatureKey,
    { label: string; value: string; unit?: string; goal: string; announce: string }
  > = {
    hr: {
      label: 'Resting HR',
      value: fmt(bpm),
      unit: 'bpm',
      goal: '',
      announce:
        bpm === null
          ? 'Resting heart rate unavailable'
          : `Resting heart rate ${bpm} bpm`,
    },
    steps: {
      label: 'Steps',
      value: fmt(data.steps),
      goal: `of ${GOALS.steps.toLocaleString('en-GB')} goal`,
      announce:
        data.steps === null
          ? 'Steps unavailable'
          : `Steps, ${fmt(data.steps)} of ${GOALS.steps.toLocaleString('en-GB')} goal`,
    },
    active: {
      label: 'Active',
      value: fmt(data.activeMinutes),
      unit: 'min',
      goal: `of ${GOALS.activeMinutes} min goal`,
      announce:
        data.activeMinutes === null
          ? 'Active minutes unavailable'
          : `Active, ${fmt(data.activeMinutes)} of ${GOALS.activeMinutes} minute goal`,
    },
    sleep: {
      label: 'Sleep',
      value: fmt(data.sleepHours, 1),
      unit: 'hrs',
      goal: `of ${GOALS.sleepHours} hr goal`,
      announce:
        data.sleepHours === null
          ? 'Sleep unavailable'
          : `Sleep, ${fmt(data.sleepHours, 1)} of ${GOALS.sleepHours} hour goal`,
    },
  };

  // The polite live-region text: what's featured now, or the screen state.
  const liveText = !powered ? 'Screen off' : readout[feature.key].announce;

  return (
    <section id="health" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // Life beyond the keyboard
      </h2>
      <p className="mt-4 max-w-xl text-muted">
        A day away from the compiler, more or less — pulled from my wearable.
      </p>

      {!hasAny ? (
        // Rest-day fallback: empty watch + a line. No pulse, no controls.
        <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
          <div className="watch" aria-hidden="true">
            <span className="watch-strap watch-strap--top" />
            <div className="watch-case">
              <span className="watch-crown-static" />
              <div className="watch-face">
                <div className="watch-dial">
                  <svg viewBox="0 0 194 194" className="watch-rings-svg">
                    {RINGS.map((ring) => (
                      <circle
                        key={ring.key}
                        className="watch-ring-track"
                        cx="97"
                        cy="97"
                        r={ring.r}
                        fill="none"
                        stroke={ring.colour}
                        strokeWidth="11"
                      />
                    ))}
                  </svg>
                </div>
              </div>
            </div>
            <span className="watch-strap watch-strap--bot" />
          </div>
          <p className="max-w-sm text-muted">
            <span className="font-medium text-foreground">Rest day.</span> The
            watch is off the charger and there&rsquo;s nothing to report — which
            is rather the point of a day beyond the keyboard.
          </p>
        </div>
      ) : (
        <div className="mt-8 flex justify-center">
          <div className="watch">
            <span className="watch-strap watch-strap--top" />
            <div className="watch-case">
              {/* Crown — a real power button (like Gaming's TV power). */}
              <button
                type="button"
                className="watch-crown"
                aria-pressed={powered}
                aria-label={powered ? 'Turn watch screen off' : 'Turn watch screen on'}
                onClick={() => setPowered((on) => !on)}
              />

              {/* Screen — a button that cycles the featured metric on tap. Only
                  interactive while powered; when off it shows Standby. */}
              <button
                type="button"
                className={`watch-face watch-face--btn${powered ? '' : ' watch-face--off'}`}
                aria-label={
                  powered
                    ? 'Watch screen — show the next metric'
                    : 'Watch screen is off'
                }
                onClick={powered ? nextFeature : undefined}
              >
                {!powered && (
                  <span className="watch-standby" aria-hidden="true">
                    Standby
                  </span>
                )}

                <span className="watch-screen">
                  <Complication
                    className="watch-comp--tl"
                    colour="#a877bf"
                    icon={StepsIcon}
                    label={`Steps: ${fmt(data.steps)}`}
                    featured={feature.key === 'steps'}
                  >
                    {fmtSteps(data.steps)}
                  </Complication>
                  <Complication
                    className="watch-comp--tr"
                    colour="#c79ad6"
                    icon={ActiveIcon}
                    label={`Active: ${fmt(data.activeMinutes)} minutes`}
                    featured={feature.key === 'active'}
                  >
                    {fmt(data.activeMinutes)}
                    <span className="watch-comp-u">m</span>
                  </Complication>
                  <Complication
                    className="watch-comp--bl"
                    colour="#7a4988"
                    icon={SleepIcon}
                    label={`Sleep: ${fmt(data.sleepHours, 1)} hours`}
                    featured={feature.key === 'sleep'}
                  >
                    {fmt(data.sleepHours, 1)}
                    <span className="watch-comp-u">h</span>
                  </Complication>

                  {synced && (
                    <span className="watch-synced" aria-hidden="true">
                      <span className="watch-synced-dot" />
                      <span>
                        Synced
                        <br />
                        {synced}
                      </span>
                    </span>
                  )}

                  <div className="watch-dial">
                    <svg
                      viewBox="0 0 194 194"
                      className="watch-rings-svg"
                      aria-hidden="true"
                    >
                      {RINGS.map((ring) => (
                        <Ring
                          key={ring.key}
                          r={ring.r}
                          colour={ring.colour}
                          dim={feature.ring !== null && feature.ring !== ring.key}
                          filled={
                            ring.key === 'steps'
                              ? fill(data.steps, GOALS.steps)
                              : ring.key === 'active'
                                ? fill(data.activeMinutes, GOALS.activeMinutes)
                                : fill(data.sleepHours, GOALS.sleepHours)
                          }
                          play={play}
                        />
                      ))}
                    </svg>

                    <div className="watch-centre">
                      {feature.key === 'hr' ? (
                        bpm !== null ? (
                          <svg
                            viewBox="0 0 32 29"
                            className="watch-heart"
                            role="img"
                            aria-hidden="true"
                            style={
                              !reduced && beat
                                ? ({ '--beat': beat } as CSSProperties)
                                : undefined
                            }
                          >
                            <defs>
                              <mask id="watch-hr-knockout">
                                <path d={HEART_PATH} fill="white" />
                                <text
                                  x="16"
                                  y="18.6"
                                  textAnchor="middle"
                                  fill="black"
                                  fontSize="11"
                                  fontWeight="800"
                                >
                                  {bpm}
                                </text>
                              </mask>
                            </defs>
                            <path
                              className="watch-heart-glow"
                              mask="url(#watch-hr-knockout)"
                              d={HEART_PATH}
                            />
                            <path
                              className="watch-heart-path"
                              mask="url(#watch-hr-knockout)"
                              d={HEART_PATH}
                            />
                          </svg>
                        ) : (
                          <span className="watch-hr-missing" aria-hidden="true">
                            —
                          </span>
                        )
                      ) : (
                        <span className="watch-metric" aria-hidden="true">
                          <span className="watch-metric-v">
                            {readout[feature.key].value}
                            {readout[feature.key].unit && (
                              <span className="watch-metric-u">
                                {readout[feature.key].unit}
                              </span>
                            )}
                          </span>
                          <span className="watch-metric-cap">
                            {readout[feature.key].label}
                          </span>
                          <span className="watch-metric-goal">
                            {readout[feature.key].goal}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </span>
              </button>
            </div>
            <span className="watch-strap watch-strap--bot" />
          </div>

          {/* Polite live region so screen-reader users hear what's featured (or
              that the screen is off) after each control press. */}
          <p className="sr-only" role="status" aria-live="polite">
            {liveText}
          </p>
        </div>
      )}
    </section>
  );
}
