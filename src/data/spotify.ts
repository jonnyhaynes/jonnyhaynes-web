import { useEffect, useState } from 'react';

export type SpotifyArtist = {
  name: string;
  url: string | null;
  image: string | null;
  genres: string[];
};

export type SpotifyTrack = {
  title: string;
  artist: string;
  url: string | null;
  albumArt: string | null;
};

export type SpotifyTop = {
  fetchedAt: string;
  timeRange: string;
  artists: SpotifyArtist[];
  tracks: SpotifyTrack[];
};

export type NowPlaying = {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  url?: string | null;
  albumArt?: string | null;
};

/**
 * Loads the baked top artists/tracks snapshot. Returns null while loading and
 * on failure so the music section degrades gracefully.
 */
export function useSpotifyTop(): SpotifyTop | null {
  const [data, setData] = useState<SpotifyTop | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/spotify-top.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json: SpotifyTop) => {
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
 * Polls the live /api/now-playing function. Returns null while loading / on
 * failure; the hero chip only renders when something is actually playing.
 */
export function useNowPlaying(intervalMs = 60_000): NowPlaying | null {
  const [data, setData] = useState<NowPlaying | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      fetch('/api/now-playing')
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((json: NowPlaying) => {
          if (!cancelled) setData(json);
        })
        .catch(() => {});
    };

    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return data;
}
