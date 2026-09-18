import type { ReactNode } from 'react';

import { SECTIONS } from '../content/sections';
import { heading, type HeadingKey } from '../theme/copy';
import { useTheme } from '../theme/useTheme';
import { SectionRule } from './SectionRule';

/**
 * The heading every home-page section opens with, under the elevation-ramp rule.
 * Reads the active palette and picks the matching copy, so headings shift into
 * Yorkshire dialect when the rose is lit and revert to standard English otherwise.
 * The class list was previously duplicated verbatim across seven components; it
 * lives here now.
 *
 * `children` render to the right of the heading on the same line, for the rare
 * case where something belongs beside a title rather than under it (the activity
 * chip on Projects). Wraps below the heading when there isn't room.
 */
export function SectionHeading({
  section,
  children,
}: {
  section: HeadingKey;
  children?: ReactNode;
}) {
  const { palette } = useTheme();
  const { Icon } = SECTIONS.find((entry) => entry.id === section) ?? {};

  return (
    <>
      <SectionRule />
      {/* The rule and the heading are a pair, so the gap between them is generous
          enough to read as deliberate rather than as a tight caption. */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 className="font-mono text-title text-foreground">
          {/* A flex row, so the icon centres on the text's line box rather than
              being aligned to its baseline. For this font's metrics — ascent
              1.02em, descent 0.3em, line-height 1.05em — the line box's centre
              lands at about 0.36em above the baseline, which is the cap height:
              the middle of the visual mass. Baseline alignment instead depends on
              the x-height, and sits the glyph low against capitals.

              Size and colour are inherited rather than set: 1em tracks the
              heading's clamp, and the strokes are currentColor. Already
              aria-hidden — the heading text carries the meaning. */}
          <span className="inline-flex items-center gap-3">
            {Icon && <Icon className="size-[1em] shrink-0" />}
            <span className="min-w-0">{heading(palette, section)}</span>
          </span>
        </h2>
        {children}
      </div>
    </>
  );
}
