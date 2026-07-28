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
  { key: 'steps', r: 86, colour: '#a877bf', track: 'rgba(168,119,191,0.15)' },
  { key: 'active', r: 68, colour: '#c79ad6', track: 'rgba(199,154,214,0.15)' },
  { key: 'sleep', r: 50, colour: '#7a4988', track: 'rgba(122,73,136,0.18)' },
] as const;

const circumference = (r: number) => 2 * Math.PI * r;

/** en-GB number formatting; em-dash for a missing metric (never "0"). */
function fmt(n: number | null, digits = 0): string {
  return n === null
    ? '—'
    : n.toLocaleString('en-GB', { maximumFractionDigits: digits });
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
  track,
  filled,
  play,
}: {
  r: number;
  colour: string;
  track: string;
  filled: number;
  play: boolean;
}) {
  const len = circumference(r);
  return (
    <>
      <circle cx="97" cy="97" r={r} fill="none" stroke={track} strokeWidth="11" />
      <circle
        cx="97"
        cy="97"
        r={r}
        fill="none"
        stroke={colour}
        strokeWidth="11"
        strokeLinecap="round"
        className="watch-ring"
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
  children,
}: {
  className: string;
  colour: string;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`watch-comp ${className}`}
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

/**
 * Health section — a light-touch personality widget backed by the baked health
 * snapshot. The four daily metrics are dressed as a fitness watch to match the
 * page's other physical-object sections (Gaming's CRT, Reading's bookshelf):
 * three activity rings (steps / active / sleep) fill toward daily goals, and a
 * heart pulses at the resting rate in the centre with its BPM knocked out of the
 * heart shape.
 *
 * Graceful degradation: renders nothing if the fetch failed (data null). If the
 * data loaded but every metric is null (no successful bake), shows a quiet
 * rest-day state — empty rings, no pulse — rather than a broken/blank section.
 * Individual null metrics show an em-dash and an unfilled ring.
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

  return (
    <section id="health" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // Life beyond the keyboard
      </h2>
      <p className="mt-4 max-w-xl text-muted">
        A day away from the compiler, more or less — pulled from my wearable.
      </p>

      {!hasAny ? (
        // Rest-day fallback: empty watch + a line. No pulse, no numbers.
        <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
          <div className="watch" aria-hidden="true">
            <span className="watch-strap watch-strap--top" />
            <div className="watch-case">
              <span className="watch-crown" />
              <div className="watch-face">
                <div className="watch-dial">
                  <svg viewBox="0 0 194 194" className="watch-rings-svg">
                    {RINGS.map((ring) => (
                      <circle
                        key={ring.key}
                        cx="97"
                        cy="97"
                        r={ring.r}
                        fill="none"
                        stroke={ring.track}
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
              <span className="watch-crown" aria-hidden="true" />
              <div className="watch-face">
                <Complication
                  className="watch-comp--tl"
                  colour="#a877bf"
                  icon={StepsIcon}
                  label={`Steps: ${fmt(data.steps)}`}
                >
                  {fmt(data.steps)}
                </Complication>
                <Complication
                  className="watch-comp--tr"
                  colour="#c79ad6"
                  icon={ActiveIcon}
                  label={`Active: ${fmt(data.activeMinutes)} minutes`}
                >
                  {fmt(data.activeMinutes)}
                  <span className="watch-comp-u">m</span>
                </Complication>
                <Complication
                  className="watch-comp--bl"
                  colour="#7a4988"
                  icon={SleepIcon}
                  label={`Sleep: ${fmt(data.sleepHours, 1)} hours`}
                >
                  {fmt(data.sleepHours, 1)}
                  <span className="watch-comp-u">h</span>
                </Complication>

                {synced && (
                  <span className="watch-synced" aria-label={`Synced ${synced}`}>
                    <span className="watch-synced-dot" aria-hidden="true" />
                    <span aria-hidden="true">
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
                        track={ring.track}
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

                  <div className="watch-heart-holder">
                    {bpm !== null ? (
                      <svg
                        viewBox="0 0 32 29"
                        className="watch-heart"
                        role="img"
                        aria-label={`Resting heart rate ${bpm} bpm`}
                        style={
                          !reduced && beat
                            ? ({ '--beat': beat } as CSSProperties)
                            : undefined
                        }
                      >
                        <defs>
                          <mask id="watch-hr-knockout">
                            <rect width="32" height="29" fill="white" />
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
                          className="watch-heart-path"
                          mask="url(#watch-hr-knockout)"
                          d="M16 28.5C16 28.5 2 20.4 2 10.2 2 5.1 5.9 1.5 10.3 1.5 12.9 1.5 15 3 16 5.1 17 3 19.1 1.5 21.7 1.5 26.1 1.5 30 5.1 30 10.2 30 20.4 16 28.5 16 28.5Z"
                        />
                      </svg>
                    ) : (
                      <span className="watch-hr-missing" aria-label="Resting heart rate unavailable">
                        —
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <span className="watch-strap watch-strap--bot" />
          </div>
        </div>
      )}
    </section>
  );
}
