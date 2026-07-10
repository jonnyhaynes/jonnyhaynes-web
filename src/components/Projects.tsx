import { useGitHubData, type GitHubProject } from '../data/github';
import { FEATURED_ORDER } from '../content/projects';
import { ProjectCard } from './ProjectCard';

export function Projects() {
  const data = useGitHubData();

  // Order the fetched projects by the curated FEATURED_ORDER; a featured repo
  // missing from the fetch is skipped. Pitch + challenge come baked into each
  // project from its own .portfolio.json (see fetch-github.mjs).
  const byName = new Map((data?.projects ?? []).map((p) => [p.name, p]));
  const featured: GitHubProject[] = FEATURED_ORDER.map((name) =>
    byName.get(name),
  ).filter((p): p is GitHubProject => p !== undefined);

  return (
    // The parent (App) gives this a max-w-6xl container, wider than the
    // max-w-4xl reading width used elsewhere, so the grid feels substantial.
    <section id="projects" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // Projects
      </h2>

      {featured.length > 0 ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      ) : (
        // Graceful degradation: GitHub data not loaded / no featured repos.
        <p className="mt-6 text-muted">Projects are loading…</p>
      )}
    </section>
  );
}
