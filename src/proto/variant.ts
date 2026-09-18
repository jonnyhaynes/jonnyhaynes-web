import type { BackgroundMode } from '../lib/traverse';

/**
 * PROTOTYPE ONLY. The approved configuration.
 *
 * Step 1 (background + chrome) is settled, so these are no longer treated as
 * options — they're the decision, recorded in one place with the reasoning, and
 * the control panel no longer offers switches for them.
 *
 * When this is promoted into the shipped components, this file is what the
 * values should be read from: if a later change contradicts one of them, the
 * contradiction should be stated here rather than quietly diverging.
 */
export type Variant = {
  mode: BackgroundMode;
  reticle: boolean;
  reverse: boolean;
  readout: 'strip' | 'rail' | 'none';
  progress: 'both' | 'strip' | 'rail' | 'none';
  reduce: boolean;
};

export const DEFAULT_VARIANT: Variant = {
  /** Traverse: the offset is a pure function of scroll, so the reference in the
   *  strip names the ground the middle of the screen is actually showing. */
  mode: 'pan',
  /** On: it reads the elevation under the pointer from the same sampler the
   *  glyphs are drawn from, so the number can't disagree with the terrain. */
  reticle: true,
  /** Off: the route runs east → west, from the city edge up onto the Peak, so
   *  the page rises as you scroll. */
  reverse: false,
  /** A full-width strip, because the reference is worth watching tick over and
   *  a readout that scrolls away can't be watched. */
  readout: 'strip',
  /** Strip edge only. The rail keeps its active-marker dot as the "you are here"
   *  cue, so a traverse line there would be a second answer to the same
   *  question. */
  progress: 'strip',
  /** Simulated from the panel; the real OS setting also applies. */
  reduce: false,
};
