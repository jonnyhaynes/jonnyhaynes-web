// One-time local helper to capture a Garmin Connect OAuth token bundle.
//
// Usage (interactive — nothing is stored to disk):
//   node scripts/garmin-auth.mjs
//
// Prompts for your Garmin Connect email + password, logs in ONCE locally
// (handle any MFA/CAPTCHA here in a real browser-like flow if prompted), then
// prints a JSON token bundle. Store that whole blob as the GARMIN_TOKEN_BUNDLE
// secret. The bake job (scripts/fetch-health.mjs) authenticates with the bundle
// only — your password never reaches CI.
//
// You only need to run this once. If the bake later stops working because the
// long-lived oauth1 token expired or was revoked, re-run this to mint a fresh
// bundle. See docs/plans/migrate-google-health-to-garmin.md.

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
// garmin-connect is CommonJS; import the default and destructure (Node ESM
// interop doesn't reliably expose named CJS exports).
import garminConnect from 'garmin-connect';
const { GarminConnect } = garminConnect;

/** Prompt without echoing the password to the terminal. */
async function promptHidden(rl, question) {
  process.stdout.write(question);
  const onData = (char) => {
    // Re-write the prompt line so keystrokes don't render.
    const s = char.toString();
    if (s === '\n' || s === '\r' || s === '\r\n') return;
    stdout.write(`\x1b[2K\x1b[200D${question}`);
  };
  stdin.on('data', onData);
  const answer = await rl.question('');
  stdin.off('data', onData);
  stdout.write('\n');
  return answer;
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });

  const username = (await rl.question('Garmin Connect email: ')).trim();
  const password = await promptHidden(rl, 'Garmin Connect password: ');
  rl.close();

  if (!username || !password) {
    console.error('\nEmail and password are both required.');
    process.exit(1);
  }

  console.log('\nLogging in to Garmin Connect…');
  const client = new GarminConnect({ username, password });

  try {
    await client.login();
  } catch (err) {
    console.error(
      `\nLogin failed: ${err.message}\n` +
        'If Garmin challenged with MFA/CAPTCHA, retry — this only happens at ' +
        'this one-time local login, never in CI.',
    );
    process.exit(1);
  }

  const bundle = client.exportToken();
  const out = JSON.stringify({ oauth1: bundle.oauth1, oauth2: bundle.oauth2 });

  console.log('\n✅ Success! Add this as the GARMIN_TOKEN_BUNDLE repo secret:\n');
  console.log(out);
  console.log(
    '\n(That is the entire value — one line of JSON. Store it verbatim.)',
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
