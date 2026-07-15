import { useEffect, useState } from 'react';

/** One recently-played game tile, normalised across Steam and Xbox. */
export type GameTile = {
  title: string;
  platform: 'steam' | 'xbox';
  coverUrl: string | null;
  /**
   * ISO string of when it was last played. Xbox (OpenXBL) provides this; Steam's
   * recently-played endpoint does not, so Steam tiles carry null and are ordered
   * by recent playtime at bake time instead.
   */
  lastPlayed: string | null;
  url: string | null;
};

export type GamingData = {
  fetchedAt: string;
  games: GameTile[];
};

/**
 * Loads the baked gaming snapshot from public/data/gaming.json. Returns null
 * while loading and on any failure so the section degrades to hidden — an API
 * (or the third-party Xbox service) being down can never break the page.
 */
export function useGamingData(): GamingData | null {
  const [data, setData] = useState<GamingData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/gaming.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json: GamingData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

/**
 * The games to show, capped at `limit`. Baked data is already merge-ordered
 * (Xbox by last-played, then Steam by recent playtime). Returns [] when data is
 * absent so the section degrades gracefully.
 */
export function recentGames(data: GamingData | null, limit = 6): GameTile[] {
  if (!data) return [];
  return data.games.slice(0, limit);
}
