import { Link } from 'react-router';

import { SECTIONS, sectionHref } from '../content/sections';

/**
 * The section nav that ships in the footer, as text.
 *
 * The rail is desktop-only and the top bar's icons are unlabelled on touch (their
 * names are sr-only, and a hover pill can't survive that strip's horizontal
 * scroll), so this is the navigation a sighted touch user can actually read.
 *
 * Named "Section index" rather than "Sections" so it isn't a second landmark with
 * the same name as the nav in the top bar, which is visible at the same widths.
 */
export function FooterNav() {
  return (
    <nav aria-label="Section index" className="mt-6 lg:hidden">
      <ul className="flex list-none flex-wrap gap-x-4 gap-y-2 p-0">
        {SECTIONS.map(({ id, label }) => (
          <li key={id}>
            <Link
              to={sectionHref(id)}
              className="underline decoration-muted/40 underline-offset-4 transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
