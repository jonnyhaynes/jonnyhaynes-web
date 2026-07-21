# Plan: Now Playing player — make it feel light in light theme

## Context

The Now Playing "deck" (`src/components/NowPlaying.tsx` + `.deck-*` rules in
`src/index.css`) was designed dark-first. In light theme it reads wrong: the
whole player still looks dark. Two distinct problems, confirmed by screenshotting
the deck in both themes with mocked playing data:

1. **The LCD screen is hard-pinned dark in both themes.** `.deck-lcd` uses fixed
   `oklch(0.16 … )→oklch(0.11 … )` for the screen base, so the big square hero
   stays near-black on the pale panel. This was a deliberate hi-fi conceit, but
   the owner wants the player to feel light in light mode — so we revisit it.
2. **The switcher chrome assumes a dark surface.** In `NowPlaying.tsx` the
   controls use hardcoded `bg-black/20` (switcher track), `bg-black/55` (album-art
   scrim) and `hover:bg-white/5` (inactive button hover). On the light brushed-
   metal panel `bg-black/20` renders as a muddy dark-grey band; `hover:bg-white/5`
   is invisible on a light surface.

Prior related work: **#105** introduced `--color-lcd-accent` (pinned to the
dark-mode heather `#a877bf`) so the LCD readout kept AA contrast *against the dark
screen*. If the screen goes light, that pin inverts the problem — light heather on
a light screen fails AA. This plan supersedes the "fixed-dark screen" decision from
[`now-playing-visualizers.md`](./now-playing-visualizers.md) and re-tunes #105.

## Goal

In **light** theme the player reads as a light device: pale screen, legible
accent visualizer, clean switcher chrome. **Dark** theme is unchanged. Both keep
WCAG AA on text, and reduced-motion behaviour is untouched.

## Constraints (from CLAUDE.md)

- **No new styling framework.** Plain CSS custom properties + `@layer` in
  `src/index.css`, Tailwind utilities in the component. Match existing `.deck-*`
  conventions (`color-mix`, token-driven).
- **Graceful degradation.** Idle "enjoying the silence" card and no-art path must
  still render.
- **Accessibility & reduced motion.** Keep `aria-*`, the `aria-live` announcement,
  progressbar semantics, and `prefers-reduced-motion` frames. Verify AA on: LCD
  readout text, switcher labels/icons, "Now playing" header.

## Approach — invert the screen like the rest of the site

The whole site themes by **flipping the same tokens** between dark and light:
`--color-background` `#1a1b1e ↔ #f4f3f0`, `--color-foreground` `#e8ddcb ↔ #202225`,
`--color-accent-*` light-heather ↔ dark-heather. Foreground/background swap.

The LCD screen is the one surface that *broke* this convention by hard-pinning a
dark colour in both themes (and #105 then had to pin the readout accent to match
the frozen-dark screen). The fix is not a bespoke screen palette — it's to make
the screen **invert with the theme like everything else**: dark screen in dark
mode, light screen in light mode, and let the readout accent flip alongside it.
No new palette decision to make; it mirrors the tokens already in use.

### 1. Tokenise the LCD screen so it flips (`src/index.css`)

Introduce screen tokens on `:root` (dark) and their inverse under
`[data-theme='light']`. The dark values are today's hardcoded screen; the light
values are the *opposite* end — a light screen keyed off the same lightness the
page background already uses:

```
:root {
  --color-lcd-screen-top: oklch(0.16 0.02 300);   /* today's dark screen */
  --color-lcd-screen-bottom: oklch(0.11 0.02 300);
  --color-lcd-scanline: color-mix(in oklch, black 25%, transparent);
}
[data-theme='light'] {
  /* the opposite: a light screen, mirroring the dark values' lightness */
  --color-lcd-screen-top: oklch(0.95 0.01 300);
  --color-lcd-screen-bottom: oklch(0.90 0.015 300);
  --color-lcd-scanline: color-mix(in oklch, black 8%, transparent);  /* faint */
}
```

Rewrite `.deck-lcd` `background` + inset shadows to use these tokens (a lighter
inset shadow in light mode so it still reads recessed, not like a hole).

### 2. Let the LCD readout accent flip — retires #105's special case

`--color-lcd-accent` was pinned to the dark-mode heather *only because* the screen
was frozen dark. Once the screen inverts with the theme, that pin is no longer
needed — point the readout back at `--color-accent-start` (which already flips
light-heather ↔ dark-heather), and flip the `.deck-lcd-text` `color-mix` to mix
toward the *screen*'s opposite: toward white on the dark screen (today), toward
black on the light screen. Because screen and text invert **together**, contrast
is preserved by symmetry — but still **verify both resolve ≥ 4.5:1** against
their screen base rather than assuming it.

### 3. Theme-drive the switcher + scrim chrome (`NowPlaying.tsx`)

Replace hardcoded dark-assuming utilities with token-driven surfaces so they
adapt. Add small utilities/vars for a "recessed control" fill and hover that are
dark-on-dark and light-on-light:

- Switcher track `bg-black/20` → a `--color-control-recess` surface
  (`color-mix(--color-foreground 8%, transparent)` reads as a subtle inset in
  both themes).
- Inactive hover `hover:bg-white/5` → `hover:bg-[color-mix(...foreground...)]`
  (foreground-based, so visible on light too).
- Active pill `bg-accent-start/20 text-accent-start` — already token-driven;
  confirm the light accent (`#8b52a1`) on the recess reads clearly.
- Album-art scrim `bg-black/55`: the art sits *inside the LCD screen*. On a light
  screen a black 55% scrim is wrong — make the scrim theme-aware (dark scrim on
  dark screen; a lighter/white-ish scrim on light screen) so the accent
  visualizer stays legible over any cover in both themes.

Prefer expressing these as CSS custom properties in `index.css` and referencing
them, over long arbitrary-value Tailwind classes, to match house style.

### 4. Border / panel touch-ups

Check `border-muted/20`, `border-muted/25` and the power-LED bloom read correctly
on the lighter panel; nudge only if visibly off.

## Verification

- **Screenshot both themes** with mocked playing data (puppeteer against the dev
  server, intercepting `/api/now-playing`) — the method used to diagnose this.
  Capture: playing, idle ("silence") card, and no-album-art. Eyeball light reads
  as a light device and dark is unchanged.
- **Run all three visualizers** (spectrum/scope/plasma) in light — confirm bars/
  wave/plasma stay legible on the pale screen.
- **Contrast checks (AA ≥ 4.5:1):** LCD readout text vs screen base, switcher
  labels, header, both themes.
- **Reduced motion:** static frames + still marquee still correct.
- `npm run build` (tsc + vite) and `npm run lint` green.

## Out of scope

- Changing the visualizer algorithms or the honest-non-audio principle.
- Restyling the idle "silence" card beyond token correctness.
- Any dark-theme visual change (must be pixel-stable).

## Rollout

Branch off `main`, `[ai-assisted]` PR referencing this plan, `Closes #111`, human
review against before/after screenshots, human merges. Tracking issue: #111.
```
```
