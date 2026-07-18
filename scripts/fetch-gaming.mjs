// Fetches recently-played games from Steam (official Web API) and Xbox (via the
// third-party OpenXBL service), normalises + merges them, and writes
// public/data/gaming.json.
//
// Run:
//   STEAM_API_KEY=xxx STEAM_ID=yyy XBL_API_KEY=zzz node scripts/fetch-gaming.mjs
//
// Design (mirrors fetch-spotify.mjs): each source is wrapped so a failure logs a
// warning and yields [] rather than failing the whole bake — one platform being
// down (or Xbox's third-party service being flaky) must never lose the other's
// data. If BOTH yield nothing we still write a valid { games: [] } file so the
// section degrades to hidden, not a 404.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;
const XBL_API_KEY = process.env.XBL_API_KEY;
const OUT = 'public/data/gaming.json';
const LIMIT = 7;

/**
 * Recently-played Steam games. Steam's endpoint gives playtime_2weeks but NO
 * last-played timestamp, so tiles carry lastPlayed: null and we sort by recent
 * playtime as a proxy. Cover art is the store header image, derived from appid.
 * Requires the profile + "game details" privacy to be Public, else returns [].
 */
async function fetchSteam() {
  if (!STEAM_API_KEY || !STEAM_ID) {
    console.warn('Steam: STEAM_API_KEY / STEAM_ID not set — skipping.');
    return [];
  }
  try {
    const url =
      'https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?' +
      new URLSearchParams({ key: STEAM_API_KEY, steamid: STEAM_ID });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    const games = json.response?.games ?? [];
    return games
      .slice()
      .sort((a, b) => (b.playtime_2weeks ?? 0) - (a.playtime_2weeks ?? 0))
      .map((g) => ({
        title: g.name,
        platform: 'steam',
        coverUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
        lastPlayed: null,
        url: `https://store.steampowered.com/app/${g.appid}`,
        _recentMins: g.playtime_2weeks ?? 0,
      }));
  } catch (err) {
    console.warn(`Steam: fetch failed (${err.message}) — writing no Steam games.`);
    return [];
  }
}

/**
 * Recently-played Xbox titles via OpenXBL (xbl.io). Unlike Steam, this exposes a
 * real last-played timestamp. Coded defensively against a third-party shape:
 * anything missing/unparseable is skipped rather than crashing the bake.
 */
async function fetchXbox() {
  if (!XBL_API_KEY) {
    console.warn('Xbox: XBL_API_KEY not set — skipping.');
    return [];
  }
  try {
    const res = await fetch('https://xbl.io/api/v2/player/titleHistory', {
      headers: {
        'X-Authorization': XBL_API_KEY,
        Accept: 'application/json',
        // OpenXBL's upstream (Xbox Live) rejects the runtime's default
        // `Accept-Language: *` as an invalid locale, so set an explicit one.
        'Accept-Language': 'en-US',
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const json = await res.json();
    // OpenXBL always wraps the payload in a { content, code } envelope and
    // returns HTTP 200 even for errors — so res.ok never catches a bad request.
    // On success `content` holds the payload ({ titles: [...] }); on error it's
    // the message string and `code` is the real 4xx. Surface non-200 as a
    // failure so the section never silently empties again.
    if (json.code !== 200 || !Array.isArray(json.content?.titles)) {
      throw new Error(`OpenXBL error ${json.code ?? '?'}: ${JSON.stringify(json.content)}`);
    }
    const titles = json.content.titles;
    return titles
      .map((t) => {
        const lastPlayed = t.titleHistory?.lastTimePlayed ?? null;
        return {
          title: t.name,
          platform: 'xbox',
          // Xbox art comes back as http:// — force https so it isn't blocked
          // as mixed content on the (https) site.
          coverUrl: t.displayImage ? t.displayImage.replace(/^http:/, 'https:') : null,
          lastPlayed,
          url: null,
          _ts: lastPlayed ? new Date(lastPlayed).getTime() : 0,
        };
      })
      .filter((g) => g.title)
      .sort((a, b) => b._ts - a._ts);
  } catch (err) {
    console.warn(`Xbox: fetch failed (${err.message}) — writing no Xbox games.`);
    return [];
  }
}

async function main() {
  console.log('Fetching recently-played games (Steam + Xbox)…');
  const [steam, xbox] = await Promise.all([fetchSteam(), fetchXbox()]);

  // Merge: Xbox games (real timestamps, newest first) lead, then Steam games by
  // recent playtime. A documented approximation — the two sources expose
  // different signals, so there's no single clean cross-platform sort key.
  const merged = [...xbox, ...steam]
    .slice(0, LIMIT)
    // Drop the internal sort helpers before serialising.
    .map(({ _ts, _recentMins, ...tile }) => tile);

  const payload = {
    fetchedAt: new Date().toISOString(),
    games: merged,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Wrote ${OUT}: ${merged.length} games ` +
      `(${xbox.length} Xbox, ${steam.length} Steam before cap).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
