// Vercel serverless function: returns the currently-playing track, or the
// most recently played if nothing is playing. Refreshes the Spotify access
// token server-side using the long-lived refresh token (secrets never reach
// the browser).
//
// GET /api/now-playing → { isPlaying, title, artist, url, albumArt } | { isPlaying: false }

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_URL = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENT_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';
const AUDIO_FEATURES_URL = 'https://api.spotify.com/v1/audio-features';

async function getAccessToken() {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
  const basic = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`,
  ).toString('base64');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: SPOTIFY_REFRESH_TOKEN,
    }).toString(),
  });
  if (!res.ok) throw new Error(`token refresh ${res.status}`);
  const json = await res.json();
  return json.access_token;
}

function trackShape(track, isPlaying, progressMs = null) {
  return {
    isPlaying,
    title: track.name,
    artist: track.artists?.map((a) => a.name).join(', ') ?? '',
    url: track.external_urls?.spotify ?? null,
    albumArt: track.album?.images?.[0]?.url ?? null,
    trackId: track.id ?? null,
    progressMs,
    durationMs: track.duration_ms ?? null,
  };
}

// Best-effort audio-features lookup. Spotify restricted this endpoint for apps
// registered after Nov 2024; on any failure we return nulls so every dependent
// visual (tempo-driven equalizer, energy/valence/danceability meters) degrades
// gracefully rather than breaking the section.
async function audioFeatures(trackId, auth) {
  if (!trackId) return null;
  try {
    const res = await fetch(`${AUDIO_FEATURES_URL}/${trackId}`, auth);
    if (res.status !== 200) return null;
    const f = await res.json();
    return {
      tempo: typeof f.tempo === 'number' ? f.tempo : null,
      energy: typeof f.energy === 'number' ? f.energy : null,
      valence: typeof f.valence === 'number' ? f.valence : null,
      danceability: typeof f.danceability === 'number' ? f.danceability : null,
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // Short cache: real-time-ish without hammering Spotify on every page view.
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  try {
    const token = await getAccessToken();
    const auth = { headers: { Authorization: `Bearer ${token}` } };

    const playing = await fetch(NOW_PLAYING_URL, auth);

    // 200 with a body means something is (or was just) loaded in the player.
    if (playing.status === 200) {
      const data = await playing.json();
      if (data?.item && data.is_playing) {
        const shape = trackShape(data.item, true, data.progress_ms ?? null);
        // Only enrich the actively-playing track — progress and tempo are
        // meaningless for a paused/recent track.
        shape.audioFeatures = await audioFeatures(shape.trackId, auth);
        return res.status(200).json(shape);
      }
    }

    // Nothing playing (204 or paused) — fall back to most recently played.
    const recent = await fetch(RECENT_URL, auth);
    if (recent.status === 200) {
      const data = await recent.json();
      const track = data?.items?.[0]?.track;
      if (track) return res.status(200).json(trackShape(track, false));
    }

    return res.status(200).json({ isPlaying: false });
  } catch {
    // Degrade gracefully — the section just won't show a now-playing chip.
    return res.status(200).json({ isPlaying: false });
  }
}
