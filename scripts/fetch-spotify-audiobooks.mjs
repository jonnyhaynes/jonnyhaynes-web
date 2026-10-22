// Fetches the latest saved audiobooks from Spotify and writes
// public/data/spotify-audiobooks.json for the desk bookshelf.
//
// Run:
//   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy SPOTIFY_REFRESH_TOKEN=zzz \
//     node scripts/fetch-spotify-audiobooks.mjs
//
// The audiobooks call needs the `user-library-read` scope on the refresh token;
// if it is missing the call 403s and we write an empty list so the desk falls
// back to its hand-authored shelf rather than failing the bake. The shelf uses
// the site palette, so no cover-colour extraction is needed here.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;
const LIMIT = 3;
const OUT = 'public/data/spotify-audiobooks.json';

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

/**
 * Smallest image at least `minWidth` wide (or the largest available if none
 * reach it), so the shelf isn't shipped oversized art.
 */
function pickImage(images, minWidth = 640) {
  if (!images?.length) return null;
  const sorted = [...images].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (sorted.find((i) => (i.width ?? 0) >= minWidth) ?? sorted[sorted.length - 1]).url;
}

/**
 * Latest saved audiobooks. Spotify returns them in most-recently-saved order
 * (there is no added_at timestamp), so the first three are the latest.
 * Needs `user-library-read`; on 403 returns [] so the shelf keeps its fallback.
 */
async function savedAudiobooks(token) {
  const url = `https://api.spotify.com/v1/me/audiobooks?limit=${LIMIT}`;
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
    cover: pickImage(b.images),
  }));
}

async function main() {
  console.log('Fetching saved audiobooks…');
  const token = await getAccessToken();
  const audiobooks = await savedAudiobooks(token);

  const payload = {
    fetchedAt: new Date().toISOString(),
    audiobooks,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${OUT}: ${audiobooks.length} audiobooks`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
