import { BackToTopButton } from './BackToTopButton';
import { PaletteToggle } from '../theme/PaletteToggle';
import { ThemeToggle } from '../theme/ThemeToggle';
import { SectionNavLinks } from './SectionNavLinks';

/**
 * The vertical icon rail down the right edge — desktop only (lg and up), present
 * on every route so the site's chrome doesn't change shape between pages.
 *
 * Sticks to the top of the viewport for as long as the page is long; the document
 * owns the scroll, so the chrome sits beside the content rather than in its own
 * scroll pane.
 *
 * Order matches the top bar: back-to-top, then the links, then the two mode
 * toggles (palette before theme, the same left-to-right order they read in when
 * the bar lays them out in a row).
 */
export function SectionRail({
  active,
  scrolled,
}: {
  active: string | null;
  scrolled: boolean;
}) {
  return (
    <div className="z-10 hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:items-center lg:gap-1 lg:py-4">
      <BackToTopButton scrolled={scrolled} />

      <SectionNavLinks active={active} orientation="vertical" />

      <div className="mt-auto flex flex-col items-center gap-2 pt-4">
        <PaletteToggle />
        <ThemeToggle />
      </div>
    </div>
  );
}
