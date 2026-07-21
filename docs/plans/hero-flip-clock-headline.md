# Hero headline: mechanical split-flap (flip-clock) role switcher

## Goal

Turn the static hero headline role into a mechanical **split-flap board** of two
independent flappers side by side, each cycling its **own** word list:

- **Word 1**: Full-Stack → Front-End → Software (3 states)
- **Word 2**: Developer → Engineer (2 states)

Each flapper advances through its list independently (like a real split-flap
column), so combinations vary over time — "Full-Stack Developer", "Front-End
Engineer", "Software Developer", "Software Engineer", etc. All six combinations
read as valid roles. Keeps the existing animated-gradient text treatment, the
site's palette/tokens, and is **fully accessible** (screen-reader-friendly,
reduced-motion safe, no layout shift, respects focus).

Decisions already taken (owner): drop the "AI First" variant (AI focus stays in
the subheadline); flip **per word**; each flapper cycles its own independent
list (word 1 has 3 states, word 2 has 2).

## Current state

- `src/content/site.ts` — `hero.headline: 'Full-Stack Developer'` (single string).
- `src/components/Hero.tsx` — renders `I’m a <span class="animate-gradient">{headline}</span>`.
- `src/index.css` — Tailwind v4 (`@import 'tailwindcss'` + `@theme`), OKLCH accent
  tokens `--color-accent-start/-end`, a `gradient-drift` keyframe on
  `.animate-gradient`, and a consistent `@media (prefers-reduced-motion: reduce)`
  discipline (every animation has a reduce branch). This is the pattern to match.

## Design

### Data (`src/content/site.ts`)

Replace the single `headline` string with two independent word lists — one per
flapper:

```ts
hero: {
  microcopy: '// Ey up. I’m Jonny.',
  // Split-flap role board: two flappers, each cycling its own list
  // independently. Lead-in is always "I’m a " (every word-1 value is
  // consonant-led, so "a" is always correct).
  roleWords: [
    ['Full-Stack', 'Front-End', 'Software'],
    ['Developer', 'Engineer'],
  ] as const,
  subheadline:
    'Building React, React Native and TypeScript products — with AI woven through the workflow.',
},
```

Keep a `headline` alias? No — grep confirms `hero.headline` is only used in
`Hero.tsx`. Clean replacement.

Note: all combinations must read as valid roles. Confirmed for the six here.
The lead-in stays "I'm a" because every word-1 value starts with a consonant
sound; if a vowel-led word is ever added, the lead-in logic needs an a/an rule.

### Component: `FlipWord` (new, `src/components/FlipWord.tsx`)

A single split-flap flapper for one word position. Props:
`{ words: readonly string[]; index: number }` (index = which word in `words` is
currently shown; the parent owns each flapper's index). Because the two lists
have different lengths and advance independently, the flappers are **not** in
lockstep — each ticks its own index modulo its own list length.

Structure per real split-flap boards, but simplified to a **two-panel card
flip** (top half folds down) — enough to read as mechanical without simulating a
full multi-flap letter board (that would be heavy and kitsch; the CRT/knob work
in this repo favours "subtle mechanical", not literal). Approach:

- A relatively-positioned inline-block sized to the **widest** word it will ever
  show, so nothing reflows as words change (measure via rendering all words
  stacked `invisible`/`aria-hidden` in the same box; the visible flap is
  absolutely positioned over them). This kills layout shift — load-bearing for
  a headline.
- On `index` change: render the outgoing word on a panel that rotates
  `rotateX(0 → -90deg)` about its bottom edge (the "flap falls"), while the
  incoming word is revealed underneath. `transform-style: preserve-3d`,
  `backface-visibility: hidden`, `perspective` on the parent.
- The gradient text treatment (`.animate-gradient`) applies to the visible word.

All animation via CSS classes in `index.css` (matches repo convention — no
inline keyframes, no animation libs; none are in `package.json`).

### Cycle controller (in `Hero.tsx`)

- Two `useState` indices (one per flapper) + `useEffect` with `setInterval`
  (~3s hold), cleared on unmount. Each tick advances **both** indices, each
  modulo its own list length (`(i + 1) % words.length`), so word 1 walks a
  3-cycle and word 2 a 2-cycle. Staggering the two flaps by a short delay (word
  2 flips ~150ms after word 1) reads more like a mechanical board than a
  simultaneous snap — optional polish. Pattern mirrors existing `useState` usage
  in `NowPlaying.tsx`; no new deps.
- **Gated on reduced motion**: read `window.matchMedia('(prefers-reduced-motion:
  reduce)')` (same API already used in `ThemeContext.tsx`). If reduced motion is
  on, the interval never starts and the board renders the first state statically
  (no flip). Also subscribe to changes so toggling the OS setting live behaves.
- Pause the cycle when the tab is hidden (`document.visibilitychange`) — cheap,
  avoids flipping offscreen. Optional-but-tidy.

## Accessibility (must-haves)

1. **One stable accessible name.** The flappers are decorative motion. Wrap the
   whole role in a container that exposes a single readable label and hide the
   moving panels from AT:
   - Visible flap panels: `aria-hidden="true"`.
   - A visually-hidden (`sr-only`) `<span>` holds the *current* role text,
     composed from both flapper indices (`words1[i1] + ' ' + words2[i2]`), so the
     heading always reads as a coherent sentence: "I'm a Software Engineer".
     Update it in sync with the indices.
   - The `<h1>` remains a single heading; no ARIA live region (the cycling text
     must **not** announce repeatedly — that would spam screen readers). It's an
     ambient visual flourish, not a status.
2. **Reduced motion** → no flipping at all; static first role. Add the
   `@media (prefers-reduced-motion: reduce)` branch disabling the flip animation,
   consistent with every other animation in `index.css`.
3. **No layout shift / CLS**: fixed-width flappers (measured to widest word).
   Verify the heading box height is constant across states.
4. **Contrast**: reuse `.animate-gradient` (already tuned to WCAG AA per the
   comments at `index.css:185`); the flap card background stays transparent so
   there's no new bg/text pairing to check. Confirm the mid-flip panel edge
   doesn't drop contrast below AA (it's brief + the resting state is compliant).
5. **Focus / keyboard**: purely presentational — not focusable, no interaction,
   so nothing to trap. Existing focus-visible styles untouched.

## Files touched

- `src/content/site.ts` — `headline` → `roleWords` (two independent lists).
- `src/components/Hero.tsx` — cycle controller + reduced-motion/visibility gating,
  render two `FlipWord`s + `sr-only` current-role span.
- `src/components/FlipWord.tsx` — **new** split-flap flapper.
- `src/index.css` — `flip-*` keyframes + classes + reduced-motion branch, placed
  near `gradient-drift` and following the same commenting style.

## Out of scope

- No third "AI First" state (dropped by decision).
- No split-flap *per letter* (heavier; not the house style).
- No animation library, no new styling framework (CLAUDE.md load-bearing rule).

## Verification

- `npm run build` (tsc + vite) and `npm run lint` green.
- Manual (`npm run dev`): board cycles ~every 3s; word 1 walks its 3-item list,
  word 2 its 2-item list, combinations vary; no horizontal jump/reflow as words
  change (each flapper is fixed at its widest word's width).
- Toggle OS "Reduce Motion" → headline is static, reads first role, no flip.
- VoiceOver/screen-reader pass: heading reads once as "I'm a Full-Stack
  Developer" (or current role), does not re-announce on each flip.
- Light + dark theme: gradient + any flap edge stay legible.

## PR / process

Plan-first (this doc). `[ai-assisted]` PR referencing this plan, `Co-Authored-By`
trailer, `Manually reviewed by <name>` line. Human reviews & merges; Claude gets
CI green only. Branch off `main`.
