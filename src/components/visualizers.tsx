import { useEffect, useRef } from 'react';
import type { VisualizerKind } from './visualizers-meta';

/**
 * Now Playing visualizers — canvas-drawn graphics for the tape-deck screen,
 * switchable on the front end (see useVisualizer in NowPlaying).
 *
 * IMPORTANT: like the rest of the section, this is *honest, non-audio* motion.
 * The browser never receives Spotify's audio stream, so nothing here reacts to
 * real sound — every visualizer is parametrised by the track's tempo (speed)
 * and energy (amplitude) from the audio-features lookup, falling back to
 * sensible defaults. All three:
 *   - read the live --color-accent-* tokens so they track the light/dark theme,
 *   - freeze to a single representative frame under prefers-reduced-motion,
 *   - pause the RAF loop when not `active` (playback stopped) to save cycles.
 */

type VisualizerProps = {
  active: boolean;
  tempo?: number | null;
  energy?: number | null;
  // Minimum "aliveness" the collapse envelope is allowed to reach at rest, 0..1.
  // 0 (default, the hero screen) lets a stopped visualizer settle to a bare
  // screen. The switcher mini-previews pass a small floor so a stopped preview
  // still shows enough to identify the mode (notably plasma, which otherwise
  // fades to nothing — see drawPlasma).
  restFloor?: number;
};

// A representative static frame time for reduced-motion / paused states.
const STILL_T = 0.8;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// --- colour helpers -------------------------------------------------------
// Resolve a CSS custom property from the given element's computed style, so a
// local override set on an ancestor (e.g. the selected switcher chip, which
// re-points the accent tokens at a dark colour) cascades in. Falls back to
// document root when no element is passed.
function readToken(name: string, fallback: string, el?: Element | null): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(el ?? document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}
function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function mix(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
const rgba = (c: [number, number, number], alpha: number) =>
  `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;

// Fit the canvas backing store to its CSS box at device resolution.
function fit(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(r.width * dpr));
  canvas.height = Math.max(1, Math.round(r.height * dpr));
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

type DrawFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  p: {
    beat: number;
    amp: number;
    // Effective amplitude after the collapse envelope — bars/wave/plasma should
    // scale their motion by this so they flatten to nothing when it reaches 0.
    liveAmp: number;
    // Collapse progress: 0 while playing, ramps to 1 once the track has ended.
    rest: number;
    a: [number, number, number];
    a2: [number, number, number];
  },
) => void;

// How long the visualizer takes to ease between full motion and rest — used in
// both directions, so it swells up on play exactly as slowly as it settles down
// on stop. Deliberately slow so nothing snaps.
const EASE_MS = 3500;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// Ease-in-out cubic: gentle at both ends so the visualizer eases away from full
// motion, sinks through the middle, and settles softly onto the baseline.
const easeInOut = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

/**
 * Shared canvas driver. Runs a RAF loop whose motion (speed from tempo,
 * amplitude from energy) eases between full and rest via a symmetric envelope:
 * on play it swells up over EASE_MS, on stop it settles down over the same
 * EASE_MS — so the bars, wave and plasma decelerate + shrink to rest, and
 * accelerate + swell on play, rather than snapping either way. Under reduced
 * motion it paints a static frame (mid-motion while playing, at rest when
 * stopped).
 */
function useCanvas(
  active: boolean,
  tempo: number | null | undefined,
  energy: number | null | undefined,
  draw: DrawFn,
  restFloor = 0,
) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Persist the animation clock across active/paused transitions so the ease
  // in/out continues smoothly from wherever the live motion was.
  const clock = useRef(0);
  // Motion envelope (0 = full motion while playing … 1 = fully at rest) plus
  // whether we've ever been active. Both persist across effect re-runs so a
  // play↔stop transition eases from wherever it is rather than snapping to the
  // target — giving a symmetric swell-up on play and settle-down on stop.
  const progressRef = useRef(1);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const beat = tempo && tempo > 0 ? tempo / 60 : 116 / 60; // beats/sec
    const amp = 0.35 + (typeof energy === 'number' ? energy : 0.62) * 0.6;

    const paint = (t: number, rest: number) => {
      const { ctx, w, h } = fit(canvas);
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      const a = toRgb(readToken('--color-accent-start', '#a877bf', canvas));
      const a2 = toRgb(readToken('--color-accent-end', '#7a4988', canvas));
      draw(ctx, w, h, t, { beat, amp, liveAmp: amp * (1 - rest), rest, a, a2 });
    };

    // The collapse never fully reaches rest when a floor is set (preview mode):
    // cap `rest` at 1 - restFloor so a stopped visualizer keeps a little life.
    const capRest = (r: number) => r * (1 - restFloor);

    // Reduced motion: no animation. Show a mid-motion frame while playing, or
    // the (optionally floored) resting frame once stopped.
    if (prefersReducedMotion()) {
      const paintStatic = () => paint(STILL_T, capRest(active ? 0 : 1));
      paintStatic();
      window.addEventListener('resize', paintStatic);
      return () => window.removeEventListener('resize', paintStatic);
    }

    let raf = 0;
    let prev: number | null = null;

    // On the very first mount with nothing playing, start fully at rest so we
    // don't animate an idle card in from flat. Otherwise `progressRef` keeps its
    // value across active/inactive transitions and eases toward the new target.
    if (!active && !wasActiveRef.current) progressRef.current = 1;
    if (active) wasActiveRef.current = true;

    const loop = (ts: number) => {
      if (prev == null) prev = ts;
      const dt = ts - prev;
      prev = ts;

      // Linear progress eases toward the target (0 = full motion when playing,
      // 1 = at rest when stopped) at EASE_MS. Same rate both directions, so the
      // visualizer swells up on play exactly as it settles down on stop.
      const target = active ? 0 : 1;
      const stepDir = target > progressRef.current ? 1 : -1;
      progressRef.current = clamp01(
        progressRef.current + (stepDir * dt) / EASE_MS,
      );
      const settled = progressRef.current === target;
      const rest = capRest(easeInOut(progressRef.current));

      // Advance the clock, slowed by `rest`: full speed at rest=0, frozen at
      // rest=1. With the amplitude decay (liveAmp) this reads as the visualizer
      // decelerating + shrinking to rest, and accelerating + swelling on play.
      clock.current += (dt / 1000) * (1 - rest);

      paint(clock.current, rest);

      // Keep animating while playing, or until an easing settles at its target.
      if (active || !settled) {
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, tempo, energy, draw, restFloor]);

  return ref;
}

// --- draw functions (module-scope so their identity is stable) ------------

const drawSpectrum: DrawFn = (ctx, w, h, t, { beat, liveAmp, a, a2 }) => {
  const N = 28;
  const gap = 2;
  const bw = (w - gap * (N - 1)) / N;
  for (let i = 0; i < N; i++) {
    const phase = t * beat * 1.4 + i * 0.55;
    const wobble = 0.5 + 0.5 * Math.sin(phase) * Math.sin(phase * 0.37 + i);
    // liveAmp → 0 collapses every bar to a thin baseline strip.
    const level = Math.max(0.02, wobble * liveAmp);
    const bh = level * (h - 6);
    const x = i * (bw + gap);
    const top = h - bh;
    const g = ctx.createLinearGradient(0, h, 0, top);
    g.addColorStop(0, rgba(a2, 0.9));
    g.addColorStop(1, rgba(a, 1));
    ctx.fillStyle = g;
    ctx.fillRect(x, top, bw, Math.max(1, bh));
    // Peak cap — a bright tick a little above the bar; fades out as it collapses.
    if (liveAmp > 0.02) {
      const cap = h - (level * 0.9 + 0.08) * (h - 6) - 3;
      ctx.fillStyle = rgba(mix(a, [255, 255, 255], 0.5), 0.95);
      ctx.fillRect(x, Math.max(1, cap), bw, 2);
    }
  }
};

const drawScope: DrawFn = (ctx, w, h, t, { beat, liveAmp, a }) => {
  ctx.lineWidth = 2;
  ctx.strokeStyle = rgba(a, 1);
  ctx.shadowColor = rgba(a, 0.7);
  ctx.shadowBlur = 8;
  ctx.beginPath();
  const mid = h / 2;
  for (let x = 0; x <= w; x += 2) {
    const p = x / w;
    // liveAmp → 0 flattens the wave to the centre line.
    const y =
      mid +
      Math.sin(p * 12 + t * beat * 3) * (h * 0.22 * liveAmp) * Math.sin(p * 3 + t * 1.3);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
};

const drawPlasma: DrawFn = (ctx, w, h, t, { beat, liveAmp, rest, a, a2 }) => {
  const step = 6; // block size — keeps the double loop cheap
  // Fade the whole field out as it collapses so it settles to the bare screen.
  const alpha = (0.55 + 0.35 * liveAmp) * (1 - rest);
  if (alpha <= 0.01) return;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const v =
        Math.sin(x * 0.05 + t * beat * 0.6) +
        Math.sin(y * 0.06 - t * 0.7) +
        Math.sin((x + y) * 0.04 + t * 0.9);
      const tt = (v + 3) / 6; // 0..1
      ctx.fillStyle = rgba(mix(a2, a, tt), alpha);
      ctx.fillRect(x, y, step, step);
    }
  }
};

// --- components -----------------------------------------------------------

function Spectrum({ active, tempo, energy, restFloor }: VisualizerProps) {
  const ref = useCanvas(active, tempo, energy, drawSpectrum, restFloor);
  return <canvas ref={ref} className="block size-full" aria-hidden="true" />;
}
function Oscilloscope({ active, tempo, energy, restFloor }: VisualizerProps) {
  const ref = useCanvas(active, tempo, energy, drawScope, restFloor);
  return <canvas ref={ref} className="block size-full" aria-hidden="true" />;
}
function Plasma({ active, tempo, energy, restFloor }: VisualizerProps) {
  const ref = useCanvas(active, tempo, energy, drawPlasma, restFloor);
  return <canvas ref={ref} className="block size-full" aria-hidden="true" />;
}

/** Renders the chosen visualizer. */
export function Visualizer({
  kind,
  ...props
}: VisualizerProps & { kind: VisualizerKind }) {
  if (kind === 'scope') return <Oscilloscope {...props} />;
  if (kind === 'plasma') return <Plasma {...props} />;
  return <Spectrum {...props} />;
}

/** Inline SVG glyph for the switcher button of each mode. Uses currentColor so
 * it inherits the button's active/muted colour. Decorative — the button owns
 * the accessible label. When `active`, the glyph animates to preview its effect
 * (paused under prefers-reduced-motion via CSS). */
export function VisualizerIcon({
  kind,
  active = false,
}: {
  kind: VisualizerKind;
  active?: boolean;
}) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    'aria-hidden': true,
  } as const;
  const cls = `viz-icon${active ? ' is-active' : ''}`;

  if (kind === 'scope') {
    // Sine wave — the path scrolls left within the clipped viewBox. It's drawn
    // double-width and translated so the loop is seamless.
    return (
      <svg {...common} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={cls}>
        <path
          className="viz-wave"
          d="M-15 8c1.5 0 1.5-4 3-4s1.5 8 3 8 1.5-8 3-8 1.5 4 3 4 1.5-4 3-4 1.5 8 3 8 1.5-8 3-8 1.5 4 3 4 1.5-4 3-4 1.5 8 3 8 1.5-8 3-8 1.5 4 3 4"
        />
      </svg>
    );
  }
  if (kind === 'plasma') {
    // Blob / plasma cell — gently pulses; the core breathes.
    return (
      <svg {...common} strokeWidth={1.4} className={cls}>
        <path
          className="viz-blob"
          d="M8 1.6c2.2-.3 4.4 1.2 5.2 3.3.8 2.1.1 4.7-1.7 6-1.8 1.3-4.6 1.4-6.4.1C3.3 9.7 2.4 7 3.2 4.9 3.9 3 5.8 1.9 8 1.6Z"
          fill="currentColor"
          fillOpacity={0.18}
        />
        <circle className="viz-core" cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  // Spectrum bars — four bars that bounce (staggered). Drawn as thin rects
  // anchored to the baseline so scaleY reads as a bar rising/falling.
  return (
    <svg {...common} strokeWidth={0} className={cls}>
      <rect className="viz-bar viz-bar-1" x="2.2" y="9" width="1.8" height="4" rx="0.6" fill="currentColor" />
      <rect className="viz-bar viz-bar-2" x="5.7" y="5" width="1.8" height="8" rx="0.6" fill="currentColor" />
      <rect className="viz-bar viz-bar-3" x="9.2" y="7" width="1.8" height="6" rx="0.6" fill="currentColor" />
      <rect className="viz-bar viz-bar-4" x="12.7" y="3" width="1.8" height="10" rx="0.6" fill="currentColor" />
    </svg>
  );
}
