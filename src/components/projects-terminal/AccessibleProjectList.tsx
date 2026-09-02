import type { GitHubProject } from '../../data/github';

/**
 * The semantic, screen-reader-first rendering of the featured projects. It's the
 * accessible source of truth beneath the terminal: visually hidden (`sr-only`)
 * for sighted users who get the interactive terminal, but fully present in the
 * DOM for assistive tech and JS-rendering crawlers (incl. Googlebot).
 * Everything the terminal can show lives here as real markup (headings, links,
 * lists).
 *
 * NOTE: this does NOT cover a JavaScript-disabled client — the whole site is a
 * client-rendered SPA, so with JS off nothing here renders at all. Making the
 * served HTML work without JS is tracked separately (prerender/SSR, issue #511).
 */
export function AccessibleProjectList({ projects }: { projects: GitHubProject[] }) {
  return (
    <div className="sr-only">
      <h3>Featured projects</h3>
      <ul>
        {projects.map((project) => {
          const pitch = project.pitch ?? project.description;
          const stack = project.languages.length
            ? project.languages
            : project.language
              ? [project.language]
              : [];
          return (
            <li key={project.name}>
              <h4>
                {project.name}
                {project.isFork ? ' (fork)' : ''}
              </h4>
              {pitch && <p>{pitch}</p>}
              {stack.length > 0 && <p>Built with: {stack.join(', ')}.</p>}
              {project.challenge && <p>Hardest bit: {project.challenge}</p>}
              <p>
                <a href={project.url}>View {project.name} on GitHub</a>
                {project.homepageUrl && (
                  <>
                    {' · '}
                    <a href={project.homepageUrl}>Visit {project.name} live site</a>
                  </>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
