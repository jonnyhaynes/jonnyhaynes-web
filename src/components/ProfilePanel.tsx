import { Link } from 'react-router';

import { SITE } from '../content/site';
import { sectionHref } from '../content/sections';
import { copy } from '../theme/copy';
import { useTheme } from '../theme/useTheme';
import { PortraitFigure } from './PortraitFigure';
import { ArrowUpRightIcon, DownloadIcon, GitHubIcon, LinkedInIcon } from './icons';

/** Circular icon button, floated over the portrait's top corner. */
const SOCIAL =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-muted/25 bg-background/60 text-muted backdrop-blur-sm transition-colors hover:border-accent-start hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

/** The round arrow that leads the call-to-action row. */
const CIRCLE =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent-start text-background transition-colors hover:bg-accent-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

/** The primary pill beside it. */
const PILL =
  'inline-flex items-center justify-center rounded-full bg-accent-start px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-accent-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

const GHOST =
  'inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

/** The role board's resting values, as one plain string for the identity block. */
const ROLE = `${SITE.hero.roleWords[0][0]} ${SITE.hero.roleWords[1][0]}`;

/**
 * The site's identity panel. Home only — `/privacy` uses the plain shell, so the
 * legal copy isn't presented beside a portrait.
 *
 * Deliberately not a `<header>`: that would make it a page-level banner landmark
 * ahead of the content. It's an `<aside>`, and its name is a `<p>`, not a heading —
 * the page keeps exactly one `<h1>` (the hero's), and the panel must not insert a
 * competing level into the document outline.
 *
 * Laid out as a card: the portrait fills the upper area with the socials floated
 * over its corner, and the identity, rule and calls to action sit beneath it. The
 * cut-out can't bleed to the card's edges the way a photograph would — it has
 * transparent margins — so it stands on the identity block instead of being
 * cropped to fill.
 */
export function ProfilePanel() {
  const { palette } = useTheme();
  const c = copy(palette).hero;
  const contact = copy(palette).contact;

  return (
    <aside
      aria-labelledby="profile-name"
      className="min-w-0 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:p-4"
    >
      <div className="flex h-full flex-col overflow-hidden p-6 lg:rounded-2xl lg:border lg:border-muted/20 lg:bg-background/70 lg:backdrop-blur-sm">
        {/* From lg the card is a fixed height, so the portrait takes the space the
            identity block leaves and scales to it. Below lg the card has no fixed
            height and the figure sets its own. */}
        <div className="relative flex items-end justify-start lg:min-h-0 lg:flex-1 lg:justify-center">
          <div className="absolute top-0 right-0 z-10 flex gap-2">
            <a
              href={SITE.githubUrl}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="GitHub"
              className={SOCIAL}
            >
              <GitHubIcon className="size-5" />
            </a>
            <a
              href={SITE.linkedinUrl}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="LinkedIn"
              className={SOCIAL}
            >
              <LinkedInIcon className="size-5" />
            </a>
          </div>

          <PortraitFigure />
        </div>

        <div className="flex shrink-0 flex-col gap-3 pt-6">
          <p id="profile-name" className="font-mono text-2xl font-bold text-foreground">
            {SITE.name}
          </p>
          <p className="font-mono text-sm text-accent-start">{ROLE}</p>
          <p className="text-sm text-muted">{c.subheadline}</p>

          <div className="my-2 h-px bg-muted/25" />

          <div className="flex items-center gap-3">
            {/* A section link, so it's a router Link. The arrow carries no text,
                so the accessible name comes from the label. */}
            <Link
              to={sectionHref('projects')}
              aria-label={c.viewWork}
              className={CIRCLE}
            >
              <ArrowUpRightIcon className="size-5" />
            </Link>
            <Link to={sectionHref('contact')} className={PILL}>
              {c.getInTouch}
            </Link>
          </div>

          {SITE.resumeUrl && (
            <a href={SITE.resumeUrl} className={GHOST}>
              <DownloadIcon className="size-4" />
              {contact.downloadResume}
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
