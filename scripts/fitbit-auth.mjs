// One-time local helper to capture a Fitbit refresh token.
//
// Usage:
//   FITBIT_CLIENT_ID=xxx FITBIT_CLIENT_SECRET=yyy node scripts/fitbit-auth.mjs
//
// Fitbit's Authorization Code flow requires PKCE, so this helper generates a
// code_verifier / code_challenge pair, starts a local server on
// 127.0.0.1:8889, prints an authorize URL, and after you approve in the
// browser exchanges the code and prints your refresh token.
//
// Store that token as the FITBIT_REFRESH_TOKEN secret. You only need to run
// this once — thereafter the bake job rotates it automatically.
//
// IMPORTANT: register http://127.0.0.1:8889/callback as a Redirect URI on your
// Fitbit app (dev.fitbit.com → Manage My Apps), and use an OAuth 2.0
// Application Type of "Personal" so you get access to your own intraday data.

import { createServer } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';

const CLIENT_ID = process.env.FITBIT_CLIENT_ID;
const CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
const REDIRECT_URI = 'http://127.0.0.1:8889/callback';
const PORT = 8889;

// Scopes: activity (steps/active minutes), sleep, heartrate (resting HR),
// profile (display name / avatar if we ever want it).
const SCOPES = ['activity', 'heartrate', 'profile', 'sleep'].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Missing env vars. Run with:\n' +
      '  FITBIT_CLIENT_ID=xxx FITBIT_CLIENT_SECRET=yyy node scripts/fitbit-auth.mjs',
  );
  process.exit(1);
}

// PKCE: a 43–128 char verifier, and its base64url-encoded SHA-256 challenge.
const base64url = (buf) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const codeVerifier = base64url(randomBytes(64));
const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());

const authorizeUrl =
  'https://www.fitbit.com/oauth2/authorize?' +
  new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  }).toString();

async function exchangeCode(code) {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier,
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
    console.log(`FITBIT_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    console.log(
      `(access token expires in ${tokens.expires_in}s; granted scopes: ${tokens.scope})`,
    );
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
  console.log('Fitbit auth helper listening on http://127.0.0.1:8889');
  console.log('\nOpen this URL in your browser and approve:\n');
  console.log(authorizeUrl);
  console.log('\nWaiting for the callback…');
});
