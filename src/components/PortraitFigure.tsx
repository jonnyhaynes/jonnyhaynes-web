import { useRef } from 'react';

import { usePointerParallax } from '../lib/pointer';

/**
 * The portrait: a screenprint cut-out that leans very slightly towards the
 * cursor.
 *
 * The parallax is declared here rather than at the call site so the
 * interactivity travels with the portrait — it was originally a hero effect, and
 * moving the figure into the panel silently dropped it. It reads the page's
 * shared pointer listener (`lib/pointer`), so the portrait and the hero copy
 * follow the cursor off one subscription rather than one each.
 *
 * Touch and reduced-motion readers never subscribe, so they get the static
 * offset defined in `.portrait-picture` and nothing moves.
 */
export function PortraitFigure() {
  const figureRef = useRef<HTMLElement>(null);

  usePointerParallax(figureRef, {
    x: 17,
    y: 18,
    varX: '--portrait-x',
    varY: '--portrait-y',
  });

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
