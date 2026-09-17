import { useReducedMotion } from '../lib/useReducedMotion';
import { ArrowUpIcon } from './icons';
import { TILE } from './tile';

/**
 * Scrolls the page back to the top — shared by the rail and the top bar, so both
 * widths get it.
 *
 * The document owns the scroll at every width, so this is just `window.scrollTo`.
 *
 * Always rendered and disabled until there's somewhere to go, so its position
 * never shifts and is learnable. A real `disabled` button is correctly skipped by
 * keyboard and announced as unavailable, and `pointer-events-none` keeps the
 * hover styling from firing on a control that can't be used.
 *
 * No hover label: the arrow is unambiguous, and the top bar has no room to float
 * one without overlapping the nav strip beside it.
 */
export function BackToTopButton({ scrolled }: { scrolled: boolean }) {
  const reduced = useReducedMotion();

  return (
    <button
      type="button"
      onClick={() =>
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
      }
      disabled={!scrolled}
      aria-label="Back to top"
      className={`${TILE} disabled:pointer-events-none disabled:opacity-40`}
    >
      <ArrowUpIcon className="size-5" />
    </button>
  );
}
