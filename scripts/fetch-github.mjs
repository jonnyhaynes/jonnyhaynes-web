// Fetches GitHub data and writes public/data/github.json.
//
// Two modes:
//   - With GITHUB_TOKEN: uses the GraphQL API for pinned repos + total
//     contributions in the last year + language breakdown.
//   - Without a token: falls back to the public REST API for recent repos
//     + language breakdown. No contribution total (REST can't give it cheaply).
//
// Run: node scripts/fetch-github.mjs   (set GITHUB_USER to override the default)

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const USER = process.env.GITHUB_USER ?? 'jonnyhaynes';
const TOKEN = process.env.GITHUB_TOKEN;
const OUT = 'public/data/github.json';

/** Roll language counts up into a sorted [{ name, count }] breakdown. */
function languageBreakdown(languages) {
  const counts = new Map();
  for (const lang of languages) {
    if (!lang) continue;
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Map a GraphQL repository node to our flat repo shape. */
function mapRepoNode(r) {
  return {
    name: r.name,
    description: r.description ?? '',
    url: r.url,
    language: r.primaryLanguage?.name ?? null,
    stars: r.stargazerCount,
  };
}

/**
 * Map a GraphQL repo node to the richer "project" shape used by the V2 projects
 * section: adds pushedAt, the per-repo language list, and the last commit.
 */
function mapProjectNode(r) {
  const lastCommit = r.defaultBranchRef?.target?.history?.nodes?.[0] ?? null;
  return {
    name: r.name,
    description: r.description ?? '',
    url: r.url,
    homepageUrl: r.homepageUrl || null,
    language: r.primaryLanguage?.name ?? null,
    languages:
      r.languages?.nodes?.map((l) => l.name).filter(Boolean) ?? [],
    stars: r.stargazerCount,
    pushedAt: r.pushedAt ?? null,
    lastCommit: lastCommit
      ? { message: lastCommit.messageHeadline, committedAt: lastCommit.committedDate }
      : null,
    // Filled from the repo's own .portfolio.json, if present (see below).
    pitch: null,
    challenge: null,
  };
}

/**
 * Read a repo's `.portfolio.json` (repo root) so each project can describe its
 * own pitch + hardest-challenge next to its code. Uses the contents API, which
 * returns base64. Missing file (404) → null; the project just uses its GitHub
 * "About" as the pitch and shows no challenge. Never throws: portfolio metadata
 * is optional and must not break the bake.
 */
async function fetchPortfolioMeta(repo) {
  try {
    const headers = { Accept: 'application/vnd.github+json' };
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
    const res = await fetch(
      `https://api.github.com/repos/${USER}/${repo}/contents/.portfolio.json`,
      { headers },
    );
    if (!res.ok) return null; // 404 = no metadata; anything else, skip quietly.
    const json = await res.json();
    const content = Buffer.from(json.content ?? '', 'base64').toString('utf8');
    const meta = JSON.parse(content);
    return {
      pitch: typeof meta.pitch === 'string' ? meta.pitch : null,
      challenge: typeof meta.challenge === 'string' ? meta.challenge : null,
    };
  } catch {
    return null; // malformed JSON / network hiccup — ignore, don't fail the bake.
  }
}

/** Fetch each project's .portfolio.json in parallel and merge pitch/challenge. */
async function enrichWithPortfolioMeta(projects) {
  await Promise.all(
    projects.map(async (p) => {
      const meta = await fetchPortfolioMeta(p.name);
      if (meta) {
        p.pitch = meta.pitch;
        p.challenge = meta.challenge;
      }
    }),
  );
}

async function fetchViaGraphQL() {
  const query = `
    query ($login: String!) {
      user(login: $login) {
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes {
            ... on Repository {
              name
              description
              url
              stargazerCount
              isPrivate
              primaryLanguage { name }
            }
          }
        }
        repositories(
          first: 100
          ownerAffiliations: OWNER
          isFork: false
          privacy: PUBLIC
          orderBy: { field: PUSHED_AT, direction: DESC }
        ) {
          nodes {
            name
            description
            url
            homepageUrl
            stargazerCount
            pushedAt
            primaryLanguage { name }
            languages(first: 8, orderBy: { field: SIZE, direction: DESC }) {
              nodes { name }
            }
            defaultBranchRef {
              target {
                ... on Commit {
                  history(first: 1) {
                    nodes { messageHeadline committedDate }
                  }
                }
              }
            }
          }
        }
        contributionsCollection {
          contributionCalendar { totalContributions }
        }
      }
    }
  `;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });

  if (!res.ok) {
    throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  const user = json.data.user;
  const allRepos = user.repositories.nodes;
  // Drop any pinned PRIVATE repo — this data is committed and served publicly,
  // so a private repo must never leak into it (repositories() is already
  // privacy: PUBLIC; pinned items aren't, hence this guard).
  const pinned = user.pinnedItems.nodes.filter((r) => !r.isPrivate);

  // Prefer pinned (curated) repos; fall back to most-recently-pushed so the
  // section is never empty when nothing is pinned.
  const repos = (pinned.length ? pinned : allRepos.slice(0, 6)).map(mapRepoNode);

  // V2 projects: the most-recently-pushed repos, richer shape (languages, last
  // commit). allRepos is already PUSHED_AT-desc, so slice from the top.
  const projects = allRepos.slice(0, 6).map(mapProjectNode);
  await enrichWithPortfolioMeta(projects);

  // "Currently building": the single most-recently-pushed repo + its last commit.
  const top = projects[0] ?? null;
  const lastActivity =
    top && top.lastCommit
      ? {
          repo: top.name,
          url: top.url,
          message: top.lastCommit.message,
          committedAt: top.lastCommit.committedAt,
        }
      : null;

  return {
    repos,
    projects,
    lastActivity,
    languages: languageBreakdown(
      allRepos.map((r) => r.primaryLanguage?.name),
    ),
    totalContributions:
      user.contributionsCollection.contributionCalendar.totalContributions,
  };
}

async function fetchViaREST() {
  const headers = { Accept: 'application/vnd.github+json' };
  const res = await fetch(
    `https://api.github.com/users/${USER}/repos?sort=updated&per_page=100&type=owner`,
    { headers },
  );
  if (!res.ok) {
    throw new Error(`REST request failed: ${res.status} ${res.statusText}`);
  }
  const all = await res.json();
  // Exclude forks and, defensively, any private repo (the /users/:u/repos
  // endpoint is public-only, but never rely on that for a leak boundary).
  const sourceRepos = all.filter((r) => !r.fork && !r.private);

  const repos = sourceRepos.slice(0, 6).map((r) => ({
    name: r.name,
    description: r.description ?? '',
    url: r.html_url,
    language: r.language ?? null,
    stars: r.stargazers_count,
  }));

  // REST gives pushed_at and primary language, but not the last commit message
  // cheaply, so lastCommit degrades to null (the UI hides it gracefully).
  const projects = sourceRepos.slice(0, 6).map((r) => ({
    name: r.name,
    description: r.description ?? '',
    url: r.html_url,
    homepageUrl: r.homepage || null,
    language: r.language ?? null,
    languages: r.language ? [r.language] : [],
    stars: r.stargazers_count,
    pushedAt: r.pushed_at ?? null,
    lastCommit: null,
    pitch: null,
    challenge: null,
  }));
  await enrichWithPortfolioMeta(projects);

  const top = projects[0] ?? null;
  const lastActivity = top
    ? { repo: top.name, url: top.url, message: null, committedAt: top.pushedAt }
    : null;

  return {
    repos,
    projects,
    lastActivity,
    languages: languageBreakdown(sourceRepos.map((r) => r.language)),
    totalContributions: null, // not available without GraphQL + token
  };
}

async function main() {
  const mode = TOKEN ? 'GraphQL (pinned + contributions)' : 'REST (recent repos)';
  console.log(`Fetching GitHub data for "${USER}" via ${mode}…`);

  const data = TOKEN ? await fetchViaGraphQL() : await fetchViaREST();

  const payload = {
    user: USER,
    fetchedAt: new Date().toISOString(),
    ...data,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Wrote ${OUT}: ${payload.repos.length} repos, ${payload.languages.length} languages` +
      (payload.totalContributions != null
        ? `, ${payload.totalContributions} contributions`
        : ' (no contribution total — tokenless mode)'),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
