import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Whether this is the client render rather than the server one. The server snapshot
 * is `false` and stays `false` through hydration, then reads `true` — so behaviour
 * that can only exist once JavaScript is running (a tab list, a one-shot reveal) is
 * layered on top of a server render that already carries all the content, without a
 * state-setting effect and without a hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
