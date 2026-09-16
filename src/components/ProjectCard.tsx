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

function projectId(name: string): string {
  return `proj-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

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
 * A curated-project card: title, pitch, awards, and outbound links.
 *
 * Personal repos carry a fork glyph when forked; work projects carry a briefcase
 * in the same slot, at the same size. Both sit inline before the title.
 *
 * Accessibility:
 * - The card is a labelled region (aria-labelledby → the <h3>), NOT a link,
 *   because it has several distinct destinations. Every link's accessible name
 *   carries the project name, so "Repo"/"Web"/"App Store" aren't ambiguous.
 * - Badging glyphs are decorative (aria-hidden) with an sr-only prefix, so their
 *   meaning is never icon-only for assistive tech.
 */
export function ProjectCard({ project }: { project: Project }) {
  const headingId = projectId(project.name);

  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col rounded-lg border border-muted/20 bg-background/70 p-5 backdrop-blur-sm transition-colors hover:border-accent-start/50"
    >
      <h3
        id={headingId}
        className="flex items-center gap-2 text-xl font-medium text-foreground"
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
        {project.name}
      </h3>

      {project.pitch && <p className="mt-2 text-muted">{project.pitch}</p>}

      {project.awards.length > 0 && <Awards project={project} />}

      {/* Links pinned to the bottom so they align across cards of any height. */}
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
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
    </article>
  );
}
