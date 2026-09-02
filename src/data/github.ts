import { useEffect, useState } from 'react';

export type GitHubLanguage = {
  name: string;
  count: number;
};

/** A commit summary for the "currently building" widget. */
export type GitHubLastCommit = {
  message: string;
  committedAt: string;
};

/** Richer repo shape for the V2 projects section (most-recently-pushed). */
export type GitHubProject = {
  name: string;
  description: string;
  url: string;
  homepageUrl: string | null;
  language: string | null;
  languages: string[];
  stars: number;
  pushedAt: string | null;
  /** True when this is a fork we opted in via its .portfolio.json. */
  isFork: boolean;
  lastCommit: GitHubLastCommit | null;
  /** Optional pitch override from the repo's .portfolio.json. */
  pitch: string | null;
  /** "Hardest Technical Challenge" from the repo's .portfolio.json. */
  challenge: string | null;
};

/**
 * The single most-recently-pushed repo + last commit. `message` is null in the
 * tokenless REST fallback (REST can't give the commit message cheaply).
 */
export type GitHubLastActivity = {
  repo: string;
  url: string;
  message: string | null;
  committedAt: string | null;
};

export type GitHubData = {
  user: string;
  fetchedAt: string;
  projects: GitHubProject[];
  lastActivity: GitHubLastActivity | null;
  languages: GitHubLanguage[];
  totalContributions: number | null;
};

/**
 * Loads the baked GitHub snapshot from public/data/github.json.
 *
 * Returns `null` while loading and on any failure — the GitHub section is
 * built to degrade gracefully when data is absent, so a failed fetch just
 * means the section quietly hides rather than breaking the page.
 */
export function useGitHubData(): GitHubData | null {
  const [data, setData] = useState<GitHubData | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/data/github.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json: GitHubData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        // Leave data null; the section renders its empty state.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

/**
 * Repos never surfaced as own work (this portfolio itself) — excluded from both
 * the "currently building" chip and the featured Projects grid.
 */
export const SELF_EXCLUDE = new Set(['jonnyhaynes-web']);

/**
 * The featured projects for the Projects grid: up to six repos sorted
 * alphabetically (case-insensitive), excluding the portfolio itself. The bake
 * stores seven so a full six survive SELF_EXCLUDE; the front end never shows
 * more than `limit`. Returns an empty array when data is absent so the section
 * degrades gracefully.
 */
export function featuredProjects(
  data: GitHubData | null,
  limit = 6,
): GitHubProject[] {
  if (!data) return [];
  return data.projects
    .filter((p) => !SELF_EXCLUDE.has(p.name))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )
    .slice(0, limit);
}

/**
 * The repo to show in the "currently building" chip: the most-recently-pushed
 * repo that isn't excluded (so the portfolio doesn't point at itself).
 * Prefers the baked `lastActivity` (which includes owned repos, forks, and
 * repos contributed to), falling back to the newest owned `project`.
 */
export function currentlyBuilding(
  data: GitHubData | null,
): GitHubLastActivity | null {
  if (!data) return null;

  // `lastActivity` is already the most-recently-pushed repo across owned repos,
  // forks, and repos contributed to (when baked via GraphQL). Prefer it so the
  // chip reflects that wider activity instead of only owned work.
  if (data.lastActivity && !SELF_EXCLUDE.has(data.lastActivity.repo)) {
    return data.lastActivity;
  }

  // Fall back to the newest owned project (e.g. tokenless REST bake).
  const pick = data.projects.find((p) => !SELF_EXCLUDE.has(p.name));
  if (pick) {
    return {
      repo: pick.name,
      url: pick.url,
      message: pick.lastCommit?.message ?? null,
      committedAt: pick.lastCommit?.committedAt ?? pick.pushedAt,
    };
  }

  return null;
}
