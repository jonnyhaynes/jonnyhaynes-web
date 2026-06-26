// Fetches Spotify top artists + top tracks (last ~4 weeks) and writes
// public/data/spotify-top.json.
//
// Run:
//   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy SPOTIFY_REFRESH_TOKEN=zzz \
//     node scripts/fetch-spotify.mjs

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;
const TIME_RANGE = 'short_term'; // ~last 4 weeks
const LIMIT = 8;
const OUT = 'public/data/spotify-top.json';

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

/** Smallest image >= 64px (or the smallest available) for a compact grid. */
function pickImage(images) {
  if (!images?.length) return null;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (sorted.find((i) => (i.width ?? 0) >= 64) ?? sorted[0]).url;
}

async function main() {
  console.log('Fetching Spotify top items…');
  const token = await getAccessToken();

  const [artists, tracks] = await Promise.all([
    topItems(token, 'artists'),
    topItems(token, 'tracks'),
  ]);

  const payload = {
    fetchedAt: new Date().toISOString(),
    timeRange: TIME_RANGE,
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
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Wrote ${OUT}: ${payload.artists.length} artists, ${payload.tracks.length} tracks`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
