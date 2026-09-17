import { useEffect, useRef } from 'react';
import { Link } from 'react-router';

import { SECTIONS, sectionHref } from '../content/sections';
import { useReducedMotion } from '../lib/useReducedMotion';
import { heading } from '../theme/copy';
import { useTheme } from '../theme/useTheme';
import { PILL, TILE, TILE_ACTIVE } from './tile';

/**
 * The section links, shared by the desktop rail and the mobile/tablet top bar so
 * the two can't drift apart in markup, ordering, labelling or active state.
 *
 * Always real anchors (`/#projects`), so they're keyboard-operable, crawlable and
 * work with JavaScript disabled. The active tile is marked three ways — accent
 * ink, a tinted disc, and a dot — so state never rests on colour alone.
 *
 * Vertical (the rail) floats a `// Section` label to the left on hover and focus.
 * Horizontal (the top bar) deliberately doesn't: it's a horizontal scroll
 * container, and an absolutely positioned pill would be clipped by it. Those tiles
 * carry their name as sr-only text instead, and the footer's text list is the
 * labelled nav for sighted touch users.
 */
export function SectionNavLinks({
  active,
  orientation,
}: {
  active: string | null;
  orientation: 'vertical' | 'horizontal';
}) {
  const { palette } = useTheme();
  const reduced = useReducedMotion();
  const vertical = orientation === 'vertical';

  const navRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  /**
   * On a phone the strip is wider than the screen, so the active section's tile
   * can sit off the end of it — the indicator would be working but invisible.
   * Bring it back into view by scrolling only the strip (`scrollBy` on the nav),
   * which can't touch the page's own scroll position, and only when it's actually
   * out of view.
   */
  useEffect(() => {
    if (vertical) return;
    const nav = navRef.current;
    const tile = activeRef.current;
    if (!nav || !tile) return;

    const navBox = nav.getBoundingClientRect();
    const tileBox = tile.getBoundingClientRect();
    if (tileBox.left >= navBox.left && tileBox.right <= navBox.right) return;

    nav.scrollBy({
      left: tileBox.left - navBox.left - navBox.width / 2 + tileBox.width / 2,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [active, vertical, reduced]);

  return (
    <nav
      ref={navRef}
      aria-label="Sections"
      className={
        vertical ? 'flex flex-col items-center' : 'min-w-0 flex-1 overflow-x-auto'
      }
    >
      <ul
        className={
          vertical
            ? 'flex list-none flex-col items-center gap-1 p-0'
            : 'flex w-max list-none items-center gap-0.5 p-0'
        }
      >
        {SECTIONS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <Link
                ref={isActive ? activeRef : undefined}
                to={sectionHref(id)}
                aria-current={isActive ? 'true' : undefined}
                className={`${TILE} group ${isActive ? TILE_ACTIVE : ''}`}
              >
                <span className="sr-only">{label}</span>
                {vertical && (
                  <span aria-hidden="true" className={PILL}>
                    {heading(palette, id)}
                  </span>
                )}
                <Icon className="size-5" />
                {isActive && <span aria-hidden="true" className="rail-marker" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
