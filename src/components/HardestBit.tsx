import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';

/**
 * The "hardest bit" block for a project card: a disclosure. Collapsed, it shows
 * the label and a terminal-style prompt ($ cat …); pressing it reveals the full
 * note, "typed out" character by character like terminal output. Pressing again
 * ($ clear) hides it.
 *
 * Accessibility — a real disclosure widget with honest semantics:
 * - The prompt is a native <button> with aria-expanded + aria-controls pointing
 *   at the region it shows/hides, and a stable accessible name ("… the hardest
 *   bit"). Keyboard-operable with a visible focus ring.
 * - The disclosed region is genuinely hidden (`hidden`) when collapsed, so a
 *   screen reader isn't already reading text the button claims to reveal (the
 *   classic disclosure mismatch). When open it holds TWO layers:
 *     1. an sr-only copy of the COMPLETE note — read by AT the instant it
 *        expands, so assistive tech never waits on or hears the animation;
 *     2. a visual-only, aria-hidden layer that paints the typed-so-far slice
 *        plus the caret for sighted users.
 * - Reduced motion (see ../lib/useReducedMotion): the visual layer shows the
 *   full note at once — no per-character timer, no blinking caret.
 */

// Typewriter cadence (ms per character). Kept brisk so a long note doesn't drag.
const TYPE_STEP = 12;

export function HardestBit({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const regionId = useId();
  const [open, setOpen] = useState(false);
  // Animation counter: how many characters have been painted so far. Only
  // meaningful while open + animating. Reset during render on each open
  // transition (React's "adjust state during render" pattern) so the effect
  // never has to synchronously setState.
  const [typed, setTyped] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setTyped(0); // restart the typewriter from the first character
  }
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    // Only the animated case needs an effect; collapsed and reduced-motion are
    // derived during render below. The counter is reset during render (above).
    if (!open || reduced) return;
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= text.length && timer.current) clearInterval(timer.current);
    }, TYPE_STEP);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [open, reduced, text]);

  // Characters painted by the visual layer: reduced motion → all at once;
  // mid-animation → the count so far.
  const shown = reduced ? text.length : Math.min(typed, text.length);
  const typing = !reduced && shown < text.length;

  return (
    <div className="mt-3 border-l-2 border-accent-start/50 pl-3 text-sm text-muted">
      <p className="font-mono text-xs uppercase tracking-wider text-accent-start">
        Hardest bit
      </p>

      {/* Disclosed region: genuinely hidden when collapsed. When open it carries
          the complete note for AT (sr-only) plus a visual-only typed layer. */}
      <div id={regionId} hidden={!open} className="mt-1">
        {/* 1. Full note for assistive tech — present the instant we expand. */}
        <p className="sr-only">{text}</p>

        {/* 2. Visual-only typewriter for sighted users. The untyped remainder is
               rendered invisibly so the paragraph reserves its final height and
               the layout doesn't jump line-by-line as it types. */}
        <p aria-hidden="true">
          <span>{text.slice(0, shown)}</span>
          {typing && <span className="hb-caret" />}
          {typing && <span className="invisible">{text.slice(shown)}</span>}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={regionId}
        className="mt-1.5 inline-flex items-center font-mono text-xs text-accent-start transition-colors hover:text-accent-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
      >
        <span aria-hidden="true">
          {open ? '$ clear' : '$ cat hardest-bit'}
        </span>
        {/* Resting cursor on the prompt only while collapsed and idle. */}
        {!open && <span className="hb-caret" />}
        <span className="sr-only">
          {open ? 'Collapse the hardest bit' : 'Read the full hardest bit'}
        </span>
      </button>
    </div>
  );
}
