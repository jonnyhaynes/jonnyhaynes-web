import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '../lib/useReducedMotion';

/**
 * Where the eyes are, as percentages of the portrait image.
 *
 * Measured off the cut-out rather than guessed: the grid was rendered over the
 * photo and these marks land on both pupils. His head is turned, so both are well
 * right of where a frontal portrait would put them — the left eye sits near the
 * bridge, not in the outer half of its lens. Nudge these if a blink drifts.
 */
const EYES = [
  { key: 'left', x: 46.0, y: 37.4, w: 7.0, h: 3.2 },
  { key: 'right', x: 67.2, y: 36.7, w: 7.0, h: 3.2 },
];

/** How long the lids stay shut, and the range of gaps between blinks. */
const SHUT_MS = 130;
const GAP_MIN_MS = 4000;
const GAP_MAX_MS = 9000;

/**
 * The portrait: a screenprint cut-out that leans very slightly towards the cursor,
 * and blinks now and then.
 *
 * The parallax lives here rather than at the call site so the interactivity
 * travels with the portrait — it was originally a hero effect, and moving the
 * figure into the panel silently dropped it.
 *
 * Runs only on a device with a real cursor *and* without a reduced-motion
 * preference, so touch gets a still image and nobody has motion they didn't ask
 * for. Pointer events are throttled through `requestAnimationFrame` and the
 * position is written to custom properties, so the movement itself is pure CSS.
 */
export function PortraitFigure() {
  const figureRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [shut, setShut] = useState(false);

  useEffect(() => {
    const pointerQuery = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const figure = figureRef.current;
    if (!pointerQuery?.matches || motionQuery?.matches || !figure) return;

    let frame = 0;

    const reset = () => {
      figure.style.setProperty('--portrait-x', '0px');
      figure.style.setProperty('--portrait-y', '0px');
    };

    const track = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Normalised against the viewport, so the drift reads as the portrait
        // following the cursor across the page rather than jittering within its
        // own small box.
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        figure.style.setProperty('--portrait-x', `${x * 12}px`);
        figure.style.setProperty('--portrait-y', `${y * 9}px`);
      });
    };

    window.addEventListener('pointermove', track);
    window.addEventListener('pointerleave', reset);
    document.documentElement.addEventListener('mouseleave', reset);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', track);
      window.removeEventListener('pointerleave', reset);
      document.documentElement.removeEventListener('mouseleave', reset);
      reset();
    };
  }, []);

  // The blink. Randomised rather than on a fixed interval — a metronome reads as a
  // mechanism, and this is a face. Skipped entirely under reduced motion, and the
  // lids then simply never open from `opacity: 0`.
  useEffect(() => {
    if (reduced) return;

    let gap = 0;
    let hold = 0;

    const schedule = () => {
      gap = window.setTimeout(
        () => {
          setShut(true);
          hold = window.setTimeout(() => {
            setShut(false);
            schedule();
          }, SHUT_MS);
        },
        GAP_MIN_MS + Math.random() * (GAP_MAX_MS - GAP_MIN_MS),
      );
    };

    schedule();
    return () => {
      window.clearTimeout(gap);
      window.clearTimeout(hold);
    };
  }, [reduced]);

  return (
    <figure ref={figureRef} className="portrait-art portrait-art--screenprint">
      <picture className="portrait-picture">
        <source
          type="image/webp"
          srcSet="/images/portrait-cutout-480.webp 480w, /images/portrait-cutout-960.webp 960w"
          sizes="(min-width: 1024px) 20rem, 80vw"
        />
        <img
          src="/images/portrait-cutout-960.webp"
          width="960"
          height="1129"
          alt="Jonny Haynes wearing glasses and an Ey Up cycling cap"
          fetchPriority="high"
          decoding="async"
        />
      </picture>

      {/* The eyelids. A separate element only because a `<picture>` can't hold one,
          so the photo's transform is repeated onto this layer to keep them together.
          The painted lids are the closed state; the photo underneath is always the
          open one. Decorative — the alt text already describes the portrait. */}
      <span className="portrait-lids" aria-hidden="true">
        {EYES.map((eye) => (
          <span
            key={eye.key}
            className="portrait-lid"
            data-closed={shut ? 'true' : 'false'}
            style={{
              left: `${eye.x}%`,
              top: `${eye.y}%`,
              width: `${eye.w}%`,
              height: `${eye.h}%`,
            }}
          />
        ))}
      </span>
    </figure>
  );
}
