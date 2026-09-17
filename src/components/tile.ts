/**
 * Shared chrome for the small round controls — the section tiles, the back-to-top
 * button, and both theme toggles. One definition so they can't drift apart: these
 * four sat in a column together and looked like four different families.
 *
 * Square `size-10` hit area (40px, comfortably past the 24px minimum), no border
 * or fill at rest, muted ink, and a tinted disc on hover — the same recess tokens
 * the rest of the chrome uses.
 */
export const TILE =
  'relative inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-[var(--color-control-hover)] hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

/** The selected/on state: accent ink plus the tinted disc, so it isn't colour alone. */
export const TILE_ACTIVE = 'bg-[var(--color-control-hover)] text-accent-start';

/**
 * The reveal-on-hover label, floated to the left of the tile so it overlays the
 * pane instead of displacing the rail. Shown on focus too — a hover-only
 * affordance would hide the name from keyboard users.
 */
export const PILL =
  'pointer-events-none absolute right-full z-10 mr-2 translate-x-1 whitespace-nowrap rounded-full border border-muted/30 bg-background/90 px-3 py-1 font-mono text-sm text-foreground opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none';
