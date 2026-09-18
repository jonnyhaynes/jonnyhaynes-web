import { useEffect, useRef, useState } from 'react';
import { toGridRef } from '../lib/gridref';
import {
  CELL,
  RAMP,
  SPOTLIGHT_RADIUS,
  cellToEasting,
  cellToNorthing,
  mirror,
  parseColor,
  sampleHeight,
  toMetres,
  useTopographyGrid,
} from '../lib/topography-grid';
import { getBackground } from '../lib/traverse';
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
 * full-bleed <canvas>. Colours are read from the live CSS custom properties
 * (--color-muted, --color-accent-start) so the layer tints with the Big Light
 * theme.
 *
 * The sampling offset comes from `lib/traverse`'s store, which lets a page drive
 * the field from scroll instead of the clock — see BackgroundMode. The store's
 * defaults reproduce the original behaviour exactly (a slow time-based drift on
 * fine-pointer devices that allow motion, with a ~300px cursor spotlight), so a
 * page that doesn't opt in is unaffected. Touch / reduced-motion users get a
 * static frame — no pointer listeners, and no meaningful redraw. If the grid JSON
 * is missing the background simply doesn't draw and the page is unaffected.
 */

export function TopographicBackground() {
  const { theme, palette } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const grid = useTopographyGrid();

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Live theme colours. The effect re-runs whenever `theme` OR `palette`
    // changes, but the attribute that drives those tokens (data-theme /
    // data-palette) is written in ThemeProvider's OWN effect — which may commit
    // AFTER this one. Reading getComputedStyle synchronously here can therefore
    // return the PREVIOUS palette's accent (the canvas lagging one toggle
    // behind). So colours are mutable and (re)read via readColors(), invoked
    // from a rAF below — by the next frame the attribute is committed and styles
    // recomputed, so the read is always current.
    let base: ReturnType<typeof parseColor> = [156, 163, 175];
    let accent: ReturnType<typeof parseColor> = [168, 119, 191];
    const readColors = () => {
      const styles = getComputedStyle(canvas);
      base = parseColor(styles.getPropertyValue('--color-muted'));
      accent = parseColor(styles.getPropertyValue('--color-accent-start'));
    };

    let cw = 0;
    let ch = 0;
    let cols = 0;
    let rows = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cw = window.innerWidth;
      ch = window.innerHeight;
      // Backing store is CSS size × dpr for crisp retina text…
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      // …but the *displayed* size must stay the CSS viewport, or the width
      // attribute becomes the element's intrinsic CSS size and the whole field
      // renders ~dpr× too big and clipped. Pin CSS size explicitly; the
      // transform below maps CSS px → device px.
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
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

    // Eased offset for the `waypoints` mode, which parks at each section's
    // waypoint rather than tracking scroll continuously.
    let easedX = 0;
    let easedY = 0;
    let eased = false;

    let lastOffsetX = NaN;
    let lastOffsetY = NaN;
    let lastT = 0;
    let raf = 0;
    let running = true;

    const draw = (t: number) => {
      // Frame delta in seconds, clamped so a long pause (tab refocus) can't
      // teleport the cursor or lurch the field.
      const dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0;
      lastT = t;

      const bg = getBackground();

      // Ease the smoothed cursor toward the pointer target with a
      // framerate-independent exponential (same feel at 30 or 144fps).
      if (curX < -9998) {
        curX = targetX;
        curY = targetY;
      } else {
        const k = 1 - Math.exp(-dt * 12); // ~time constant, fps-independent
        curX += (targetX - curX) * k;
        curY += (targetY - curY) * k;
      }

      /* Where the field is sampled from.
       *
       * `pan` is the traverse: the offset is a pure function of scroll, so the
       * ground at the middle of the screen is always the ground the chrome is
       * naming. `waypoints` parks at the current section's waypoint and eases
       * across. `drift` is the original time-based diagonal — meaningless by
       * design, which is why nothing positional may be anchored to it. */
      let offsetX: number;
      let offsetY: number;
      if (bg.mode === 'pan') {
        offsetX = bg.panX;
        offsetY = bg.panY;
      } else if (bg.mode === 'waypoints') {
        if (!eased) {
          easedX = bg.panX;
          easedY = bg.panY;
          eased = true;
        }
        const k = 1 - Math.exp(-dt * 3);
        easedX += (bg.panX - easedX) * k;
        easedY += (bg.panY - easedY) * k;
        offsetX = easedX;
        offsetY = easedY;
      } else if (bg.mode === 'static') {
        offsetX = 0;
        offsetY = 0;
      } else {
        offsetX = interactive ? (t / 1000) * 0.9 : 0; // cells/sec
        offsetY = interactive ? (t / 1000) * 0.65 : 0;
      }

      // Nothing to repaint while the field is still, the cursor isn't being
      // followed and no reticle is drawn — the touch-device case, which is why
      // the original code could stop after a single frame. The loop stays alive
      // so a control that changes the mode is honoured on the very next frame;
      // it just skips the expensive repaint until something actually moves.
      const settled =
        offsetX === lastOffsetX &&
        offsetY === lastOffsetY &&
        !(interactive && curX > -9998) &&
        !bg.reticle;
      if (settled) return;
      lastOffsetX = offsetX;
      lastOffsetY = offsetY;

      ctx.clearRect(0, 0, cw, ch);

      const sxScale = grid.cols / cols;
      const syScale = grid.rows / rows;

      for (let ry = 0; ry < rows; ry++) {
        for (let rx = 0; rx < cols; rx++) {
          // Continuous grid coords + offset; sampleHeight mirrors + interpolates,
          // so there's no hard wrap seam and the transition is smooth.
          const gx = rx * sxScale + offsetX;
          const gy = ry * syScale + offsetY;
          const h = sampleHeight(grid, gx, gy);
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

      /* The reticle.
       *
       * It reads the height under the pointer by calling the same sampleHeight()
       * the glyphs above were drawn from, so the number is true by construction
       * rather than by a parallel lookup that could drift. The reference is only
       * claimed for a point genuinely inside the baked sheet: the field mirrors
       * past the edge, so terrain outside it is a repeat, and naming a repeat
       * would be fiction. Those samples are marked `≈` instead. */
      if (bg.reticle && interactive && curX > -9998) {
        const gx = (curX / CELL) * sxScale + offsetX;
        const gy = (curY / CELL) * syScale + offsetY;
        const metres = Math.round(toMetres(sampleHeight(grid, gx, gy)));

        const wrapped =
          Math.floor(gx) < 0 ||
          Math.floor(gx) >= grid.cols ||
          Math.floor(gy) < 0 ||
          Math.floor(gy) >= grid.rows;
        const easting = Math.round(cellToEasting(mirror(gx, grid.cols)));
        const northing = Math.round(cellToNorthing(mirror(gy, grid.rows)));
        const label = `${wrapped ? '≈ ' : ''}${toGridRef(easting, northing)} · ${metres} m`;

        ctx.strokeStyle = `rgba(${accent.join(',')},0.85)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const arm = 9;
        const gap = 4;
        ctx.moveTo(curX - arm - gap, curY);
        ctx.lineTo(curX - gap, curY);
        ctx.moveTo(curX + gap, curY);
        ctx.lineTo(curX + arm + gap, curY);
        ctx.moveTo(curX, curY - arm - gap);
        ctx.lineTo(curX, curY - gap);
        ctx.moveTo(curX, curY + gap);
        ctx.lineTo(curX, curY + arm + gap);
        ctx.stroke();

        ctx.font = '11px ui-monospace, "SF Mono", Menlo, monospace';
        ctx.textBaseline = 'top';
        const textWidth = ctx.measureText(label).width;
        const boxX = Math.min(cw - textWidth - 14, curX + 16);
        const boxY = Math.max(4, curY - 24);
        const light = document.documentElement.dataset.theme === 'light';
        ctx.fillStyle = light ? 'rgba(255,255,255,0.84)' : 'rgba(0,0,0,0.62)';
        ctx.fillRect(boxX - 5, boxY, textWidth + 10, 18);
        ctx.fillStyle = `rgba(${accent.join(',')},1)`;
        ctx.fillText(label, boxX, boxY + 3);
      }
    };

    const loop = (t: number) => {
      if (!running) return;
      draw(t);
      if (running) raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame((t) => {
      readColors();
      loop(t);
    });

    // Pause the loop when the tab is hidden so idle work costs nothing. Playback
    // resumes on the next visibility change, and the settled case above stops it
    // on its own once nothing can change.
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        lastT = 0;
        lastOffsetX = NaN;
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        lastOffsetX = NaN;
        lastT = 0;
        if (!running) {
          running = true;
          raf = requestAnimationFrame(loop);
        }
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
  }, [grid, interactive, theme, palette]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
