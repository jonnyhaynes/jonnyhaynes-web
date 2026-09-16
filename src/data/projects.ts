import { useMemo } from 'react';
import {
  FEATURED_REPOS,
  WORK_PROJECTS,
  type Award,
  type FeaturedRepo,
  type ProjectLink,
  type WorkProject,
} from '../content/projects';
import { useGitHubData, type GitHubData, type GitHubProject } from './github';

/**
 * The card view model: everything ProjectCard renders, with the personal/work
 * distinction already resolved. Personal repos are normalised from the baked
 * GitHub snapshot (./github); work projects are hand-written (../content/projects).
 */
export type Project = {
  name: string;
  kind: 'personal' | 'work';
  company: string | null;
  pitch: string;
  stack: string[];
  isFork: boolean;
  links: ProjectLink[];
  awards: Award[];
};

/**
 * The curated entries that have a matching repo in the snapshot. A repo renamed
 * or dropped from the bake is skipped, so the rest of the grid stays intact.
 */
function curatedRepos(
  data: GitHubData | null,
  entries: FeaturedRepo[],
): { repo: GitHubProject; entry: FeaturedRepo }[] {
  if (!data) return [];
  const byName = new Map(data.projects.map((p) => [p.name, p]));
  return entries.flatMap((entry) => {
    const repo = byName.get(entry.repo);
    return repo ? [{ repo, entry }] : [];
  });
}

function fromRepo(repo: GitHubProject, entry: FeaturedRepo): Project {
  const links: ProjectLink[] = [{ kind: 'repo', url: repo.url }];
  if (repo.homepageUrl) links.push({ kind: 'live', url: repo.homepageUrl });
  const derivedStack = repo.languages.length
    ? repo.languages
    : repo.language
      ? [repo.language]
      : [];
  return {
    name: entry.name,
    kind: 'personal',
    company: null,
    pitch: entry.pitch ?? repo.pitch ?? repo.description,
    stack: entry.stack ?? derivedStack,
    isFork: repo.isFork,
    links,
    awards: [],
  };
}

function fromWork(work: WorkProject): Project {
  return { ...work, isFork: false };
}

/**
 * The curated grid: personal repos plus work projects, sorted by card title A–Z
 * (case-insensitive, so "CMUX Sentinel" sorts as "CMUX" rather than after every
 * lower-case title). Sorting here rather than hand-ordering the content arrays
 * means adding a project can't leave the grid out of order.
 *
 * Work projects are static, so they render immediately while the GitHub snapshot
 * is still loading — and still render if that fetch fails.
 */
export function useProjects(): Project[] {
  const data = useGitHubData();
  return useMemo(() => {
    const projects = [
      ...curatedRepos(data, FEATURED_REPOS).map(({ repo, entry }) =>
        fromRepo(repo, entry),
      ),
      ...WORK_PROJECTS.map(fromWork),
    ];
    return projects.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }, [data]);
}
