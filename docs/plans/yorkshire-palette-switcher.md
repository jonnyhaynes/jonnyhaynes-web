# Yorkshire palette switcher

**Status:** Draft — awaiting human approval
**Branch:** `yorkshire-palette-switcher` (off `main`)

## Goal

Add a Yorkshire (blue + yellow) flavour to the site, alongside the existing
light/dark toggle, plus a way to switch it on. When Yorkshire is active, nudge a
handful of copy strings into broader Yorkshire dialect.

## Decisions (locked with Jonny)

1. **Two independent axes.** Keep `data-theme` (`light`/`dark`). Add a new,
   independent `data-palette` (`default`/`yorkshire`). Four valid combos —
   Yorkshire has its own light *and* dark form.
2. **Blue primary, yellow highlight.** Yorkshire "Broad Acres" blue is the main
   accent (`--color-accent-start`, links, buttons, rings); yellow/gold is the
   secondary highlight/hover (`--color-accent-end` and hover states). Mirrors the
   flag: blue field, gold(ish) rose.
3. **Copy shifts only when Yorkshire is active.** Default palette keeps today's
   copy verbatim. A small set of theme-gated strings swap in when
   `palette === 'yorkshire'`.

## Why this shape

The whole site already recolours from ~5 `@theme` tokens
(`--color-background/foreground/muted/accent-start/accent-end`). 47 component
usages reference them as Tailwind utilities (`text-accent-start`, `bg-accent-end`,
etc.). So a palette is **just another CSS block that overrides those tokens** —
scoped by attribute, zero component churn for the colour work.

The device tokens (`--color-lcd-*`, `--color-watch-*`, `--color-deck-*`, book
shadows) key off the same accent/foreground tokens or are neutral greys, so they
mostly follow for free. We audit them, not rewrite them.

## Token model

Precedence (most specific wins), all on `<html>`:

```
:root                          → dark default (unchanged)
[data-theme='light']           → light default (unchanged)
[data-palette='yorkshire']     → Yorkshire dark  (overrides accents on the dark base)
[data-theme='light'][data-palette='yorkshire']  → Yorkshire light
```

Because `[data-theme='light']` and `[data-palette='yorkshire']` are equal
specificity (one attribute each), source order matters: the Yorkshire blocks
**must come after** the light block so Yorkshire wins where they set the same
token. The combined `[data-theme='light'][data-palette='yorkshire']` selector
(two attributes) outranks both and pins Yorkshire-light exactly.

### Proposed colours (WCAG AA verified in step 5, values may nudge)

Yorkshire **dark** (`[data-palette='yorkshire']`):
- `--color-accent-start` (blue, primary): ~`#5b9dd6` (lightened Yorkshire blue to
  clear 4.5:1 on `#1a1b1e` and as dark-text button bg)
- `--color-accent-end` (gold, highlight): ~`#f2c14e`
- background/foreground/muted: **inherit** the existing dark tokens (blue/gold
  read well on Sheffield steel). Revisit only if contrast fails.

Yorkshire **light** (`[data-theme='light'][data-palette='yorkshire']`):
- `--color-accent-start` (blue): ~`#1f6fb2` (darkened to clear 4.5:1 on chalk)
- `--color-accent-end` (gold): ~`#b8860b`-ish darkened gold for text/hover on chalk
- background/foreground/muted: inherit light defaults.

Device tokens: default to inheriting. Audit the LCD readout, watch rings, and the
"View My Work" button explicitly since they lean on accent colour.

## Implementation steps

1. **State: add the palette axis** (`src/theme/context.ts`, `ThemeContext.tsx`)
   - `type Palette = 'default' | 'yorkshire'`.
   - Extend `ThemeContextValue`: `palette`, `togglePalette` (or `setPalette`).
   - New `localStorage` key `palette`; same "persist only on explicit choice"
     discipline as `theme`. First visit → `default`.
   - Reflect onto `document.documentElement` `data-palette` in the same effect.
   - Keep `toggleTitle` logic; add Yorkshire-flavoured tooltip variants (step 6).

2. **Pre-paint** (`index.html`): read `palette` from localStorage and set
   `data-palette` before first paint, mirroring the existing theme IIFE. Falls
   back to `default` on any error. Prevents a flash of the wrong accent.

3. **CSS tokens** (`src/index.css`): add the two Yorkshire override blocks after
   the existing light block, per the token model above. Comment the
   source-order/specificity rule so a future edit doesn't reorder them.

4. **The switcher UI** (`src/theme/PaletteToggle.tsx`): a second control next to
   `ThemeToggle`. **A single Yorkshire-rose button that fills** — not a segmented
   pill, not flags (rejected: St George's red appears nowhere on the site and
   reads as a language picker).
   - Reuse the existing `YorkshireRose` component. It's already a *filled*
     heraldic rose whose ink is `currentColor` and whose petals show the page
     background through — so we drive both states with **colour + opacity**, not a
     second outline SVG:
     - **Off (default palette):** muted `currentColor` at reduced opacity — a
       faint "ghost" rose. Says "there's a rose here you can light up."
     - **On (yorkshire):** full opacity, ink = `--color-accent-start` (Yorkshire
       blue). The gold (`--color-accent-end`) comes in on hover/focus (ring +
       glyph tint), honouring the blue-primary / gold-highlight split. Because the
       accent tokens themselves flip with `data-theme`, the lit rose is the right
       blue in both light and dark automatically.
   - Match `ThemeToggle`'s conventions exactly: circular pill, `backdrop-blur`,
     `focus-visible` accent outline, `motion-reduce:transition-none`. The words
     live in the tooltip / `aria-label` (the reveal-on-hover label pattern
     `ThemeToggle` already uses), e.g. off → **"Make it Yorkshire"**, on →
     **"Proper Yorkshire, this"**. `aria-pressed` reflects the on/off state so
     it's announced as a toggle button, not a plain button.
   - Rendered in `Home.tsx` header (next to `ThemeToggle`) and on `Privacy.tsx`.

5. **Contrast + device audit**: with each of the 4 combos, verify AA (4.5:1) for
   body text, muted text, links, and the "View My Work" button; eyeball the LCD
   readout, watch face rings/heart, deck panel labels. Nudge the four accent hexes
   until they pass. This is the step most likely to change the proposed values.

6. **Yorkshire copy (theme-gated)** — only render when `palette === 'yorkshire'`.
   All section headings share one `// lower-case` mono style, so the swaps stay in
   that exact format (same casing, same `// ` prefix) — only the words change.
   Default palette copy is byte-identical to today.

   Proposed swaps (I drafted these; Jonny approves in the PR — easy to redline):

   | Section  | Default (today)          | Yorkshire                       |
   |----------|--------------------------|---------------------------------|
   | Projects | `// Projects`            | `// Summat I’ve made`           |
   | Skills   | `// Skills`              | `// What I’m any good at`       |
   | Listening| `// On the digital turntable` | `// Ont digital turntable` |
   | Reading  | `// My bookshelf`        | `// Mi bookshelf`               |
   | Gaming   | `// What I’m playing`    | `// What I’m playin’`           |
   | Health   | `// Life beyond the keyboard` | `// Life beyont keyboard`  |
   | Contact  | `// Get in touch`        | `// Gi’ us a shout`             |

   Plus the two toggle tooltips (already Yorkshire): the palette button reads
   **"Make it Yorkshire"** / **"Proper Yorkshire, this"**.

   Deliberately restrained: definite-article reduction ("ont/mi/mont"), a couple
   of lexical swaps ("summat", "gi' us a shout"), dropped g's. No phonetic
   respelling of everything — it stays readable and doesn't tip into parody. The
   Hero headline, prose, and data labels stay in standard English (dialect in
   body copy would hurt readability and screen-reader output).

   **Mechanism:** a tiny `copy` map keyed on `palette` (e.g.
   `src/theme/copy.ts` exporting `headings[palette].projects`), consumed via
   `useTheme().palette` in each section. Keeps strings in one reviewable place
   rather than scattering `palette === 'yorkshire' ? … : …` ternaries across
   seven components. No i18n framework.

## Out of scope / non-goals

- No new styling framework (Tailwind + `@theme` tokens only).
- No animation/background rework — Yorkshire is a recolour + copy, not a new
  section metaphor.
- Not touching the data-baking jobs, secrets, or any component logic beyond
  reading `palette`.

## Risks

- **Source-order fragility** in the CSS (documented inline).
- **Contrast**: Yorkshire blue/gold on chalk is the tight case — step 5 gates it.
- **`theme-color` meta**: currently pinned to `#1a1b1e`; leave as-is (it's the
  dark bg, palette-agnostic) unless review wants it to track Yorkshire.

## Verification

- `npm run build` (tsc + vite) and `npm run lint` green.
- Manual: cycle all 4 combos, reload to confirm persistence + no flash, keyboard
  focus on both controls, `prefers-reduced-motion` honoured.
- Confirm default palette + default copy are byte-identical to today.

## PR

`[ai-assisted]`, references this plan, `Manually reviewed by <name>`, human merges.
