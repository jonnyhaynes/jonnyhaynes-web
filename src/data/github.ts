import { useEffect, useState } from 'react';

export type GitHubRepo = {
  name: string;
  description: string;
  url: string;
  language: string | null;
  stars: number;
};

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
  lastCommit: GitHubLastCommit | null;
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
  repos: GitHubRepo[];
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

/** Repos never surfaced as "currently building" (this portfolio itself). */
const CURRENTLY_BUILDING_EXCLUDE = new Set(['jonnyhaynes-web']);

/**
 * The repo to show in the "currently building" chip: the most-recently-pushed
 * project that isn't excluded (so the portfolio doesn't point at itself).
 * Derived from `projects` (pushedAt-desc); falls back to the baked
 * `lastActivity` if projects are absent. Returns null when nothing qualifies.
 */
export function currentlyBuilding(
  data: GitHubData | null,
): GitHubLastActivity | null {
  if (!data) return null;

  const pick = data.projects.find(
    (p) => !CURRENTLY_BUILDING_EXCLUDE.has(p.name),
  );
  if (pick) {
    return {
      repo: pick.name,
      url: pick.url,
      message: pick.lastCommit?.message ?? null,
      committedAt: pick.lastCommit?.committedAt ?? pick.pushedAt,
    };
  }

  // No usable project — fall back to lastActivity unless it's the excluded repo.
  if (data.lastActivity && !CURRENTLY_BUILDING_EXCLUDE.has(data.lastActivity.repo)) {
    return data.lastActivity;
  }
  return null;
}
