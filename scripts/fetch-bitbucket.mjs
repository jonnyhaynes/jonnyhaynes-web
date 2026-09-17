// Fetches Bitbucket activity and writes public/data/bitbucket.json.
//
// WHY ONLY COUNTS: this token can read private work repositories. Nothing here is
// published except aggregates — no repository names, no workspace slugs, no URLs,
// no PR titles. If you add a field to the output, keep it a number.
//
// There is no contributions API in Bitbucket Cloud (GitHub has
// `contributionsCollection`; Bitbucket's API groups have Commits and Pull requests
// and nothing that totals them). The closest honest measure is pull requests you
// authored that were merged, which this names as such rather than dressing it up as
// "contributions".
//
// Both figures come from one endpoint:
//   GET /2.0/workspaces/{workspace}/pullrequests/{user}?state=MERGED
// `size` there is the total matching the filter, so the count itself needs no
// paging; the pages are only walked to collect the distinct repositories the PRs
// landed in.
//
// Run: node --env-file=.env.local scripts/fetch-bitbucket.mjs
//
// Bitbucket has two kinds of credential and they authenticate differently, which
// matters because the wrong shape fails as a bare 403:
//
//  - An **Atlassian API token** (id.atlassian.com) uses HTTP Basic auth, with your
//    Atlassian email as the username and the token as the password. It also needs
//    the read:user:bitbucket scope to answer /user. Set BITBUCKET_EMAIL for these.
//  - A **workspace or repository access token** (Bitbucket settings) is sent as a
//    Bearer token and has no email. Leave BITBUCKET_EMAIL unset for those.
//
// Scopes, either way: read:pullrequest:bitbucket, read:repository:bitbucket,
// read:workspace:bitbucket — plus read:user:bitbucket if you want the author
// discovered rather than configured.
//
// Optional: BITBUCKET_USER (username or uuid) to skip the /user call entirely.
// Optional: BITBUCKET_WORKSPACE to count a single workspace instead of all of them.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const TOKEN = process.env.BITBUCKET_TOKEN;
const EMAIL = process.env.BITBUCKET_EMAIL ?? null;
const AUTHOR = process.env.BITBUCKET_USER ?? null;
const ONLY_WORKSPACE = process.env.BITBUCKET_WORKSPACE ?? null;
const OUT = 'public/data/bitbucket.json';
const API = 'https://api.bitbucket.org/2.0';

/** Stop after this many pages per workspace, so a huge history can't run away. */
const MAX_PAGES = 40;
const PAGE_SIZE = 50;

const authHeaders = () => ({
  Authorization: EMAIL
    ? `Basic ${Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64')}`
    : `Bearer ${TOKEN}`,
  Accept: 'application/json',
});

async function getJson(url) {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    // The API explains itself in the body — "Invalid token", a missing scope, a
    // bad path. Dropping it turns every failure into the same bare 403.
    const body = await res.text().catch(() => '');
    throw new Error(
      `${url} → ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 300)}` : ''}`,
    );
  }
  return res.json();
}

async function get(path) {
  return getJson(`${API}${path}`);
}

async function main() {
  if (!TOKEN) {
    throw new Error(
      'BITBUCKET_TOKEN is not set — see the header of this file for the scopes it needs.',
    );
  }

  // The pull-request endpoint is keyed on the author. Normally that comes from
  // /user, but that call needs the read:user:bitbucket scope — and a token allowed
  // to read the work may not be allowed to read the account — so a username or uuid
  // can be configured instead and the call skipped.
  let author = AUTHOR;
  if (!author) {
    try {
      const me = await get('/user');
      author = me.username ?? me.uuid;
    } catch (error) {
      throw new Error(
        `${error.message}\n` +
          'Could not read the authenticated user. Either add the ' +
          'read:user:bitbucket scope to the token, or set BITBUCKET_USER to your ' +
          "username or uuid so this call isn't needed.",
      );
    }
  }
  if (!author) throw new Error('No username or uuid to use as the PR author');

  const { values: memberships } = await get('/user/workspaces?pagelen=100');
  const workspaces = (memberships ?? [])
    .map((m) => m.workspace?.slug)
    .filter(Boolean)
    .filter((slug) => !ONLY_WORKSPACE || slug === ONLY_WORKSPACE);

  let mergedPullRequests = 0;
  let workspacesFailed = 0;
  const repositories = new Set();

  for (const slug of workspaces) {
    try {
      const first = await get(
        `/workspaces/${slug}/pullrequests/${author}?state=MERGED&pagelen=${PAGE_SIZE}`,
      );
      mergedPullRequests += first.size ?? 0;

      let page = first;
      for (let pages = 1; ; pages += 1) {
        for (const pr of page.values ?? []) {
          const full = pr.destination?.repository?.full_name;
          if (full) repositories.add(full);
        }
        if (!page.next || pages >= MAX_PAGES) break;
        page = await getJson(page.next);
      }
    } catch (error) {
      // One workspace failing (a scope, a revoked permission) must not lose the
      // others — but it does mean the totals are a floor, so it's recorded.
      workspacesFailed += 1;
      console.warn(`  skipped a workspace: ${error.message}`);
    }
  }

  // A schema surprise on `destination.repository` would silently produce zero, so
  // the count is omitted rather than published as a wrong number.
  const repositoryCount = repositories.size > 0 ? repositories.size : null;
  if (repositoryCount === null && mergedPullRequests > 0) {
    console.warn('  no repository names found in the PR payloads — omitting that count');
  }

  const payload = {
    fetchedAt: new Date().toISOString(),
    // Deliberately no names or slugs anywhere below this line.
    mergedPullRequests,
    repositories: repositoryCount,
    workspacesCounted: workspaces.length - workspacesFailed,
    workspacesFailed,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Wrote ${OUT}: ${mergedPullRequests} merged PRs, ` +
      `${repositoryCount ?? '—'} repositories, across ` +
      `${payload.workspacesCounted} workspace(s)` +
      (workspacesFailed ? `, ${workspacesFailed} skipped` : ''),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
