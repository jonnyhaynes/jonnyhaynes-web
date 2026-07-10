import { useEffect, useRef, useState } from 'react';
import {
  LazyMotion,
  domAnimation,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react';
import * as m from 'motion/react-m';

/**
 * Interactive topographic background (spec §4B).
 *
 * The artwork is REAL relief: contour lines generated from Ordnance Survey
 * Terrain 50 data for the South Yorkshire window (the Dark Peak moors west of
 * Sheffield down into the city), baked to public/topography-south-yorkshire.svg
 * (© Crown copyright, OGL v3). See scripts note in the PR.
 *
 * A low-opacity copy sits behind everything. On fine-pointer devices that allow
 * motion, a second accent-coloured copy is revealed only through a radial mask
 * that follows the cursor (a ~300px "spotlight"), and the field drifts on a
 * slow diagonal parallax. Touch / reduced-motion users get just the static base
 * layer — no pointer listeners, no animation.
 *
 * Each layer is a currentColor-filled div masked by the contour SVG, so it
 * tints with the theme; the SVG loads once as a static asset.
 */

const SPOTLIGHT_RADIUS = 300;
const TOPO_SVG = '/topography-south-yorkshire.svg';

/** A theme-tinted copy of the contour relief, masked by the baked SVG. */
function ContourField({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: 'currentColor',
        maskImage: `url(${TOPO_SVG})`,
        WebkitMaskImage: `url(${TOPO_SVG})`,
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskSize: 'cover',
        WebkitMaskSize: 'cover',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  );
}

export function TopographicBackground() {
  const prefersReduced = useReducedMotion();

  // Only enable the interactive spotlight on devices with a fine pointer
  // (mouse/trackpad) — a touch device has no cursor to follow.
  const [finePointer, setFinePointer] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    const update = () => setFinePointer(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const interactive = finePointer && !prefersReduced;

  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);
  // Spring-smooth the spotlight so it trails the cursor pleasantly.
  const x = useSpring(mouseX, { stiffness: 350, damping: 40 });
  const y = useSpring(mouseY, { stiffness: 350, damping: 40 });

  useEffect(() => {
    if (!interactive) return;
    const onMove = (e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [interactive, mouseX, mouseY]);

  // Radial mask centred on the (spring-smoothed) cursor: opaque within the
  // radius, transparent beyond, so the accent layer only shows near the cursor.
  const maskImage = useMotionTemplate`radial-gradient(${SPOTLIGHT_RADIUS}px circle at ${x}px ${y}px, #000 0%, transparent 70%)`;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base layer — always visible, low opacity. Drifts on a slow diagonal
          parallax unless reduced motion is preferred. */}
      <ContourField
        className={`absolute inset-[-10%] size-[120%] text-muted opacity-20 ${
          prefersReduced ? '' : 'topo-drift'
        }`}
      />

      {/* Glow layer — accent-coloured, revealed only through the cursor mask.
          The spotlight mask is composited over the contour mask on a nested
          wrapper. LazyMotion + m.div loads just the DOM-animation features. */}
      {interactive && (
        <LazyMotion features={domAnimation} strict>
          <m.div
            className="absolute inset-0"
            style={{
              maskImage,
              WebkitMaskImage: maskImage,
            }}
          >
            <ContourField className="absolute inset-[-10%] size-[120%] text-accent-start opacity-70 topo-drift" />
          </m.div>
        </LazyMotion>
      )}
    </div>
  );
}
