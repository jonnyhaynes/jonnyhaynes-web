import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '../lib/useReducedMotion';

/** How long the eyes stay shut, and the range of gaps between blinks. */
const SHUT_MS = 130;
const GAP_MIN_MS = 4000;
const GAP_MAX_MS = 9000;

/**
 * The portrait: a screenprint cut-out that leans very slightly towards the cursor,
 * and blinks now and then.
 *
 * The blink swaps between two real images — the cut-out, and a closed-eye frame
 * built from the photo's own pixels by `scripts/build-blink-frame.mjs`. Painting
 * lids over a single image was tried and rejected: a flat shape reads as a shape,
 * and it has to cross the glasses frame to reach the eye.
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
  // mechanism, and this is a face. Skipped entirely under reduced motion, where the
  // closed frame simply never gets faded in.
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
    <figure
      ref={figureRef}
      className="portrait-art portrait-art--screenprint"
      data-shut={shut ? 'true' : 'false'}
    >
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

      {/* The closed frame, over the open one and faded in for the blink. Same photo,
          eyes rebuilt from nearby skin, so the glasses stay put. Lazy-loaded: it
          isn't needed for a few seconds and shouldn't compete with the portrait for
          the first paint. Decorative, hence the empty alt. */}
      <picture className="portrait-picture portrait-picture--closed">
        <source
          type="image/webp"
          srcSet="/images/portrait-blink-480.webp 480w, /images/portrait-blink-960.webp 960w"
          sizes="(min-width: 1024px) 20rem, 80vw"
        />
        <img
          src="/images/portrait-blink-960.webp"
          width="960"
          height="1129"
          alt=""
          loading="lazy"
          decoding="async"
        />
      </picture>
    </figure>
  );
}
