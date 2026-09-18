import { type CSSProperties, useEffect, useState } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';

/**
 * A mechanical split-flap / airport-arrivals board for one word position in the
 * hero headline. The word is laid out as a fixed grid of character slots (one
 * per column, sized to the longest word this flapper will show, in the site's
 * monospace face). When the target word changes, each slot "riffles" through a
 * sequence of glyphs and settles on its final letter, staggered left-to-right —
 * the classic tumble of an arrivals board.
 *
 * Decorative: the whole board is aria-hidden. The readable text is a single
 * sr-only span in Hero, so screen readers get one clean name and this never
 * announces its churn. Layout is stable — the slot count is fixed, so the board
 * reserves a constant width; shorter words settle trailing slots to blank.
 * Reduced motion is honoured: no riffle, the final letters appear at once (see
 * useReducedMotion in ../lib).
 *
 * Two things vary between the headline's three boards, so they're props rather
 * than assumptions:
 * - `uppercase` — the role board is upper-cased to match the display type; the
 *   article that opens the line is not, because it's set in the headline's own
 *   case ("I'm an AI Enthusiast", not "I'M AN AI ENTHUSIAST").
 * - `gradient` — the role board carries the animated gradient; the article takes
 *   the headline's plain ink, because it reads as part of the static sentence
 *   rather than as the thing being announced.
 */

/** Glyphs a slot rolls through while settling. Upper-case + a few symbols; the
 *  headline is monospace, so these all share the cell width. */
const RIFFLE_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-#*'.split('');
const RIFFLE_LOWER = 'abcdefghijklmnopqrstuvwxyz-#*'.split('');

// Timing (ms). Each slot rolls one glyph per RIFFLE_STEP; slot i doesn't start
// until i * SLOT_STAGGER has passed, and rolls for RIFFLE_STEPS glyphs.
const RIFFLE_STEP = 45;
const SLOT_STAGGER = 55;
const RIFFLE_STEPS = 8;

export function FlipWord({
  words,
  index,
  delayMs = 0,
  uppercase = true,
  gradient = true,
}: {
  words: readonly string[];
  index: number;
  delayMs?: number;
  uppercase?: boolean;
  gradient?: boolean;
}) {
  const reduced = useReducedMotion();
  const glyphs = uppercase ? RIFFLE_UPPER : RIFFLE_LOWER;

  // Fixed slot count = the longest word this flapper can show. Constant width.
  const slotCount = words.reduce((m, w) => Math.max(m, w.length), 0);
  const raw = words[index] ?? words[0];
  const target = uppercase ? raw.toUpperCase() : raw;

  // Transition state: which word we're riffling `from`, which `to`, and a `run`
  // counter that changes on every new transition to re-key the riffle effect.
  // Set via React's render-phase "adjust state during render" pattern (no ref
  // reads during render, no synchronous setState in an effect).
  // `frame` counts riffle ticks since the current transition began; it's
  // advanced only by the timer (async, so no cascading-render lint issue). We
  // reset it to 0 in the same render-phase update that bumps `run`, so the
  // effect never has to synchronously setState.
  const [frame, setFrame] = useState(0);
  const [trans, setTrans] = useState({ from: target, to: target, run: 0 });
  if (trans.to !== target) {
    setTrans((t) => ({ from: t.to, to: target, run: t.run + 1 }));
    setFrame(0);
  }

  useEffect(() => {
    if (trans.run === 0 || reduced) return; // first paint / reduced motion: settled
    const lastSlotStart = ((slotCount - 1) * SLOT_STAGGER) / RIFFLE_STEP;
    const totalTicks = Math.ceil(lastSlotStart) + RIFFLE_STEPS + 1;
    let interval: ReturnType<typeof setInterval> | undefined;
    // `delayMs` staggers this whole flapper behind the others so the boards
    // don't all start riffling in the same instant.
    const startTimer = setTimeout(() => {
      let t = 0;
      interval = setInterval(() => {
        t += 1;
        setFrame(t);
        if (t >= totalTicks && interval) clearInterval(interval);
      }, RIFFLE_STEP);
    }, delayMs);
    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
    };
  }, [trans.run, reduced, slotCount, delayMs]);

  // Once the transition has fully settled (or under reduced motion / first
  // paint), show the target directly; otherwise derive each slot's glyph.
  const settled = reduced || trans.run === 0;
  const elapsed = frame * RIFFLE_STEP;

  const slots = Array.from({ length: slotCount }, (_, i) => {
    const finalChar = target[i] ?? '';
    if (settled) return { char: finalChar, rolling: false };

    const startAt = i * SLOT_STAGGER;
    const settleAt = startAt + RIFFLE_STEPS * RIFFLE_STEP;

    if (elapsed >= settleAt) {
      return { char: finalChar, rolling: false };
    }
    if (frame === 0 || elapsed < startAt) {
      // Not rolling yet (incl. the reset frame): show the outgoing word's char.
      return { char: trans.from[i] ?? '', rolling: false };
    }
    // Mid-riffle: pick a glyph based on how far into the roll this slot is.
    const step = Math.floor((elapsed - startAt) / RIFFLE_STEP);
    const glyph = glyphs[(i * 7 + step * 3) % glyphs.length];
    return { char: glyph, rolling: true };
  });

  return (
    <span
      className="flip-word"
      aria-hidden="true"
      style={{ '--role-slots': slotCount } as CSSProperties}
    >
      {slots.map((slot, i) => (
        <span
          key={i}
          className={`flip-slot${gradient ? ' animate-gradient' : ''}${slot.rolling ? ' flip-slot--rolling' : ''}`}
          style={{ '--slot-i': i } as CSSProperties}
        >
          {/* Non-breaking space keeps an empty slot's box. */}
          {slot.char === '' ? ' ' : slot.char}
        </span>
      ))}
    </span>
  );
}
