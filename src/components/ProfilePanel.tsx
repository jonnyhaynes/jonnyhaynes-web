import { SECTION_IDS } from '../content/sections';
import { useActiveSectionContext } from '../lib/activeSectionContext';
import { useReducedMotion } from '../lib/useReducedMotion';
import { heading, type HeadingKey } from '../theme/copy';
import { useTheme } from '../theme/useTheme';
import { PortraitFigure } from './PortraitFigure';

/** One frame of the strip: full height, content centred. */
const SLOT = 'flex h-dvh shrink-0 items-center justify-center px-8';

/**
 * A section's title, as the panel shows it.
 *
 * Presentational, and always rendered inside an `aria-hidden` slot: the real
 * heading is in the section, and a second copy in the live regions would announce
 * every section name twice. The type matches the heading it came from, so the
 * title reads as having travelled from the content column into the panel.
 */
function PanelTitle({ id }: { id: string }) {
  const { palette } = useTheme();

  return (
    // text-balance so a three-line title breaks evenly instead of leaving one word
    // on its own line.
    <p className="text-balance font-mono text-title text-foreground">
      {heading(palette, id as HeadingKey)}
    </p>
  );
}

/**
 * The left panel: a window onto the portrait and the section titles.
 *
 * It is a strip of full-height slots — the portrait first, then one per section in
 * document order — translated by the reader's position in the page. So scrolling
 * carries a title up through the panel, holds it while its section is current, and
 * carries it out as the next arrives from below. The portrait takes part in the
 * same motion: scrolling into the first section slides it out and "Projects" in,
 * with no special case for the handover.
 *
 * The position comes from `--strip-progress`, written on the document element by
 * useActiveSection. It has to arrive that way rather than as state — it changes on
 * every frame of a scroll, and re-rendering for a transform is what the portrait's
 * parallax already avoids.
 *
 * lg only. Below that the panel is stacked above the content and the hero carries
 * the portrait, so the sections keep their own visible titles.
 */
export function ProfilePanel() {
  const { active } = useActiveSectionContext();
  const reduced = useReducedMotion();

  return (
    <div className="hidden overflow-hidden lg:sticky lg:top-0 lg:block lg:h-dvh">
      {reduced ? (
        // No strip, so no travel: the current answer, swapped at the boundaries.
        // The movement is the entire effect, so a slowed-down version of it would
        // be the one thing this setting exists to avoid.
        <div className={SLOT}>
          {active ? (
            <div aria-hidden="true">
              <PanelTitle id={active} />
            </div>
          ) : (
            <PortraitFigure />
          )}
        </div>
      ) : (
        <div className="panel-strip">
          <div className={SLOT}>
            <PortraitFigure />
          </div>

          {SECTION_IDS.map((id) => (
            <div className={SLOT} key={id} aria-hidden="true">
              <PanelTitle id={id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
