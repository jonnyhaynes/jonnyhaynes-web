import type { GitHubProject } from '../data/github';
import { HardestBit } from './HardestBit';
import { ExternalLinkIcon, ForkIcon, GitHubIcon } from './icons';

/**
 * A featured-project card: name, pitch, stack, "hardest bit", repo/live links,
 * and a fork tag. The "hardest bit" — the tallest, most variable block — is
 * clamped to two lines and types out the rest via a terminal-style prompt (see
 * HardestBit), keeping the grid short without dropping any content.
 *
 * Accessibility:
 * - The card is a labelled region (aria-labelledby → the <h3>), NOT a link,
 *   because it has two distinct destinations (repo + live). Each link's
 *   accessible name includes the project name so "Repo"/"Live" aren't ambiguous.
 * - Forks show a fork icon before the title; it's decorative (aria-hidden) with
 *   an sr-only "Forked repository:" prefix so the meaning isn't icon-only.
 */
export function ProjectCard({ project }: { project: GitHubProject }) {
  // Pitch: the repo's .portfolio.json override, else its GitHub "About" text.
  const pitch = project.pitch ?? project.description;
  const challenge = project.challenge;
  const stack = project.languages.length
    ? project.languages
    : project.language
      ? [project.language]
      : [];
  const headingId = `proj-${project.name}`;

  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col rounded-lg border border-muted/20 bg-background/70 p-5 backdrop-blur-sm transition-colors hover:border-accent-start/50"
    >
      <h3
        id={headingId}
        className="flex items-center gap-1.5 text-xl font-medium text-foreground"
      >
        {project.isFork && (
          <>
            {/* Decorative glyph; the sr-only text carries the meaning. */}
            <ForkIcon className="size-4 shrink-0 text-muted" />
            <span className="sr-only">Forked repository: </span>
          </>
        )}
        {project.name}
      </h3>

      {pitch && <p className="mt-2 text-muted">{pitch}</p>}

      {stack.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
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

      {challenge && <HardestBit text={challenge} />}

      {/* Links pinned to the bottom so they align across cards of any height. */}
      <div className="mt-auto flex items-center gap-4 pt-4">
        <a
          href={project.url}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`${project.name} repository on GitHub`}
          className="inline-flex items-center gap-1.5 text-sm text-foreground transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
        >
          <GitHubIcon className="size-4" /> Repo
        </a>
        {project.homepageUrl && (
          <a
            href={project.homepageUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${project.name} live site`}
            className="inline-flex items-center gap-1.5 text-sm text-foreground transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
          >
            <ExternalLinkIcon className="size-4" /> Live
          </a>
        )}
      </div>
    </article>
  );
}
