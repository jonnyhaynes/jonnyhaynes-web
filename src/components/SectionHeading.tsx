import { heading, type HeadingKey } from '../theme/copy';
import { useTheme } from '../theme/useTheme';
import { SectionRule } from './SectionRule';

/**
 * The `// section name` heading shared by every home-page section. Reads the
 * active palette and picks the matching copy, so headings shift into Yorkshire
 * dialect when the rose is lit and revert to standard English otherwise. The
 * class list was previously duplicated verbatim across seven components; it
 * lives here now.
 */
export function SectionHeading({ section }: { section: HeadingKey }) {
  const { palette } = useTheme();
  return (
    <>
      <SectionRule />
      <h2 className="mt-5 font-mono text-title text-foreground">
        {heading(palette, section)}
      </h2>
    </>
  );
}
