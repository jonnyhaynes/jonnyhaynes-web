import { type CSSProperties, useState } from 'react';

/**
 * A single split-flap "flapper" for one word position in the hero headline.
 *
 * The parent (Hero) owns the cycle and passes the current `index` into
 * `words`; on each change we play a two-panel card flip — the outgoing word's
 * top half folds down (`flip-out`) while the incoming word is revealed
 * beneath (`flip-in`). The flap panels are decorative and `aria-hidden`; the
 * accessible role text lives in a single sr-only span in Hero, so this reads
 * as ambient motion, not announced status.
 *
 * Layout stability is load-bearing for a headline: we stack every possible
 * word invisibly in the same box so the flapper reserves its widest word's
 * width/height. Nothing reflows as the word changes. Motion is gated on
 * prefers-reduced-motion by the CSS in index.css (the .flip-* animations get a
 * no-op reduce branch), and the parent won't even advance the index when
 * reduced motion is on — so this renders a static word in that case.
 *
 * `delayMs` staggers this flapper behind the others so the board doesn't snap
 * all at once — it applies as an animation-delay on the flip.
 */
export function FlipWord({
  words,
  index,
  delayMs = 0,
}: {
  words: readonly string[];
  index: number;
  delayMs?: number;
}) {
  // Track the *previous* index we rendered so a flip can play from the old word
  // to the new one. Uses React's sanctioned "adjust state during render"
  // pattern: when `index` differs from what we last saw, we update state inline
  // (not in an effect) and React re-renders before painting. We remember the
  // prior index as `from` for this render, and bump `key` to restart the CSS
  // animation. No refs, no effect.
  const [seen, setSeen] = useState({ index, from: index, key: 0 });
  if (seen.index !== index) {
    setSeen({ index, from: seen.index, key: seen.key + 1 });
  }

  const current = words[index] ?? words[0];
  const previous = words[seen.from] ?? current;
  const isFlipping = seen.from !== index && seen.key > 0;
  const flipKey = seen.key;

  return (
    <span className="flip-word">
      {/* Sizer: every word stacked, invisible, reserves the widest box so the
          flapper never reflows. aria-hidden — real text is announced elsewhere. */}
      <span className="flip-word__sizer" aria-hidden="true">
        {words.map((w, i) => (
          <span key={i} className="flip-word__ghost">
            {w}
          </span>
        ))}
      </span>

      {/* Visible flap, layered over the sizer. Decorative. The --flip-delay
          custom property staggers this flapper's flip (see index.css). */}
      <span
        className="flip-word__flap animate-gradient"
        aria-hidden="true"
        style={{ '--flip-delay': `${delayMs}ms` } as CSSProperties}
      >
        {isFlipping ? (
          <>
            {/* Outgoing word folds away. */}
            <span key={`out-${flipKey}`} className="flip-word__panel flip-out">
              {previous}
            </span>
            {/* Incoming word is revealed. */}
            <span key={`in-${flipKey}`} className="flip-word__panel flip-in">
              {current}
            </span>
          </>
        ) : (
          <span className="flip-word__panel">{current}</span>
        )}
        {/* Split-flap hinge line across the fold axis (mid-height). Purely
            decorative; sits above the panels so it reads as the seam a real
            board folds along. */}
        <span className="flip-word__hinge" />
      </span>
    </span>
  );
}
