import type { GitHubProject } from '../data/github';
import { ExternalLinkIcon, GitHubIcon } from './icons';

export function ProjectCard({ project }: { project: GitHubProject }) {
  // Pitch: the repo's .portfolio.json override, else its GitHub "About" text.
  const pitch = project.pitch ?? project.description;
  const challenge = project.challenge;
  const stack = project.languages.length
    ? project.languages
    : project.language
      ? [project.language]
      : [];

  return (
    <article className="flex flex-col rounded-lg border border-muted/20 bg-foreground/[0.02] p-6 transition-colors hover:border-accent-start/50">
      <h3 className="text-xl font-medium text-foreground">{project.name}</h3>

      {pitch && <p className="mt-2 text-muted">{pitch}</p>}

      {stack.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {stack.map((tech) => (
            <li
              key={tech}
              className="rounded-full border border-muted/30 px-2.5 py-0.5 font-mono text-xs text-muted"
            >
              {tech}
            </li>
          ))}
        </ul>
      )}

      {challenge && (
        <p className="mt-4 border-l-2 border-accent-start/50 pl-3 text-sm text-muted">
          <span className="font-mono text-xs uppercase tracking-wider text-accent-start">
            Hardest bit:{' '}
          </span>
          {challenge}
        </p>
      )}

      {/* Links pinned to the bottom so they align across cards of any height. */}
      <div className="mt-auto flex items-center gap-4 pt-6">
        <a
          href={project.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-sm text-foreground transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
        >
          <GitHubIcon className="size-4" /> Repo
        </a>
        {project.homepageUrl && (
          <a
            href={project.homepageUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-sm text-foreground transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
          >
            <ExternalLinkIcon className="size-4" /> Live
          </a>
        )}
      </div>
    </article>
  );
}
