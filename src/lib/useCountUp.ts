import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from './useReducedMotion';

/**
 * Unhurried on purpose. These figures are the point of the column rather than
 * something to be got past, so the count is given room to be read.
 */
const DURATION_MS = 2000;

/**
 * Counts a figure up from zero the first time it scrolls into view.
 *
 * Scroll-triggered rather than on mount because this section sits below the fold:
 * counting on mount, or when the fetch resolves, would run the whole animation
 * where nobody can see it.
 *
 * The displayed value is `value` until the count starts, so the DOM always holds
 * the true figure — a snapshot mid-way through the animation is the only time it
 * shows anything else, and only for as long as it takes to count.
 *
 * Reduced motion skips straight to the value: the number is the point, the count
 * is decoration.
 */
export function useCountUp(value: number | null) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (value == null || reduced) return;

    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    let frame = 0;
    let startedAt = 0;

    const tick = (now: number) => {
      if (!startedAt) startedAt = now;
      const progress = Math.min(1, (now - startedAt) / DURATION_MS);
      // Ease out cubic: quick off the mark, settling onto the number.
      setDisplay(Math.round((1 - (1 - progress) ** 3) * value));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setAnimating(false);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setAnimating(true);
        frame = requestAnimationFrame(tick);
      },
      // Half the figure visible — late enough that it's genuinely being read.
      { threshold: 0.5 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, reduced]);

  return { ref, display: animating ? display : (value ?? 0) };
}
