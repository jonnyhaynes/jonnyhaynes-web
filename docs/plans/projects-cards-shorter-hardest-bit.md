# Projects: revert terminal → shorter cards with a typewriter "hardest bit"

## Why

The interactive terminal shipped in #510 (`projects-terminal-cards.md`) didn't
land as intended as the Projects section's primary UI. This reverts to the
familiar three-across `ProjectCard` grid, then shrinks the cards and refreshes
their detail treatment while keeping every piece of information.

The terminal plan doc is kept for the record; this doc supersedes it as the
current state of the Projects section.

## What changed

1. **Back to the grid.** `Projects.tsx` renders the `ProjectCard` grid again
   (`sm:grid-cols-2 lg:grid-cols-3`). Kept the terminal PR's data decision: six
   repos, alphabetical (`featuredProjects` default of 6). Removed the terminal
   components (`projects-terminal/`), the `--term-*` CSS tokens, and the
   `copy().projects` intro strings.

2. **Shorter cards.** Padding/margins compressed (`p-6` → `p-5`, tighter gaps).

3. **"Hardest bit" as a terminal-style disclosure (`HardestBit.tsx`).**
   Collapsed, the block shows only the label + a `$ cat hardest-bit` prompt with
   a calm blinking caret. Pressing it "types" the full note out character by
   character; `$ clear` collapses it again. This keeps the grid short without
   dropping any content.

4. **Fork icon.** Forked repos show a fork glyph before the card title (was a
   text chip).

5. **Data fix.** Re-baked `public/data/github.json` via the GraphQL path. The
   terminal PR had committed a REST-fallback bake, which stores only the primary
   language (one stack chip) and no last-commit; GraphQL restores full
   multi-language lists, `lastCommit`, and `isFork`.

## Accessibility (load-bearing principle)

- **Honest disclosure.** `HardestBit` is a real disclosure widget: a native
  `<button>` with `aria-expanded` + `aria-controls`, and a region that is
  genuinely `hidden` when collapsed — so a screen reader isn't already reading
  text the button claims to reveal.
- When open, the region carries the **complete** note as an `sr-only` copy (read
  by AT immediately, never waiting on the animation) plus an `aria-hidden`
  visual-only typewriter layer for sighted users.
- `prefers-reduced-motion`: instant reveal, no per-character timer, no blinking
  caret (reuses `lib/useReducedMotion`).
- The fork icon is decorative (`aria-hidden`) with an `sr-only` "Forked
  repository:" prefix. Repo/Live links carry per-project accessible names.

## Verification

- `npm run build` (tsc + vite) and `npm run lint` clean.
- Manually reviewed against a live screen reader is still owed if higher
  assurance is wanted; semantics reviewed against the disclosure-widget spec.
