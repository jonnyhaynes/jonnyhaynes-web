import { YorkshireRose } from '../components/YorkshireRose';
import { PILL, TILE, TILE_ACTIVE } from '../components/tile';
import { useTheme } from './useTheme';

/**
 * The palette toggle: a single Yorkshire rose, drawn as a plain rail tile to
 * match the section links and the big-light toggle.
 *
 * State is carried the same way the section tiles carry "current": accent ink on
 * a tinted disc when lit, muted ink at rest — so the rose blooming into the
 * flag/heather blue reads as the same kind of thing as the active section.
 * The accent token flips with light/dark, so it's the right blue in either mode.
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
      className={`${TILE} group ${on ? TILE_ACTIVE : ''}`}
    >
      <span aria-hidden="true" className={PILL}>
        {paletteTitle}
      </span>
      <YorkshireRose className="size-5" />
    </button>
  );
}
