// One-time local helper to capture a Garmin Connect OAuth token bundle.
// PURE NODE — no Python/garth. Store the printed one-line JSON as the
// GARMIN_TOKEN_BUNDLE secret; CI (scripts/fetch-health.mjs) authenticates with
// the bundle only, so your password never reaches CI.
//
// USAGE:
//   node scripts/garmin-auth.mjs
// Prompts for email + password. If your account has MFA enabled, it then
// prompts for the emailed/authenticator code. On success it prints ONE line of
// JSON to STDOUT (all human messages go to stderr) — store it verbatim.
//
// WHY THIS IS HAND-ROLLED (not just GCClient.login()):
//   garmin-connect v1.6.2 (the latest) logs in via the HTML embed-signin flow
//   and its MFA handler is a no-op stub — so it CANNOT complete login on an
//   MFA-enabled account (fails "Ticket not found or MFA"). So we drive Garmin's
//   *mobile JSON API* login directly here (the same endpoints garth uses, which
//   DO support MFA): POST /mobile/api/login → if MFA_REQUIRED, POST
//   /mobile/api/mfa/verifyCode → serviceTicketId. That ticket is then handed to
//   garmin-connect's own getOauth1Token()+exchange() (un-throttled connectapi
//   endpoints) to mint the {oauth1, oauth2} bundle. The bundle shape is
//   identical to what the library produces, so CI (loadToken) is untouched.
//
// Endpoints/constants verified against garth's current implementation and probed
// live (2026-08-27). See docs/plans/migrate-google-health-to-garmin.md.

import { createInterface } from 'node:readline/promises';
import { createHmac } from 'node:crypto';
import { stdin, stderr, argv } from 'node:process';
import axios from 'axios';
// CommonJS deps (already vendored by garmin-connect) — import defaults.
import OAuth from 'oauth-1.0a';
import qs from 'qs';

const SSO_HOST = 'https://sso.garmin.com';
const CLIENT_ID = 'GCM_ANDROID_DARK';
// The mobile "service" the ticket is scoped to — must match what the OAuth
// exchange (getOauth1Token) expects for a mobile ticket.
const SERVICE = 'https://mobile.integration.garmin.com/gcm/android';
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Mobile/15E148';
const LOGIN_PARAMS = { clientId: CLIENT_ID, locale: 'en-US', service: SERVICE };

// ── minimal cookie carry ──────────────────────────────────────────────────
// We only need to forward Set-Cookie name=value pairs across the 2–3 SSO calls
// (SESSION + Cloudflare cookies). A full tough-cookie jar is overkill for a
// one-shot local script, so we track pairs in a Map by hand.
const jar = new Map();
function mergeSetCookie(headers) {
  const sc = headers?.['set-cookie'];
  if (!sc) return;
  for (const line of sc) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}
const cookieHeader = () =>
  [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');

const sso = axios.create({
  headers: {
    'User-Agent': MOBILE_UA,
    Accept: 'application/json, text/html,*/*',
    'Accept-Language': 'en-US,en;q=0.9',
  },
  // Inspect 4xx bodies ourselves (Garmin returns JSON error shapes).
  validateStatus: () => true,
});

async function prompt(question, { silent = false } = {}) {
  const rl = createInterface({ input: stdin, output: stderr });
  if (!silent) {
    try {
      return await rl.question(question);
    } finally {
      rl.close();
    }
  }
  // Mute echo for password entry.
  stderr.write(question);
  const onData = (char) => {
    const s = char.toString();
    if (s === '\n' || s === '\r' || s === '\r\n') return;
    stderr.write(`\x1b[2K\x1b[200D${question}`);
  };
  stdin.on('data', onData);
  try {
    const answer = await rl.question('');
    stderr.write('\n');
    return answer;
  } finally {
    stdin.off('data', onData);
    rl.close();
  }
}

/**
 * Drive Garmin's mobile JSON API login → serviceTicketId. Handles the
 * MFA_REQUIRED branch by prompting for the code. Mirrors garth's flow.
 */
async function getServiceTicket(email, password) {
  // Step 1: prime cookies (SESSION + Cloudflare).
  let r = await sso.get(`${SSO_HOST}/mobile/sso/en/sign-in`, {
    params: { clientId: CLIENT_ID },
  });
  mergeSetCookie(r.headers);
  if (r.status !== 200) {
    throw new Error(`sign-in priming failed: HTTP ${r.status}`);
  }

  // Step 2: submit credentials.
  r = await sso.post(
    `${SSO_HOST}/mobile/api/login`,
    { username: email, password, rememberMe: false, captchaToken: '' },
    {
      params: LOGIN_PARAMS,
      headers: { Cookie: cookieHeader(), 'Content-Type': 'application/json' },
    },
  );
  mergeSetCookie(r.headers);
  const data = r.data;
  const type = data?.responseStatus?.type;

  if (type === 'SUCCESSFUL') {
    if (!data.serviceTicketId) throw new Error('SUCCESSFUL but no serviceTicketId');
    return data.serviceTicketId;
  }

  if (type === 'MFA_REQUIRED') {
    const method = data?.customerMfaInfo?.mfaLastMethodUsed || 'email';
    stderr.write(`\nMFA required (method: ${method}).\n`);
    const code = (await prompt('Enter your Garmin MFA code: ')).trim();
    if (!code) throw new Error('MFA code is required');

    // Step 3: verify the MFA code → serviceTicketId.
    const v = await sso.post(
      `${SSO_HOST}/mobile/api/mfa/verifyCode`,
      {
        mfaMethod: method,
        mfaVerificationCode: code,
        rememberMyBrowser: false,
        reconsentList: [],
        mfaSetup: false,
      },
      {
        params: LOGIN_PARAMS,
        headers: { Cookie: cookieHeader(), 'Content-Type': 'application/json' },
      },
    );
    mergeSetCookie(v.headers);
    const vtype = v.data?.responseStatus?.type;
    if (vtype !== 'SUCCESSFUL' || !v.data.serviceTicketId) {
      const msg = v.data?.responseStatus?.message || vtype || `HTTP ${v.status}`;
      throw new Error(`MFA verification failed: ${msg}`);
    }
    return v.data.serviceTicketId;
  }

  // Anything else: surface Garmin's own message.
  const msg = data?.responseStatus?.message || type || `HTTP ${r.status}`;
  throw new Error(`login failed: ${msg}`);
}

// ── ticket → {oauth1, oauth2} ───────────────────────────────────────────────
// We DON'T reuse garmin-connect's getOauth1Token/exchange here: those are built
// for the *web* embed ticket and (a) send the wrong `login-url`, and (b) DROP
// the `mfa_token` that an MFA login issues — which is exactly what makes the
// exchange 400 for an MFA-scoped ticket. So we mirror garth's mobile flow:
//   • preauthorized with login-url = the mobile gcm/android service
//   • carry the `mfa_token` (returned alongside oauth1) into the exchange body
//   • send `audience=GARMIN_CONNECT_MOBILE_ANDROID_DI` on the exchange
// Both calls are OAuth1-signed with the consumer creds (fetched from the same
// public consumer JSON the library uses); the exchange also signs with the
// oauth1 token as the resource-owner credentials.
const CONNECTAPI = 'https://connectapi.garmin.com/oauth-service/oauth';
const OAUTH_CONSUMER_URL = 'https://thegarth.s3.amazonaws.com/oauth_consumer.json';
const CONNECTMOBILE_UA = 'com.garmin.android.apps.connectmobile';

function makeOauth(consumer) {
  return new OAuth({
    consumer,
    signature_method: 'HMAC-SHA1',
    hash_function: (base, key) =>
      createHmac('sha1', key).update(base).digest('base64'),
  });
}

async function ticketToBundle(ticket) {
  const { data: c } = await axios.get(OAUTH_CONSUMER_URL);
  const consumer = { key: c.consumer_key, secret: c.consumer_secret };
  const oauth = makeOauth(consumer);

  // Step A: ticket → oauth1 token (+ possibly mfa_token). Mobile login-url.
  const preAuthUrl =
    `${CONNECTAPI}/preauthorized?` +
    qs.stringify({
      ticket,
      // Must match the service the ticket was issued for (mobile gcm/android),
      // NOT the web SSO embed URL — a mismatch here is what 400s the exchange.
      'login-url': 'https://mobile.integration.garmin.com/gcm/android',
      'accepts-mfa-tokens': true,
    });
  const preAuthReq = { url: preAuthUrl, method: 'GET' };
  const preAuthHeaders = oauth.toHeader(oauth.authorize(preAuthReq));
  const preAuthResp = await axios.get(preAuthUrl, {
    headers: { ...preAuthHeaders, 'User-Agent': CONNECTMOBILE_UA },
  });
  const oauth1 = qs.parse(preAuthResp.data);
  if (!oauth1.oauth_token || !oauth1.oauth_token_secret) {
    throw new Error('preauthorized returned no oauth1 token');
  }

  // Step B: oauth1 (+ mfa_token) → oauth2. mfa_token + audience go in the body.
  const exchangeUrl = `${CONNECTAPI}/exchange/user/2.0`;
  const token = { key: oauth1.oauth_token, secret: oauth1.oauth_token_secret };
  const body = { audience: 'GARMIN_CONNECT_MOBILE_ANDROID_DI' };
  if (oauth1.mfa_token) body.mfa_token = oauth1.mfa_token;
  // Sign with the form body included so the signature covers the POST params.
  const exchangeReq = { url: exchangeUrl, method: 'POST', data: body };
  const exchangeHeaders = oauth.toHeader(oauth.authorize(exchangeReq, token));
  const exchangeResp = await axios.post(exchangeUrl, qs.stringify(body), {
    headers: {
      ...exchangeHeaders,
      'User-Agent': CONNECTMOBILE_UA,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const oauth2 = exchangeResp.data;
  if (!oauth2?.access_token) throw new Error('exchange returned no access_token');
  // Add the expiry bookkeeping fields the fetch script / library expect.
  const now = Math.floor(Date.now() / 1000);
  oauth2.expires_at = now + (oauth2.expires_in ?? 0);
  oauth2.refresh_token_expires_at = now + (oauth2.refresh_token_expires_in ?? 0);

  return { oauth1, oauth2 };
}

async function main() {
  // Reserved for a future --ticket escape hatch; login is the only mode today.
  void argv;

  const email = (await prompt('Garmin Connect email: ')).trim();
  const password = await prompt('Garmin Connect password: ', { silent: true });
  if (!email || !password) {
    stderr.write('Email and password are both required.\n');
    return 1;
  }

  stderr.write('\nLogging in to Garmin Connect (mobile API)…\n');
  let ticket;
  try {
    ticket = await getServiceTicket(email, password);
  } catch (err) {
    stderr.write(`\n❌ ${err?.message ?? err}\n`);
    return 1;
  }

  stderr.write('Exchanging ticket for OAuth tokens (connectapi)…\n');
  let bundle;
  try {
    bundle = await ticketToBundle(ticket);
  } catch (err) {
    stderr.write(`\n❌ Token exchange failed: ${err?.message ?? err}\n`);
    stderr.write(
      'The service ticket is single-use and short-lived — if it expired, ' +
        'just rerun the script.\n',
    );
    return 1;
  }

  stderr.write(
    '\n✅ Success! Add this one line verbatim as the GARMIN_TOKEN_BUNDLE ' +
      'secret:\n\n',
  );
  process.stdout.write(JSON.stringify(bundle) + '\n');
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    stderr.write(String(err?.stack ?? err) + '\n');
    process.exit(1);
  });
