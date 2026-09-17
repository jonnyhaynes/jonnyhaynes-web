import type { ReactNode } from 'react';

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
  return (
    <>
      <SectionRule />
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="font-mono text-title text-foreground">
          {heading(palette, section)}
        </h2>
        {children}
      </div>
    </>
  );
}
