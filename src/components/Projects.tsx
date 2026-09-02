import { useGitHubData, featuredProjects } from '../data/github';
import { useTheme } from '../theme/useTheme';
import { copy } from '../theme/copy';
import { SectionHeading } from './SectionHeading';
import { AccessibleProjectList } from './projects-terminal/AccessibleProjectList';
import { ProjectsTerminal } from './projects-terminal/ProjectsTerminal';

export function Projects() {
  const data = useGitHubData();
  const { palette } = useTheme();
  const c = copy(palette).projects;

  // Up to six repos, alphabetical, excluding the portfolio itself. Pitch +
  // challenge come baked into each project from its own .portfolio.json.
  const featured = featuredProjects(data);

  return (
    <section id="projects" className="scroll-mt-16 py-16">
      <SectionHeading section="projects" />

      {featured.length > 0 ? (
        <>
          <p className="mt-4 max-w-2xl text-muted">
            {c.introLead}{' '}
            <span className="text-foreground">{c.introNudge}</span>{' '}
            {c.introHelp} <span className="font-mono text-accent-start">help</span>.
          </p>

          {/* Accessible source of truth (screen readers / no-JS); the terminal
              is the interactive layer sighted users see. */}
          <AccessibleProjectList projects={featured} />

          <div className="mt-6">
            <ProjectsTerminal projects={featured} />
          </div>
        </>
      ) : (
        // Graceful degradation: GitHub data not loaded / no featured repos.
        <p className="mt-6 text-muted">Projects are loading…</p>
      )}
    </section>
  );
}
