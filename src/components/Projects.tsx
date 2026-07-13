import { useGitHubData, featuredProjects } from '../data/github';
import { ProjectCard } from './ProjectCard';

export function Projects() {
  const data = useGitHubData();

  // The three most-recently-pushed repos (excluding the portfolio itself).
  // Pitch + challenge come baked into each project from its own .portfolio.json
  // (see fetch-github.mjs).
  const featured = featuredProjects(data);

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
