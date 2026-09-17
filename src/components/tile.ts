/**
 * Shared chrome for the nav's small controls — the section tiles, the back-to-top
 * button, and both theme toggles. One definition so they can't drift apart: these
 * four sit in a column together and used to look like four different families.
 *
 * Square `size-10` hit area (40px, comfortably past the 24px minimum) and no fill
 * in any state — the only feedback is the ink going from muted to accent.
 */
export const TILE =
  'relative inline-flex size-10 shrink-0 items-center justify-center text-muted transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

/**
 * The selected/on state: accent ink, nothing else. The section tiles pair it with
 * the marker dot, so the state is never signalled by colour alone.
 */
export const TILE_ACTIVE = 'text-accent-start';

/**
 * The reveal-on-hover label, floated to the left of the tile so it overlays the
 * pane instead of displacing the rail. Shown on focus too — a hover-only
 * affordance would hide the name from keyboard users.
 */
export const PILL =
  'pointer-events-none absolute right-full z-10 mr-2 translate-x-1 whitespace-nowrap border border-muted/30 bg-background/90 px-3 py-1 font-mono text-sm text-foreground opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none';
