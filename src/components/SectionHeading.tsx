import { heading, type HeadingKey } from '../theme/copy';
import { useTheme } from '../theme/useTheme';

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
    <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
      {heading(palette, section)}
    </h2>
  );
}
