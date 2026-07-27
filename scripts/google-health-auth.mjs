// One-time local helper to capture a Google Health API refresh token.
//
// Usage:
//   GOOGLE_HEALTH_CLIENT_ID=xxx GOOGLE_HEALTH_CLIENT_SECRET=yyy \
//     node scripts/google-health-auth.mjs
//
// Runs Google's OAuth 2.0 Authorization Code flow: starts a local server on
// 127.0.0.1:8889, prints an authorize URL, and after you approve in the
// browser exchanges the code and prints your refresh token.
//
// Store that token as the GOOGLE_HEALTH_REFRESH_TOKEN secret. You only need to
// run this once. Unlike Fitbit, Google does NOT rotate the refresh token on a
// normal refresh, so the bake job never has to persist a new one — the token
// lasts until it is explicitly revoked or ~6 months unused (Production apps).
//
// IMPORTANT (Google Cloud console, by Jonny):
//   - OAuth 2.0 Client ID of type "Web application".
//   - Add http://127.0.0.1:8889/callback as an Authorized redirect URI.
//   - On the Data Access page, add the three googlehealth read scopes below.
//   - Add yourself as a test user for the initial local auth.
//   - `access_type=offline` + `prompt=consent` are required to be issued a
//     refresh token (and to be re-issued one on repeat runs).

import { createServer } from 'node:http';

const CLIENT_ID = process.env.GOOGLE_HEALTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
const REDIRECT_URI = 'http://127.0.0.1:8889/callback';
const PORT = 8889;

// Read-only scopes covering the four tiles:
//   activity_and_fitness      → steps + active minutes
//   sleep                     → sleep sessions
//   health_metrics_and_measurements → resting heart rate
const SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
].join(' ');

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    'Missing env vars. Run with:\n' +
      '  GOOGLE_HEALTH_CLIENT_ID=xxx GOOGLE_HEALTH_CLIENT_SECRET=yyy node scripts/google-health-auth.mjs',
  );
  process.exit(1);
}

const authorizeUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
  }).toString();

async function exchangeCode(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
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
    if (!tokens.refresh_token) {
      // Google only returns a refresh token with access_type=offline AND a
      // fresh consent — if the app was already authorised without prompt it
      // may be omitted. prompt=consent above forces it; warn just in case.
      console.error(
        '\n⚠️  No refresh_token in the response. Re-run after revoking prior ' +
          'access, and ensure prompt=consent / access_type=offline are set.',
      );
      server.close();
      process.exit(1);
    }
    console.log('\n✅ Success! Add this to your secrets:\n');
    console.log(`GOOGLE_HEALTH_REFRESH_TOKEN=${tokens.refresh_token}\n`);
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
  console.log('Google Health auth helper listening on http://127.0.0.1:8889');
  console.log('\nOpen this URL in your browser and approve:\n');
  console.log(authorizeUrl);
  console.log('\nWaiting for the callback…');
});
