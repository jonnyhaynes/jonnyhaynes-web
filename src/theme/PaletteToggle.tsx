import { YorkshireRose } from '../components/YorkshireRose';
import { useTheme } from './useTheme';

/**
 * The palette (colour flavour) toggle: a single Yorkshire rose that lights up.
 *
 * The rose is the same heraldic mark used in the footer — drawn in
 * `currentColor` with its petals showing the page background through. State is
 * shown by ink colour, mirroring how the sun/moon toggle sits in neutral ink:
 *   - off (default palette): text-foreground — the same neutral ink the sun/moon
 *     glyph uses, so the two toggles sit at equal weight side by side.
 *   - on (yorkshire): text-accent-start — the rose "blooms" into the flag/heather
 *     blue. The accent token flips with light/dark, so the lit rose is the right
 *     blue in either mode for free.
 * Both states hover to accent-start (via the button's group-hover), exactly like
 * the sun/moon. No opacity fade.
 *
 * Matches ThemeToggle's conventions: circular pill, backdrop blur, focus-visible
 * accent outline, reveal-on-hover label, motion-reduce instant swap.
 */
export function PaletteToggle() {
  const { palette, togglePalette, paletteTitle } = useTheme();
  const on = palette === 'yorkshire';

  return (
    <button
      type="button"
      onClick={togglePalette}
      aria-label={paletteTitle}
      aria-pressed={on}
      className="group relative inline-flex items-center rounded-full border border-muted/30 bg-background/70 p-1 text-foreground backdrop-blur-sm transition-colors hover:border-accent-start hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
    >
      {/* Reveal-on-hover label — positioned absolutely to the left of the rose
          (right-full) so it floats OVER the neighbouring content instead of
          pushing it, matching ThemeToggle. aria-hidden: the button carries the
          label via aria-label. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-full mr-1 whitespace-nowrap rounded-full border border-muted/30 bg-background/90 px-3 py-1 font-mono text-sm opacity-0 backdrop-blur-sm transition-all duration-300 translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
      >
        {paletteTitle}
      </span>
      <span className="inline-flex size-8 shrink-0 items-center justify-center">
        {/* Grayscale → colour, mirroring the sun/moon's ink behaviour:
            - off: text-foreground (the same neutral ink the sun/moon sit in)
            - on:  text-accent-start (the rose "blooms" into the flag/heather blue)
            Both states hover to accent-start via the button's group-hover, so it
            tracks the sun/moon exactly. No opacity fade — it sits at equal weight
            beside the other toggle. The rose fills the icon box; kept a touch
            under 8 so the linework doesn't clip the pill. */}
        <YorkshireRose
          className={`size-6 transition-colors duration-300 group-hover:text-accent-start motion-reduce:transition-none ${
            on ? 'text-accent-start' : 'text-foreground'
          }`}
        />
      </span>
    </button>
  );
}
