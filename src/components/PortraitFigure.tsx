import { useEffect, useRef } from 'react';

/**
 * The portrait: a screenprint cut-out that leans very slightly towards the
 * cursor.
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
    </figure>
  );
}
