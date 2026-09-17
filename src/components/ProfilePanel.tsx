import { Link } from 'react-router';

import { SITE } from '../content/site';
import { sectionHref } from '../content/sections';
import { copy } from '../theme/copy';
import { useTheme } from '../theme/useTheme';
import { PortraitFigure } from './PortraitFigure';
import { GitHubIcon, LinkedInIcon } from './icons';

const PRIMARY =
  'rounded-md bg-accent-start px-4 py-2.5 text-center text-sm font-medium text-background transition-colors hover:bg-accent-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

const SECONDARY =
  'rounded-md border border-muted/40 bg-background/70 px-4 py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:border-accent-start hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

const SOCIAL =
  'text-muted transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

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
 * The portrait shows at every width: the panel is either stacked full-width (below
 * lg, where it opens the page) or the column at lg. There is no condensed in-between
 * tier, so it never has to be dropped.
 */
export function ProfilePanel() {
  const { palette } = useTheme();
  const c = copy(palette).hero;

  return (
    <aside
      aria-labelledby="profile-name"
      className="min-w-0 lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto lg:p-4"
    >
      <div className="flex h-full flex-col gap-6 p-6 lg:rounded-2xl lg:border lg:border-muted/20 lg:bg-background/70 lg:backdrop-blur-sm">
        <div className="shrink-0">
          <PortraitFigure />
        </div>

        <div className="flex flex-col gap-3 lg:mt-auto">
          <p id="profile-name" className="font-mono text-2xl font-bold text-foreground">
            {SITE.name}
          </p>
          <p className="font-mono text-sm text-accent-start">{ROLE}</p>
          <p className="text-sm text-muted">{c.subheadline}</p>

          <div className="mt-3 flex flex-col gap-2">
            <Link to={sectionHref('projects')} className={PRIMARY}>
              {c.viewWork}
            </Link>
            <Link to={sectionHref('contact')} className={SECONDARY}>
              {c.getInTouch}
            </Link>
            {SITE.resumeUrl && (
              <a href={SITE.resumeUrl} className={SECONDARY}>
                {copy(palette).contact.downloadResume}
              </a>
            )}
          </div>

          {/* The live activity chip sits at the top of the hero, not here. */}
          <div className="mt-4 flex items-center gap-4">
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
        </div>
      </div>
    </aside>
  );
}
