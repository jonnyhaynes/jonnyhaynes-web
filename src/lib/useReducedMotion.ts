import { useEffect, useState } from 'react';

/**
 * Tracks the user's `prefers-reduced-motion` setting, updating live if it
 * changes. Returns `true` when the user has asked for reduced motion, so callers
 * can skip animations and render final state at once.
 *
 * SSR-safe: falls back to `false` when `matchMedia` is unavailable.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
