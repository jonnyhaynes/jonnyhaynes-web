import { useEffect, useState } from 'react';

export type SpotifyArtist = {
  name: string;
  url: string | null;
  image: string | null;
};

export type SpotifyTrack = {
  title: string;
  artist: string;
  url: string | null;
  albumArt: string | null;
};

/** A "Coding Fuel" playlist, baked from the Spotify playlist API. */
export type SpotifyPlaylist = {
  label: string;
  id: string;
  name: string;
  url: string | null;
  cover: string | null;
};

export type SpotifyTop = {
  fetchedAt: string;
  timeRange: string;
  /** Modal genre across top artists — the "Current Vibe" string. Null if absent. */
  topGenre: string | null;
  artists: SpotifyArtist[];
  tracks: SpotifyTrack[];
  /** Coding-fuel playlists (may be absent in older baked data). */
  playlists?: SpotifyPlaylist[];
};

/** Musical character of a track (0–1 unless noted). Null when the audio-features
 * endpoint is unavailable — every consumer must degrade gracefully. */
export type SpotifyAudioFeatures = {
  /** Beats per minute. */
  tempo: number | null;
  energy: number | null;
  /** Musical positivity/mood. */
  valence: number | null;
  danceability: number | null;
};

export type NowPlaying = {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  url?: string | null;
  albumArt?: string | null;
  trackId?: string | null;
  /** Playback position at fetch time (ms); interpolated client-side thereafter. */
  progressMs?: number | null;
  durationMs?: number | null;
  /** Present only for the actively-playing track; null on API failure. */
  audioFeatures?: SpotifyAudioFeatures | null;
};

export type SpotifyAudiobook = {
  title: string;
  authors: string;
  url: string | null;
  cover: string | null;
};

export type SpotifyAudiobooks = {
  fetchedAt: string;
  audiobooks: SpotifyAudiobook[];
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
 * Loads the baked saved-audiobooks snapshot for the reading section. Returns
 * null while loading / on failure so the section degrades to hidden (also the
 * case before the widened-scope re-auth has happened).
 */
export function useSpotifyAudiobooks(): SpotifyAudiobooks | null {
  const [data, setData] = useState<SpotifyAudiobooks | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/spotify-audiobooks.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json: SpotifyAudiobooks) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

/** Slow poll when paused/idle — nothing is changing fast. */
const IDLE_POLL_MS = 60_000;
/** Never poll more often than this, even on a nearly-finished track. */
const MIN_POLL_MS = 10_000;
/** Buffer past the reported track end so the next track has registered. */
const END_BUFFER_MS = 2_000;

/**
 * Polls the live /api/now-playing function on a *self-scheduling* timer: while a
 * track is playing it aims the next poll at the track's end (so fresh artwork /
 * metadata appear right when the song changes), clamped to [MIN_POLL_MS,
 * IDLE_POLL_MS]; when paused or idle it backs off to IDLE_POLL_MS. Returns null
 * while loading / on failure so the section degrades gracefully.
 */
export function useNowPlaying(): NowPlaying | null {
  const [data, setData] = useState<NowPlaying | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    // Decide how long to wait before the next poll based on the response.
    const nextDelay = (d: NowPlaying | null): number => {
      if (!d?.isPlaying || d.progressMs == null || d.durationMs == null) {
        return IDLE_POLL_MS;
      }
      const remaining = d.durationMs - d.progressMs + END_BUFFER_MS;
      return Math.min(IDLE_POLL_MS, Math.max(MIN_POLL_MS, remaining));
    };

    const poll = () => {
      fetch('/api/now-playing')
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((json: NowPlaying) => {
          if (cancelled) return;
          setData(json);
          timer = setTimeout(poll, nextDelay(json));
        })
        .catch(() => {
          // On failure, retry on the slow cadence rather than giving up.
          if (!cancelled) timer = setTimeout(poll, IDLE_POLL_MS);
        });
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return data;
}

/**
 * Interpolates the live playback position between 60s polls so a progress bar
 * advances smoothly. Anchors on the poll's progressMs and ticks every second,
 * clamped to durationMs. Returns null when not playing or data is missing, so
 * the progress bar simply doesn't render. Resets whenever the track or reported
 * position changes (i.e. on each fresh poll).
 */
export function usePlaybackPosition(data: NowPlaying | null): number | null {
  // Elapsed-since-anchor, bumped only from the interval callback (never
  // synchronously in the effect body — that triggers cascading renders).
  const [tick, setTick] = useState(0);

  const playing = data?.isPlaying ?? false;
  const anchorMs = data?.progressMs ?? null;
  const durationMs = data?.durationMs ?? null;
  const trackId = data?.trackId ?? null;

  useEffect(() => {
    if (!playing || anchorMs == null || durationMs == null) return;

    const anchoredAt = performance.now();
    // Force a re-derive each second; the actual position is computed below so
    // no state need be written synchronously here.
    const id = setInterval(() => setTick(performance.now() - anchoredAt), 1000);
    return () => clearInterval(id);
    // trackId included so a track change with an identical progressMs still resets.
  }, [playing, anchorMs, durationMs, trackId]);

  if (!playing || anchorMs == null || durationMs == null) return null;
  return Math.min(anchorMs + tick, durationMs);
}
