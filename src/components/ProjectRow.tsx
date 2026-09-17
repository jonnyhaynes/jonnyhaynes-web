import type { ComponentType } from 'react';
import type { ProjectLinkKind } from '../content/projects';
import type { Project } from '../data/projects';
import {
  AppleIcon,
  ExternalLinkIcon,
  ForkIcon,
  GitHubIcon,
  PlayIcon,
  TrophyIcon,
  WorkIcon,
} from './icons';

/**
 * How each outbound link renders. `description` completes "{project.name}
 * {description}" for the accessible name, so a link never reads as a bare
 * "Repo"/"Web" in a screen reader's list of links.
 */
const LINK_META: Record<
  ProjectLinkKind,
  {
    label: string;
    Icon: ComponentType<{ className?: string }>;
    description: string;
  }
> = {
  repo: { label: 'Repo', Icon: GitHubIcon, description: 'repository on GitHub' },
  live: { label: 'Web', Icon: ExternalLinkIcon, description: 'live site' },
  appstore: {
    label: 'App Store',
    Icon: AppleIcon,
    description: 'on the App Store',
  },
  play: {
    label: 'Google Play',
    Icon: PlayIcon,
    description: 'on Google Play',
  },
  article: {
    label: 'Article',
    Icon: ExternalLinkIcon,
    description: 'in the news',
  },
  video: {
    label: 'Video',
    Icon: ExternalLinkIcon,
    description: 'in a video',
  },
};

const FOCUS =
  'focus-visible:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

const LINK_CLASS = `inline-flex items-center gap-1.5 text-sm text-foreground transition-colors hover:text-accent-start ${FOCUS}`;

/**
 * The project's awards: one per line, so a long award title wraps as prose rather
 * than running on. Each row carries its own trophy, which deliberately sets no
 * colour — it inherits currentColor from the link, so it turns accent in step
 * with the text on hover and on keyboard focus.
 */
function Awards({ project }: { project: Project }) {
  return (
    <ul className="mt-4 space-y-1.5">
      {project.awards.map((award) => (
        <li key={award.url}>
          <a
            href={award.url}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Award for ${project.name}: ${award.name}`}
            className={`flex items-start gap-2 text-sm text-muted transition-colors hover:text-accent-start ${FOCUS}`}
          >
            <TrophyIcon className="mt-0.5 size-3.5 shrink-0" />
            <span>{award.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * One project, collapsed to its title and expanding in place.
 *
 * A native `<details>` rather than a state toggle, for the same reasons the rest
 * of the site uses one: every title stays in the HTML, every pitch and link stays
 * in the HTML whether or not the row is open, and the disclosure works with
 * JavaScript off. Six titles are visible at once, which is what "all need
 * visibility" asks for, while the detail stays folded away.
 *
 * `defaultOpen` is passed straight to `open` and never changes, so React writes it
 * once and leaves the reader's own toggling alone.
 *
 * Accessibility:
 * - `<summary>` is the disclosure control, so the row needs no separate button and
 *   gets keyboard support and expand/collapse announcements for free. Its
 *   accessible name is the heading inside it, prefixed with an sr-only
 *   "Work project at {company}: " where that applies — so it's announced as what
 *   it is rather than as a bare project name.
 * - The title is an `<h3>`, nesting under the section's `<h2>`. If this is ever
 *   rendered below another heading, the level needs to become a prop.
 * - A heading inside a summary is sometimes flattened by assistive tech, since the
 *   summary is a control. Nothing is lost when that happens — the name still
 *   carries the text — but the outline may be shorter than the markup suggests.
 */
export function ProjectRow({
  project,
  defaultOpen = false,
}: {
  project: Project;
  defaultOpen?: boolean;
}) {
  return (
    <details className="project-row" open={defaultOpen ? true : undefined}>
      <summary
        className={`flex cursor-pointer list-none items-center gap-3 py-4 transition-colors hover:text-accent-start [&::-webkit-details-marker]:hidden ${FOCUS}`}
      >
        {project.kind === 'work' ? (
          <>
            <WorkIcon className="size-4 shrink-0 text-muted" />
            <span className="sr-only">Work project at {project.company}: </span>
          </>
        ) : (
          project.isFork && (
            <>
              <ForkIcon className="size-4 shrink-0 text-muted" />
              <span className="sr-only">Forked repository: </span>
            </>
          )
        )}

        {/* No colour of its own, so it turns accent with the summary on hover. */}
        <h3 className="text-xl font-medium">{project.name}</h3>

        <span aria-hidden="true" className="project-row-chevron ml-auto text-muted">
          ▾
        </span>
      </summary>

      {/* Indented to the title, so the expanded detail lines up under the name. */}
      <div className="pb-6 pl-7">
        {project.pitch && <p className="text-muted">{project.pitch}</p>}

        {project.awards.length > 0 && <Awards project={project} />}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {project.links.map((link) => {
            const { label, Icon, description } = LINK_META[link.kind];
            return (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${project.name} ${description}`}
                className={LINK_CLASS}
              >
                <Icon className="size-4" /> {label}
              </a>
            );
          })}
        </div>
      </div>
    </details>
  );
}
