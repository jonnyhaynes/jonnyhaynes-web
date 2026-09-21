import { useEffect, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router';

import { SECTION_IDS } from '../content/sections';
import { useActiveSection } from '../lib/useActiveSection';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useTraverse } from '../lib/traverse';
import { MapStrip } from './MapStrip';
import { MobileBar } from './MobileBar';
import { SectionRail } from './SectionRail';

/** How many frames to keep looking for a section that hasn't mounted yet. */
const SEEK_FRAMES = 30;

/**
 * The app shell: a fixed profile panel, a scrolling content pane, and the icon
 * rail. Which of the two variants a route uses is decided by its layout route
 * (`PanelShell` / `PlainShell`) rather than by reading the pathname here, so the
 * route tree stays the single source of truth for what a page is.
 *
 * The document owns the scroll at every width — the shell lays the columns out but
 * doesn't scroll them — so the panel and rail stick beside the page rather than
 * living in their own scroll pane. See the `.shell` rules in index.css, where
 * `data-layout` selects the column template.
 *
 * `useTraverse` is measured here for the same reason the active section is: the
 * strip reads it, the background draws from it, and two observers over one scroll
 * position would be two sources of truth.
 */
function ShellFrame({
  layout,
  panel,
}: {
  /** `panel` reserves a leading column for `panel`; `flush` starts the pane at the
   *  left edge and holds it to two thirds with a trailing spacer. */
  layout: 'panel' | 'flush';
  panel?: ReactNode;
}) {
  const { pathname, hash, key } = useLocation();
  const reduced = useReducedMotion();

  // Watched once, here, and handed to both navs: the rail needs the active
  // section and the scroll state, the top bar needs the active section, and two
  // observers measuring the same page would be two sources of truth.
  const { active, scrolled } = useActiveSection(SECTION_IDS);
  const traverse = useTraverse();

  /**
   * Owns scrolling for two things the browser can't cover:
   *
   * 1. Navigating between routes should start at the top; the browser's own reset
   *    doesn't fire reliably for a client-side route change.
   * 2. Router links call `pushState`, which does *not* trigger the browser's
   *    scroll-to-anchor behaviour the way clicking a plain `<a href="#…">` does.
   *    So the section links in the rail and the footer have to be scrolled here,
   *    or they change the URL and go nowhere.
   *
   * `key` is in the deps so clicking the same section link twice scrolls again,
   * and `hash` covers cross-route landings (`/#health` from /privacy).
   */
  useEffect(() => {
    const id = hash.startsWith('#') ? hash.slice(1) : '';

    if (!id) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const behavior: ScrollBehavior = reduced ? 'auto' : 'smooth';
    let frame = 0;
    let attempts = 0;

    const seek = () => {
      const target = document.getElementById(id);
      if (target) {
        // scroll-margin on the section keeps it clear of the sticky bar, and
        // scrollIntoView honours it.
        target.scrollIntoView({ behavior, block: 'start' });
        return;
      }
      // Sections whose data hasn't landed render nothing, so the target may not
      // exist on the frame this runs. Retry briefly rather than giving up.
      if (attempts++ < SEEK_FRAMES) frame = requestAnimationFrame(seek);
    };

    seek();
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash, key, reduced]);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {/* Both rows are full-width chrome rather than grid columns, so they sit
          outside `.shell`. Below lg the bar leads and the strip tucks under it;
          from lg the bar is hidden and the strip leads on its own. */}
      <MobileBar active={active} scrolled={scrolled} />
      <MapStrip traverse={traverse} />

      <div className="shell" data-layout={layout}>
        {panel}
        <div className="pane">
          <Outlet />
        </div>

        {/* The flush layout's trailing spacer. It holds the pane to two thirds
            without reserving anything in front of it, so the content starts at the
            left edge. */}
        {layout === 'flush' && <div aria-hidden="true" />}

        <SectionRail active={active} scrolled={scrolled} />
      </div>
    </>
  );
}

/**
 * Home. The pane and the rail, with nothing ahead of the pane — the portrait is
 * the hero's leading column now, so the shell has no panel to reserve room for.
 */
export function PanelShell() {
  return <ShellFrame layout="panel" />;
}

/**
 * Every other route. No panel and no leading gap: the pane keeps the two-thirds
 * measure the sheet gives it, but starts at the left edge, so the content and the
 * footer sit flush left instead of being pushed in by a column with nothing in it.
 */
export function PlainShell() {
  return <ShellFrame layout="flush" />;
}
