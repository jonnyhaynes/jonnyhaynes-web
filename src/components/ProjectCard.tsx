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
    <ul className="mt-4 list-none space-y-1.5 p-0">
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
 * One project, as a fixed-width card in the horizontal track.
 *
 * This replaces the collapsed row it used to be. The disclosure existed to keep a
 * long vertical list short — six rows of detail stacked down the page. A card in a
 * traverse has no such problem: each one is a column of its own, so everything is
 * visible and there is nothing to fold away. The boxed surface stays, because the
 * pitch and links sit over the drifting topography and need their own ground.
 *
 * Everything is in the DOM whether or not the card is on screen, so the whole set
 * is crawlable and readable with JavaScript off — the horizontal travel is purely
 * presentational.
 *
 * Accessibility:
 * - The title is an `<h3>`, nesting under the section's `<h2>`.
 * - `onFocus` bubbles: tabbing to anything inside the card asks the section to
 *   bring it into view. Without that, a card could hold focus while sitting
 *   outside the clipped window, which is invisible to a sighted keyboard user.
 */
export function ProjectCard({
  project,
  onFocus,
}: {
  project: Project;
  onFocus?: () => void;
}) {
  return (
    <li className="project-card" onFocus={onFocus}>
      <article>
        <h3 className="flex items-start gap-2 text-xl font-medium">
          {project.kind === 'work' ? (
            <>
              <WorkIcon className="mt-1 size-4 shrink-0 text-muted" />
              <span className="sr-only">Work project at {project.company}: </span>
            </>
          ) : (
            project.isFork && (
              <>
                <ForkIcon className="mt-1 size-4 shrink-0 text-muted" />
                <span className="sr-only">Forked repository: </span>
              </>
            )
          )}
          <span>{project.name}</span>
        </h3>

        {project.pitch && <p className="mt-3 text-muted">{project.pitch}</p>}

        {project.awards.length > 0 && <Awards project={project} />}

        {/* Pinned to the bottom so the links line up across cards of differing
            heights, rather than floating wherever the pitch happens to end. */}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-6">
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
    </li>
  );
}
