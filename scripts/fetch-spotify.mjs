// Fetches Spotify top artists + top tracks (last ~4 weeks) and writes
// public/data/spotify-top.json, plus saved audiobooks → spotify-audiobooks.json.
//
// Run:
//   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy SPOTIFY_REFRESH_TOKEN=zzz \
//     node scripts/fetch-spotify.mjs
//
// The audiobooks fetch needs the `user-library-read` scope on the refresh
// token; if it's missing the audiobooks call 403s and we write an empty list
// (the reading section degrades to hidden) rather than failing the whole bake.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;
const TIME_RANGE = 'short_term'; // ~last 4 weeks
const LIMIT = 8;
const OUT = 'public/data/spotify-top.json';
const OUT_AUDIOBOOKS = 'public/data/spotify-audiobooks.json';

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error(
    'Missing env vars: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN',
  );
  process.exit(1);
}

/** Exchange the long-lived refresh token for a fresh access token. */
async function getAccessToken() {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN,
    }).toString(),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

async function topItems(token, type) {
  const url =
    `https://api.spotify.com/v1/me/top/${type}?` +
    new URLSearchParams({ time_range: TIME_RANGE, limit: String(LIMIT) });
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Top ${type} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return json.items;
}

/**
 * Smallest image at least `minWidth` wide (or the largest available if none
 * reach it), picking the tightest fit to avoid shipping oversized art. Default
 * 64px suits the compact avatar/thumbnail grids; pass a larger minWidth for
 * bigger tiles (e.g. the reading covers) so they aren't upscaled and blurry.
 */
function pickImage(images, minWidth = 64) {
  if (!images?.length) return null;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (sorted.find((i) => (i.width ?? 0) >= minWidth) ?? sorted[sorted.length - 1]).url;
}

/**
 * Modal genre across the top artists — the "Current Vibe: [Genre]" string.
 * Returns null when no artist carries genre data.
 */
function topGenre(artists) {
  const counts = new Map();
  for (const a of artists) {
    for (const g of a.genres ?? []) {
      counts.set(g, (counts.get(g) ?? 0) + 1);
    }
  }
  let best = null;
  let bestCount = 0;
  for (const [genre, count] of counts) {
    if (count > bestCount) {
      best = genre;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Latest saved audiobooks for the reading section. Needs `user-library-read`;
 * on 403 (scope not granted) returns [] so the bake still succeeds.
 *
 * Note: Spotify's /me/audiobooks returns items in most-recently-saved order but
 * exposes NO added_at timestamp and NO reading-progress API — so "latest I've
 * been reading" is approximated as the 4 most-recently-saved (the API's
 * default order), newest first.
 */
async function savedAudiobooks(token) {
  const url = 'https://api.spotify.com/v1/me/audiobooks?limit=4';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 403) {
    console.warn(
      'Audiobooks: 403 (user-library-read scope not granted). Writing empty list.',
    );
    return [];
  }
  if (!res.ok) {
    throw new Error(`Audiobooks failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  return (json.items ?? []).map((b) => ({
    title: b.name,
    authors: b.authors?.map((a) => a.name).join(', ') ?? '',
    url: b.external_urls?.spotify ?? null,
    // Larger min: the reading tiles are portrait and are the section's visual
    // hero. A small thumb upscales and looks blurry, and a 2-col tile on a big
    // phone can exceed 300px — so target the largest (~640px) Spotify offers.
    cover: pickImage(b.images, 640),
  }));
}

/**
 * Metadata for one "Coding Fuel" playlist (public — no extra scope), used to
 * render a themed card instead of a Spotify iframe. Returns null on failure so
 * a card degrades to a plain link.
 */
async function fetchPlaylist(token, id, label) {
  const url = `https://api.spotify.com/v1/playlists/${id}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    console.warn(`Playlist ${id} (${label}) failed: ${res.status}`);
    return { label, id, name: label, url: null, cover: null, trackCount: null };
  }
  const p = await res.json();
  return {
    label,
    id,
    name: p.name ?? label,
    url: p.external_urls?.spotify ?? `https://open.spotify.com/playlist/${id}`,
    cover: pickImage(p.images),
  };
}

// The two "Coding Fuel" playlists (must match src/content/spotify.ts).
// Own playlists (not Spotify's 37i9 editorial ones, which the API 404s).
const CODING_PLAYLISTS = [
  { label: 'Flow State', id: '1Aq9wLP1IcxVjnDPTd4IGG' },
  { label: 'Friday Deploy', id: '2aLjAGfDJ9O5gtBxwrDfA1' },
];

async function main() {
  console.log('Fetching Spotify top items…');
  const token = await getAccessToken();

  const [artists, tracks, audiobooks, playlists] = await Promise.all([
    topItems(token, 'artists'),
    topItems(token, 'tracks'),
    savedAudiobooks(token),
    Promise.all(
      CODING_PLAYLISTS.map((p) => fetchPlaylist(token, p.id, p.label)),
    ),
  ]);

  const payload = {
    fetchedAt: new Date().toISOString(),
    timeRange: TIME_RANGE,
    topGenre: topGenre(artists),
    artists: artists.map((a) => ({
      name: a.name,
      url: a.external_urls?.spotify ?? null,
      image: pickImage(a.images),
    })),
    tracks: tracks.map((t) => ({
      title: t.name,
      artist: t.artists?.map((a) => a.name).join(', ') ?? '',
      url: t.external_urls?.spotify ?? null,
      albumArt: pickImage(t.album?.images),
    })),
    playlists,
  };

  const audiobooksPayload = {
    fetchedAt: new Date().toISOString(),
    audiobooks,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(
    OUT_AUDIOBOOKS,
    `${JSON.stringify(audiobooksPayload, null, 2)}\n`,
  );
  console.log(
    `Wrote ${OUT}: ${payload.artists.length} artists, ${payload.tracks.length} tracks` +
      (payload.topGenre ? `, top genre "${payload.topGenre}"` : ', no genre data') +
      `, ${playlists.length} playlists` +
      `\nWrote ${OUT_AUDIOBOOKS}: ${audiobooks.length} audiobooks`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
