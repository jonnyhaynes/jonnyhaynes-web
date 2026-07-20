import { type CSSProperties, useEffect, useState } from 'react';

/**
 * A mechanical split-flap / airport-arrivals board for one word position in the
 * hero headline. The word is laid out as a fixed grid of character slots (one
 * per column, sized to the longest word this flapper will show, in the site's
 * monospace face). When the target word changes, each slot "riffles" through a
 * sequence of glyphs and settles on its final letter, staggered left-to-right —
 * the classic tumble of an arrivals board.
 *
 * Decorative: the whole board is aria-hidden. The readable role text is a
 * single sr-only span in Hero, so screen readers get one clean name and this
 * never announces its churn. Layout is stable — the slot count is fixed, so the
 * board reserves a constant width; shorter words settle trailing slots to
 * blank. Reduced motion is honoured: no riffle, the final letters appear at
 * once (see useReducedMotion below).
 */

// Glyphs a slot rolls through while settling. Upper-case + a few symbols; the
// headline is upper-cased and monospace, so these all share the cell width.
const RIFFLE_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-#*'.split('');

// Timing (ms). Each slot rolls one glyph per RIFFLE_STEP; slot i doesn't start
// until i * SLOT_STAGGER has passed, and rolls for RIFFLE_STEPS glyphs.
const RIFFLE_STEP = 45;
const SLOT_STAGGER = 55;
const RIFFLE_STEPS = 8;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function FlipWord({
  words,
  index,
  delayMs = 0,
  slotOffset = 0,
}: {
  words: readonly string[];
  index: number;
  delayMs?: number;
  // Absolute column of this flapper's first slot within the whole role, so each
  // slot can offset the shared gradient's background-position to line up.
  slotOffset?: number;
}) {
  const reduced = useReducedMotion();

  // Fixed slot count = the longest word this flapper can show. Constant width.
  const slotCount = words.reduce((m, w) => Math.max(m, w.length), 0);
  const target = (words[index] ?? words[0]).toUpperCase();

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
    const glyph = RIFFLE_GLYPHS[(i * 7 + step * 3) % RIFFLE_GLYPHS.length];
    return { char: glyph, rolling: true };
  });

  return (
    <span className="flip-word" aria-hidden="true">
      {slots.map((slot, i) => (
        <span
          key={i}
          className={`flip-slot animate-gradient${slot.rolling ? ' flip-slot--rolling' : ''}`}
          style={{ '--slot-i': slotOffset + i } as CSSProperties}
        >
          {/* Non-breaking space keeps an empty slot's box. */}
          {slot.char === '' ? ' ' : slot.char}
        </span>
      ))}
    </span>
  );
}
