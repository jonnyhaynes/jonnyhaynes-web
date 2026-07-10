// One-time local helper to capture a Spotify refresh token.
//
// Usage:
//   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/spotify-auth.mjs
//
// It starts a local server on 127.0.0.1:8888, prints an authorize URL, and
// after you approve in the browser, exchanges the code and prints your
// long-lived refresh token. Store that token as the SPOTIFY_REFRESH_TOKEN
// secret. You only need to run this once.

import { createServer } from 'node:http';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const PORT = 8888;

// Scopes: top artists/tracks + currently-playing + recently-played, plus
// user-library-read for saved audiobooks (the reading section).
const SCOPES = [
  'user-top-read',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-library-read',
].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Missing env vars. Run with:\n' +
      '  SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/spotify-auth.mjs',
  );
  process.exit(1);
}

const authorizeUrl =
  'https://accounts.spotify.com/authorize?' +
  new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    show_dialog: 'true',
  }).toString();

async function exchangeCode(code) {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }).toString(),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname !== '/callback') {
    res.writeHead(404).end('Not found');
    return;
  }

  const error = url.searchParams.get('error');
  const code = url.searchParams.get('code');

  if (error) {
    res.writeHead(400).end(`Authorization failed: ${error}`);
    console.error(`\nAuthorization failed: ${error}`);
    server.close();
    process.exit(1);
  }

  try {
    const tokens = await exchangeCode(code);
    res.writeHead(200, { 'Content-Type': 'text/html' }).end(
      '<h1>Done.</h1><p>You can close this tab and return to the terminal.</p>',
    );
    console.log('\n✅ Success! Add this to your secrets:\n');
    console.log(`SPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    console.log(`(access token expires in ${tokens.expires_in}s; granted scopes: ${tokens.scope})`);
    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500).end('Token exchange failed — see terminal.');
    console.error(err);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Spotify auth helper listening on http://127.0.0.1:8888');
  console.log('\nOpen this URL in your browser and approve:\n');
  console.log(authorizeUrl);
  console.log('\nWaiting for the callback…');
});
