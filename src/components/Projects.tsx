import { useProjects } from '../data/projects';
import { ProjectCard } from './ProjectCard';
import { SectionHeading } from './SectionHeading';

export function Projects() {
  // The curated grid: the repos named in FEATURED_REPOS, then the hand-written
  // work projects. Work projects are static, so they render even if the GitHub
  // snapshot never arrives — see src/content/projects.ts.
  const projects = useProjects();

  return (
    // The parent (App) gives this a max-w-6xl container, wider than the
    // max-w-4xl reading width used elsewhere, so the grid feels substantial.
    <section id="projects" className="scroll-mt-16 py-16">
      <SectionHeading section="projects" />

      {projects.length > 0 ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      ) : (
        // Graceful degradation: nothing curated and the GitHub data absent.
        <p className="mt-6 text-muted">Projects are loading…</p>
      )}
    </section>
  );
}
