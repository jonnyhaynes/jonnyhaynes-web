import { useEffect, useState, useSyncExternalStore } from 'react';

export type AssetState = 'pending' | 'ok' | 'error';

export type Asset = {
  name: string;
  state: AssetState;
  /** Round-trip time in ms, or null while pending / on failure. */
  ms: number | null;
};

const assets = new Map<string, Asset>();
const listeners = new Set<() => void>();
const EMPTY: readonly Asset[] = [];

/** Cached so useSyncExternalStore sees a stable reference until something changes. */
let snapshot: readonly Asset[] = EMPTY;

function publish() {
  snapshot = [...assets.values()];
  for (const listener of listeners) listener();
}

function record(asset: Asset) {
  assets.set(asset.name, asset);
  publish();
}

/**
 * `fetch` that reports itself to the asset registry, so the readout in the panel
 * lists what the page actually fetched rather than a guess.
 *
 * Only the *first* request for a name reports `pending` — the now-playing poll
 * refreshes on a timer, and without that guard the readout would flicker back to
 * pending on every poll.
 *
 * Rejections are re-thrown so callers keep their existing graceful-degradation
 * behaviour.
 */
export function fetchAsset(name: string, url: string): Promise<Response> {
  const started = performance.now();

  if (!assets.has(name)) record({ name, state: 'pending', ms: null });

  const settle = (asset: Asset) => record(asset);

  return fetch(url).then(
    (response) => {
      if (!response.ok) {
        settle({ name, state: 'error', ms: null });
        throw new Error(`${name}: ${response.status}`);
      }
      settle({
        name,
        state: 'ok',
        ms: Math.round(performance.now() - started),
      });
      return response;
    },
    (error: unknown) => {
      settle({ name, state: 'error', ms: null });
      throw error;
    },
  );
}

/**
 * In-flight/finished JSON requests, keyed by asset name.
 *
 * Several components want the same snapshot (the activity chip, the status strip,
 * the projects grid and the skills bar all read github.json), and without this
 * each would fetch its own copy. Sharing one promise per name means one request
 * on the wire, one row in the readout, and consistent data across the page.
 */
const cache = new Map<string, Promise<unknown>>();

/** The shared JSON request for `name`, started on first use. */
export function loadAsset<T>(name: string, url: string): Promise<T> {
  const existing = cache.get(name);
  if (existing) return existing as Promise<T>;

  const promise = fetchAsset(name, url).then((response) => response.json() as Promise<T>);
  cache.set(name, promise);
  return promise;
}

/**
 * Loads a baked JSON snapshot from the shared cache, returning `null` while it's
 * in flight and on failure. Every data hook is built on this so a missing or
 * failed bake degrades to a hidden or empty section rather than an error.
 */
export function useAsset<T>(name: string, url: string): T | null {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAsset<T>(name, url)
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        // Leave data null; the section renders its own empty state.
      });
    return () => {
      cancelled = true;
    };
  }, [name, url]);

  return data;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): readonly Asset[] {
  return snapshot;
}

/** Nothing has been fetched on the server, and the prerender should say nothing. */
function getServerSnapshot(): readonly Asset[] {
  return EMPTY;
}

/** The live registry, in first-request order. */
export function useAssets(): readonly Asset[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
