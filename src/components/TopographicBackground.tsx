import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../theme/useTheme';

/**
 * Interactive ASCII-art topographic background.
 *
 * The artwork is REAL relief: a normalised height grid derived from Ordnance
 * Survey Terrain 50 for the South Yorkshire window (the Dark Peak moors west of
 * Sheffield down into the city), baked to public/topography-grid.json by
 * scripts/build-topography-grid.mjs (© Crown copyright, OGL v3).
 *
 * Each grid cell picks a glyph from a low→high ASCII ramp and is painted to a
 * full-bleed <canvas>. On fine-pointer devices that allow motion the field
 * drifts on a slow diagonal parallax and a ~300px cursor "spotlight" lerps the
 * nearby glyphs from the muted base colour toward the accent. Touch /
 * reduced-motion users get a single static frame — no pointer listeners, no
 * animation. If the grid JSON is missing the background simply doesn't draw
 * (graceful degradation) and the page is unaffected.
 *
 * Colours are read from the live CSS custom properties (--color-muted,
 * --color-accent-start) so the layer tints with the Big Light theme; a theme
 * flip re-runs the draw effect and re-reads them.
 */

const GRID_URL = '/topography-grid.json';
const RAMP = ' ·:-=+*#%@'; // low → high elevation
const CELL = 12; // px per glyph cell (CSS pixels)
const SPOTLIGHT_RADIUS = 300;

type Grid = { cols: number; rows: number; data: Uint8Array };

/** Decode the baked base64 byte grid into a typed array. */
function decodeGrid(json: {
  cols: number;
  rows: number;
  data: string;
}): Grid {
  const bin = atob(json.data);
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  return { cols: json.cols, rows: json.rows, data };
}

/** Parse an rgb/hex CSS colour string into [r,g,b]. */
function parseColor(raw: string): [number, number, number] {
  const s = raw.trim();
  const rgb = s.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((n) => parseFloat(n));
    return [r, g, b];
  }
  const hex = s.replace('#', '');
  if (hex.length === 3) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ];
  }
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

export function TopographicBackground() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [grid, setGrid] = useState<Grid | null>(null);

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Only enable the interactive spotlight + drift on fine-pointer devices that
  // also allow motion — a touch device has no cursor to follow.
  const [finePointer, setFinePointer] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    const update = () => setFinePointer(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const interactive = finePointer && !prefersReduced;

  // Load the baked height grid once. On any failure we leave `grid` null and
  // the canvas stays blank — the page renders fine without it.
  useEffect(() => {
    let cancelled = false;
    fetch(GRID_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no grid'))))
      .then((json) => {
        if (!cancelled) setGrid(decodeGrid(json));
      })
      .catch(() => {
        /* graceful degradation — no background */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Pull the live theme colours; re-read whenever `theme` changes (this effect
    // re-runs on flip because `theme` is a dependency).
    const styles = getComputedStyle(canvas);
    const base = parseColor(styles.getPropertyValue('--color-muted'));
    const accent = parseColor(styles.getPropertyValue('--color-accent-start'));

    let cw = 0;
    let ch = 0;
    let cols = 0;
    let rows = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cw = window.innerWidth;
      ch = window.innerHeight;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(cw / CELL);
      rows = Math.ceil(ch / CELL);
      ctx.font = `${CELL}px ui-monospace, "SF Mono", Menlo, monospace`;
      ctx.textBaseline = 'top';
    };
    resize();

    // Spring-smoothed cursor so the spotlight trails pleasantly. -9999 = off.
    let targetX = -9999;
    let targetY = -9999;
    let curX = -9999;
    let curY = -9999;

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };
    if (interactive) {
      window.addEventListener('pointermove', onMove, { passive: true });
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, cw, ch);

      // ease the smoothed cursor toward the pointer target
      if (curX < -9998) {
        curX = targetX;
        curY = targetY;
      } else {
        curX += (targetX - curX) * 0.15;
        curY += (targetY - curY) * 0.15;
      }

      // slow diagonal drift (disabled for reduced motion)
      const dx = interactive ? t * 0.000012 : 0;
      const dy = interactive ? t * 0.000009 : 0;

      for (let ry = 0; ry < rows; ry++) {
        for (let rx = 0; rx < cols; rx++) {
          // sample the height grid, wrapping, with the drift offset
          const gx = Math.floor(((rx / cols + dx) % 1) * grid.cols);
          const gy = Math.floor(((ry / rows + dy) % 1) * grid.rows);
          const h = grid.data[gy * grid.cols + gx] / 255;
          const ci = Math.min(RAMP.length - 1, Math.floor(h * RAMP.length));
          const glyph = RAMP[ci];
          if (glyph === ' ') continue;

          const sx = rx * CELL;
          const sy = ry * CELL;

          // spotlight influence (0 when non-interactive → pure base layer)
          let glow = 0;
          if (interactive && curX > -9998) {
            const d = Math.hypot(sx + CELL / 2 - curX, sy + CELL / 2 - curY);
            glow = Math.max(0, 1 - d / SPOTLIGHT_RADIUS);
          }

          const a = 0.1 + h * 0.14 + glow * 0.5;
          const r = base[0] + (accent[0] - base[0]) * glow;
          const g = base[1] + (accent[1] - base[1]) * glow;
          const b = base[2] + (accent[2] - base[2]) * glow;
          ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`;
          ctx.fillText(glyph, sx, sy);
        }
      }
    };

    let raf = 0;
    let running = true;

    const loop = (t: number) => {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    // Static devices (touch / reduced motion) draw one frame and stop.
    if (interactive) {
      raf = requestAnimationFrame(loop);
    } else {
      draw(0);
    }

    // Pause the loop when the tab is hidden so idle drift costs nothing.
    const onVisibility = () => {
      if (!interactive) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        if (!interactive) draw(0); // redraw the static frame at the new size
      }, 120);
    };
    window.addEventListener('resize', onResize);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      if (interactive) window.removeEventListener('pointermove', onMove);
    };
  }, [grid, interactive, theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
