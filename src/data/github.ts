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
