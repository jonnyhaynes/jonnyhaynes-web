import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(listener: () => void) {
  const mediaQuery = window.matchMedia?.(QUERY);
  if (!mediaQuery) return () => {};
  mediaQuery.addEventListener('change', listener);
  return () => mediaQuery.removeEventListener('change', listener);
}

function getSnapshot(): boolean {
  return window.matchMedia?.(QUERY).matches ?? false;
}

/**
 * The value used for the server render and for the hydration pass. Reduced motion
 * is a client capability, so the server assumes the default and the real value
 * arrives on the next render — which keeps prerendered markup and the first
 * hydrated render identical instead of mismatching for anyone who has it set.
 */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Tracks the user's `prefers-reduced-motion` setting, updating live if it
 * changes. Returns `true` when the user has asked for reduced motion, so callers
 * can skip animations and render final state at once.
 *
 * Built on `useSyncExternalStore` rather than state + effect: that gives the live
 * subscription, an SSR-safe read that never touches `window` during the server
 * render (the old `useState` initializer did, and threw), and a dedicated
 * hydration value. Same approach as the visualizers.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
