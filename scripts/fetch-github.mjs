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
              primaryLanguage { name }
            }
          }
        }
        repositories(
          first: 100
          ownerAffiliations: OWNER
          isFork: false
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          nodes {
            name
            description
            url
            stargazerCount
            primaryLanguage { name }
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
  const pinned = user.pinnedItems.nodes;

  // Prefer pinned (curated) repos; fall back to most-recently-updated so the
  // section is never empty when nothing is pinned.
  const repos = (pinned.length ? pinned : allRepos.slice(0, 6)).map(mapRepoNode);

  return {
    repos,
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
  const sourceRepos = all.filter((r) => !r.fork);

  const repos = sourceRepos.slice(0, 6).map((r) => ({
    name: r.name,
    description: r.description ?? '',
    url: r.html_url,
    language: r.language ?? null,
    stars: r.stargazers_count,
  }));

  return {
    repos,
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
