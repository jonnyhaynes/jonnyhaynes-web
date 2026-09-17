import { PaletteToggle } from '../theme/PaletteToggle';
import { ThemeToggle } from '../theme/ThemeToggle';
import { BackToTopButton } from './BackToTopButton';
import { SectionNavLinks } from './SectionNavLinks';

/**
 * The top bar below lg — mobile and tablet, where the rail's nav moves up here
 * instead of sitting down the right edge.
 *
 * Sticks to the top of the viewport, since the document owns the scroll below lg
 * as well as at lg. Hidden at lg, where the rail takes over: the two are mutually
 * exclusive in the accessibility tree, so no control is ever announced twice.
 *
 * The section links are icon tiles in a horizontal scroll strip. Back-to-top
 * leads the row, ahead of the links, matching the rail's order at lg — and it
 * sits outside the strip so it can't scroll out of reach. The strip scrolls
 * sideways to fit seven links plus three controls on a phone, and at tablet width
 * it fits with no scrolling at all. The live activity chip is deliberately not
 * here: the shell renders it on the row below this bar.
 */
export function MobileBar({
  active,
  scrolled,
}: {
  active: string | null;
  scrolled: boolean;
}) {
  return (
    <header className="mobile-bar sticky top-0 z-20 flex items-center gap-2 border-b border-muted/15 bg-background/80 px-4 backdrop-blur-sm lg:hidden">
      <BackToTopButton scrolled={scrolled} />
      <SectionNavLinks active={active} orientation="horizontal" />
      <div className="flex shrink-0 items-center gap-1">
        <PaletteToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
