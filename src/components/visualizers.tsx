import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { VisualizerKind } from './visualizers-meta';

/**
 * Now Playing visualizers — canvas-drawn graphics for the tape-deck screen,
 * switchable on the front end (see useVisualizer in NowPlaying).
 *
 * IMPORTANT: like the rest of the section, this is *honest, non-audio* motion.
 * The browser never receives Spotify's audio stream, so nothing here reacts to
 * real sound — every visualizer is parametrised by the track's tempo (speed)
 * and energy (amplitude): real values from the audio-features lookup when
 * Spotify provides them, otherwise deterministic per-track values derived from
 * the track's metadata (see deriveTrackParams in data/spotify). All three:
 *   - read the live --color-accent-* tokens so they track the light/dark theme
 *     (cached, and re-read when the theme attribute flips),
 *   - freeze to a single representative frame under prefers-reduced-motion,
 *   - pause the RAF loop when not `active` (playback stopped) to save cycles.
 */

type VisualizerProps = {
  active: boolean;
  tempo?: number | null;
  energy?: number | null;
};

// A representative static frame time for reduced-motion states.
const STILL_T = 0.8;

/** Live prefers-reduced-motion — re-runs the canvas effect when the OS
 * setting toggles, rather than only sampling it on mount. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

// --- colour helpers -------------------------------------------------------
// Resolve a CSS custom property from the given element's computed style, so a
// local override set on an ancestor (e.g. a re-pointed accent token) cascades
// in. Falls back to document root when no element is passed.
function readToken(name: string, fallback: string, el?: Element | null): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(el ?? document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

type Rgb = [number, number, number];
const FALLBACK_A: Rgb = [168, 119, 191]; // --color-accent-start, dark theme
const FALLBACK_A2: Rgb = [122, 73, 136]; // --color-accent-end, dark theme

// Normalise any CSS colour (hex, rgb, oklch(), color-mix()) to an [r,g,b]
// triple by round-tripping through a canvas fillStyle — the 2D context
// serialises accepted colours as #rrggbb/rgba(), so we never parse modern
// colour syntaxes ourselves. An unaccepted value leaves the sentinel in place.
let colorCtx: CanvasRenderingContext2D | null = null;
const SENTINEL = '#010203';
function resolveColor(value: string, fallback: Rgb): Rgb {
  if (typeof document === 'undefined') return fallback;
  colorCtx ??= document.createElement('canvas').getContext('2d');
  if (!colorCtx) return fallback;
  colorCtx.fillStyle = SENTINEL;
  colorCtx.fillStyle = value;
  const v = colorCtx.fillStyle;
  if (v === SENTINEL && value.trim().toLowerCase() !== SENTINEL) return fallback;
  if (v.startsWith('#')) {
    return [
      parseInt(v.slice(1, 3), 16),
      parseInt(v.slice(3, 5), 16),
      parseInt(v.slice(5, 7), 16),
    ];
  }
  const m = v.match(/[\d.]+/g);
  return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : fallback;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
const rgba = (c: Rgb, alpha: number) => `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;

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
    a: Rgb;
    a2: Rgb;
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
 *
 * Frame cost is kept off the layout path: the canvas size is measured once and
 * on ResizeObserver (never per frame), and the accent colours are read once
 * and re-read only when the theme attribute flips (MutationObserver).
 */
function useCanvas(
  active: boolean,
  tempo: number | null | undefined,
  energy: number | null | undefined,
  draw: DrawFn,
  reducedMotion: boolean,
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

    // Sizing, measured on init + resize only. Backing store is only touched
    // when the size actually changes (resizing reallocates + clears it).
    let w = 0;
    let h = 0;
    let ctx: CanvasRenderingContext2D | null = null;
    const measure = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const bw = Math.max(1, Math.round(w * dpr));
      const bh = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      ctx = canvas.getContext('2d');
      // A resize resets the context state, so (re)apply the DPR transform.
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Theme colours, cached until the theme attribute flips.
    let colors: { a: Rgb; a2: Rgb } | null = null;
    const readColors = () => {
      colors ??= {
        a: resolveColor(
          readToken('--color-accent-start', '#a877bf', canvas),
          FALLBACK_A,
        ),
        a2: resolveColor(
          readToken('--color-accent-end', '#7a4988', canvas),
          FALLBACK_A2,
        ),
      };
      return colors;
    };

    const paint = (t: number, rest: number) => {
      if (!ctx || w <= 0 || h <= 0) return;
      ctx.clearRect(0, 0, w, h);
      const { a, a2 } = readColors();
      draw(ctx, w, h, t, { beat, amp, liveAmp: amp * (1 - rest), rest, a, a2 });
    };

    // A single representative frame, no RAF: painted at STILL_T with rest=0 so
    // the visualizer shows its full shape — just held still — rather than the
    // collapsed baseline. Repainted on resize + theme change.
    if (reducedMotion) {
      measure();
      const repaint = () => paint(STILL_T, 0);
      repaint();
      const ro = new ResizeObserver(() => {
        measure();
        repaint();
      });
      ro.observe(canvas);
      const mo = new MutationObserver(() => {
        colors = null;
        repaint();
      });
      mo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
      return () => {
        ro.disconnect();
        mo.disconnect();
      };
    }

    measure();
    // Live loop: size/theme changes are picked up by the next frame, so these
    // observers only update the caches.
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);
    const mo = new MutationObserver(() => {
      colors = null;
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

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
      const rest = easeInOut(progressRef.current);

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
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [active, tempo, energy, draw, reducedMotion]);

  return ref;
}

// --- draw functions (module-scope so their identity is stable) ------------

const drawSpectrum: DrawFn = (ctx, w, h, t, { beat, liveAmp, a, a2 }) => {
  const N = 28;
  const gap = 2;
  const bw = (w - gap * (N - 1)) / N;
  // One full-height gradient shared by every bar (was one allocation per bar
  // per frame). Bars sample it by height, so taller bars reach the bright end —
  // like the colour zones on a hardware analyser.
  const g = ctx.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, rgba(a2, 0.9));
  g.addColorStop(1, rgba(a, 1));
  for (let i = 0; i < N; i++) {
    const phase = t * beat * 1.4 + i * 0.55;
    const wobble = 0.5 + 0.5 * Math.sin(phase) * Math.sin(phase * 0.37 + i);
    // liveAmp → 0 collapses every bar to a thin baseline strip.
    const level = Math.max(0.02, wobble * liveAmp);
    const bh = level * (h - 6);
    const x = i * (bw + gap);
    const top = h - bh;
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

function Spectrum({ active, tempo, energy }: VisualizerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useCanvas(active, tempo, energy, drawSpectrum, reducedMotion);
  return <canvas ref={ref} className="block size-full" aria-hidden="true" />;
}
function Oscilloscope({ active, tempo, energy }: VisualizerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useCanvas(active, tempo, energy, drawScope, reducedMotion);
  return <canvas ref={ref} className="block size-full" aria-hidden="true" />;
}
function Plasma({ active, tempo, energy }: VisualizerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const ref = useCanvas(active, tempo, energy, drawPlasma, reducedMotion);
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
