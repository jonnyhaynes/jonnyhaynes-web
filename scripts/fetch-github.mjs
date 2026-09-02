// Fetches GitHub data and writes public/data/github.json.
//
// Surfaces the most-recently-PUSHED public repos (active work — NOT pinned),
// their language breakdown, and the last commit. Two modes:
//   - With GITHUB_TOKEN: GraphQL API for repos + last commit + total
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

/**
 * Map a GraphQL repo node to the richer "project" shape used by the V2 projects
 * section: adds pushedAt, the per-repo language list, and the last commit.
 */
function mapProjectNode(r, { isFork = false } = {}) {
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
    // Forks are only ever included when they carry a .portfolio.json (see
    // fetchViaGraphQL / fetchViaREST). The flag lets the UI badge them later.
    isFork,
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
  // Shared node selection so owned repos and forks map identically via
  // mapProjectNode.
  const repoFields = `
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
  `;
  const query = `
    query ($login: String!) {
      user(login: $login) {
        repositories(
          first: 100
          ownerAffiliations: OWNER
          isFork: false
          privacy: PUBLIC
          orderBy: { field: PUSHED_AT, direction: DESC }
        ) {
          nodes { ${repoFields} }
        }
        forks: repositories(
          first: 25
          ownerAffiliations: OWNER
          isFork: true
          privacy: PUBLIC
          orderBy: { field: PUSHED_AT, direction: DESC }
        ) {
          nodes { ${repoFields} }
        }
        repositoriesContributedTo(
          first: 100
          includeUserRepositories: false
          privacy: PUBLIC
          orderBy: { field: PUSHED_AT, direction: DESC }
        ) {
          nodes {
            name
            url
            pushedAt
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
  const forkRepos = user.forks.nodes;
  const contributedRepos = user.repositoriesContributedTo.nodes;

  // Forks are opt-in: only those carrying a .portfolio.json at their root count
  // as real, curated work. Probe each fork's metadata and keep the ones that
  // have it — throwaway forks (no file) drop out here.
  const forkCandidates = forkRepos.map((r) => mapProjectNode(r, { isFork: true }));
  await enrichWithPortfolioMeta(forkCandidates);
  const keptForks = forkCandidates.filter((p) => p.pitch != null || p.challenge != null);

  // Projects: the most-recently-PUSHED public repos (active work, not pinned),
  // plus any opted-in forks — all competing on recency for the top 7 slots.
  // We bake 7 (not 6) so a full six survive the front end's SELF_EXCLUDE, which
  // drops the portfolio repo itself; the UI then shows six, alphabetical.
  // Merge and sort by recency BEFORE enriching, so we only fetch .portfolio.json
  // for the handful that actually make the cut (allRepos is PUSHED_AT-desc; a
  // small owned slice is more than enough candidates to fill 7 alongside forks).
  const ownedCandidates = allRepos.slice(0, 7).map((r) => mapProjectNode(r));
  const projects = [...ownedCandidates, ...keptForks]
    .sort(
      (a, b) =>
        new Date(b.pushedAt ?? 0).getTime() - new Date(a.pushedAt ?? 0).getTime(),
    )
    .slice(0, 7);
  // keptForks are already enriched; enrich the owned ones that made the cut.
  await enrichWithPortfolioMeta(projects.filter((p) => !p.isFork));

  // "Currently building": the single most-recently-pushed repo across own repos,
  // forks, and repos contributed to, so the chip reflects all visible activity.
  const activityRepos = [
    ...allRepos.map((r) => ({
      repo: r.name,
      url: r.url,
      pushedAt: r.pushedAt,
      message: r.defaultBranchRef?.target?.history?.nodes?.[0]?.messageHeadline ?? null,
      committedAt:
        r.defaultBranchRef?.target?.history?.nodes?.[0]?.committedDate ?? null,
    })),
    ...contributedRepos.map((r) => ({
      repo: r.name,
      url: r.url,
      pushedAt: r.pushedAt,
      message: r.defaultBranchRef?.target?.history?.nodes?.[0]?.messageHeadline ?? null,
      committedAt:
        r.defaultBranchRef?.target?.history?.nodes?.[0]?.committedDate ?? null,
    })),
  ].sort(
    (a, b) =>
      new Date(b.committedAt ?? b.pushedAt ?? 0).getTime() -
      new Date(a.committedAt ?? a.pushedAt ?? 0).getTime(),
  );

  const top = activityRepos[0] ?? null;
  const lastActivity = top
    ? {
        repo: top.repo,
        url: top.url,
        message: top.message,
        committedAt: top.committedAt ?? top.pushedAt,
      }
    : null;

  return {
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
  // Defensively drop any private repo (the /users/:u/repos endpoint is
  // public-only, but never rely on that for a leak boundary). Split owned repos
  // from forks: forks are opt-in via .portfolio.json (see below).
  const publicRepos = all.filter((r) => !r.private);
  const sourceRepos = publicRepos.filter((r) => !r.fork);
  const forkRepos = publicRepos.filter((r) => r.fork);

  // REST gives pushed_at and primary language, but not the last commit message
  // cheaply, so lastCommit degrades to null (the UI hides it gracefully).
  const toProject = (r, isFork) => ({
    name: r.name,
    description: r.description ?? '',
    url: r.html_url,
    homepageUrl: r.homepage || null,
    language: r.language ?? null,
    languages: r.language ? [r.language] : [],
    stars: r.stargazers_count,
    pushedAt: r.pushed_at ?? null,
    lastCommit: null,
    isFork,
    pitch: null,
    challenge: null,
  });

  // Forks: keep only those carrying a .portfolio.json (throwaway forks drop out).
  const forkCandidates = forkRepos.map((r) => toProject(r, true));
  await enrichWithPortfolioMeta(forkCandidates);
  const keptForks = forkCandidates.filter((p) => p.pitch != null || p.challenge != null);

  // Merge owned + opted-in forks, compete on recency for the top 7. We bake 7
  // (not 6) so six survive the front end's SELF_EXCLUDE; the UI shows six A–Z.
  const ownedCandidates = sourceRepos.slice(0, 7).map((r) => toProject(r, false));
  const projects = [...ownedCandidates, ...keptForks]
    .sort(
      (a, b) =>
        new Date(b.pushedAt ?? 0).getTime() - new Date(a.pushedAt ?? 0).getTime(),
    )
    .slice(0, 7);
  // keptForks already enriched; enrich the owned ones that made the cut.
  await enrichWithPortfolioMeta(projects.filter((p) => !p.isFork));

  const top = projects[0] ?? null;
  const lastActivity = top
    ? { repo: top.name, url: top.url, message: null, committedAt: top.pushedAt }
    : null;

  return {
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
    `Wrote ${OUT}: ${payload.projects.length} projects, ${payload.languages.length} languages` +
      (payload.totalContributions != null
        ? `, ${payload.totalContributions} contributions`
        : ' (no contribution total — tokenless mode)'),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
