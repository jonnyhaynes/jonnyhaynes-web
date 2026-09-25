/** The canvas background's low→high glyph ramp (see TopographicBackground). */
const RAMP = '·:-=+*#%@';

/**
 * The rule that opens each section: the background's own elevation ramp, mirrored
 * into a little profile — the characters the canvas uses to shade height, quoted
 * back as a divider.
 *
 * Purely decorative, so it's aria-hidden. Repeats past the container and clips,
 * which makes it behave like a rule at any width without measuring anything.
 */
export function SectionRule() {
  const profile = `${RAMP}${[...RAMP].reverse().join('')}`;

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden whitespace-nowrap font-mono text-[0.7rem] leading-none tracking-[0.35em] text-muted/40 select-none"
    >
      {profile.repeat(10)}
    </div>
  );
}
