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
 * A low-opacity contour field sits behind everything. On fine-pointer devices
 * that allow motion, a second accent-coloured copy is revealed only through a
 * radial mask that follows the cursor (a ~300px "spotlight"), and the whole
 * field drifts on a slow diagonal parallax. On touch devices or when the user
 * prefers reduced motion, we render just the static base layer — no pointer
 * listeners, no animation.
 *
 * The contour artwork is an inline tiling <pattern>, so it scales to any size
 * with zero network cost and inherits currentColor for theming.
 */

const SPOTLIGHT_RADIUS = 300;

/** The repeating contour tile, shared by the base and glow layers. */
function ContourField({
  className,
  patternId,
}: {
  className?: string;
  patternId: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern
          id={patternId}
          x="0"
          y="0"
          width="400"
          height="400"
          patternUnits="userSpaceOnUse"
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          >
            <path d="M-20 120 C 80 60, 180 180, 300 110 S 460 40, 560 120" />
            <path d="M-20 170 C 90 120, 170 220, 300 160 S 450 100, 560 170" />
            <path d="M-20 230 C 70 180, 200 280, 300 220 S 470 170, 560 230" />
            <path d="M-20 300 C 100 250, 180 350, 300 290 S 440 240, 560 300" />
            <path d="M40 -10 C 120 60, 60 160, 140 240 S 100 360, 180 430" />
            <path d="M260 -10 C 340 70, 280 170, 360 250 S 320 370, 400 430" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
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
        patternId="topo-base"
        className={`absolute inset-[-10%] size-[120%] text-muted opacity-[0.07] ${
          prefersReduced ? '' : 'topo-drift'
        }`}
      />

      {/* Glow layer — accent-coloured, revealed only through the cursor mask.
          LazyMotion + m.div loads just the DOM-animation features we need,
          keeping the full motion component out of the bundle. */}
      {interactive && (
        <LazyMotion features={domAnimation} strict>
          <m.div
            className="absolute inset-0"
            style={{
              maskImage,
              WebkitMaskImage: maskImage,
            }}
          >
            <ContourField
              patternId="topo-glow"
              className="absolute inset-[-10%] size-[120%] text-accent-start opacity-40 topo-drift"
            />
          </m.div>
        </LazyMotion>
      )}
    </div>
  );
}
