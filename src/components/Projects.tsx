import { useGitHubData } from '../data/github';
import { FEATURED_ORDER, PROJECT_NOTES } from '../content/projects';
import { ProjectCard, type FeaturedProject } from './ProjectCard';

export function Projects() {
  const data = useGitHubData();

  // Merge live GitHub project data with the hand-written notes, ordered by the
  // curated FEATURED_ORDER. A featured repo missing from the fetch is skipped.
  const byName = new Map((data?.projects ?? []).map((p) => [p.name, p]));
  const featured: FeaturedProject[] = FEATURED_ORDER.map((name) => {
    const project = byName.get(name);
    if (!project) return null;
    return { ...project, note: PROJECT_NOTES[name] };
  }).filter((p): p is FeaturedProject => p !== null);

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
