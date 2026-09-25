import { useCallback, useSyncExternalStore } from 'react';

/**
 * A media query as a boolean, updating live.
 *
 * Built on `useSyncExternalStore` exactly like `useReducedMotion`, and for the same
 * reason: the live subscription, an SSR-safe read that never touches `window` during the
 * server render, and a dedicated hydration value. The server snapshot is `false`, so the
 * prerendered markup and the first hydrated render agree, and a layout that wants the
 * query to hold renders its fallback first.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      const mediaQuery = window.matchMedia?.(query);
      if (!mediaQuery) return () => {};
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia?.(query).matches ?? false,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
