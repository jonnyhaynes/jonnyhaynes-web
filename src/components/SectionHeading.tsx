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
      <div className="mt-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-mono text-title text-foreground">
          {/* Inside the heading, so it takes the size and colour of the type it
              sits with rather than being told them: 1em tracks the clamp, and the
              strokes are currentColor, so it's foreground like the words. Already
              aria-hidden — the heading text carries the meaning.

              align-middle rather than the default baseline: on the baseline a 1em
              box rests its bottom edge there and reads low against the caps. */}
          {Icon && <Icon className="mr-3 inline-block size-[1em] align-middle" />}
          {heading(palette, section)}
        </h2>
        {children}
      </div>
    </>
  );
}
