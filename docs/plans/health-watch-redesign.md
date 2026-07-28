# Redesign the Health section as a fitness-watch face

**Status:** Planned — awaiting human approval before code (plan-first per
`docs/dev-workflow.md`).

**Goal:** Replace the Health section's four flat bordered stat tiles
(`// Life beyond the keyboard`) with a single tactile object — a **fitness-tracker
watch** — bringing it into line with the page's other personality sections
(Gaming's CRT TV, Reading's leaning bookshelf, Listening's deck), each of which
dresses its data in a physical metaphor. The Health section is currently the odd
one out: generic cards that read like a default dashboard.

No change to the data layer, the bake job, or `health.json`. This is a
presentation-only swap of `src/components/Health.tsx`.

## Why (design rationale)

Every other Home section is a hero object. Health isn't. This makes it look
unfinished next to its neighbours. A watch is the most on-brand metaphor because
the data literally comes from a wearable. Explored via a series of mockups with
Jonny; the watch direction (and specifically the "everything on the face"
variant) was chosen over an activity-rings dial and a retro-LCD pedometer.

## Decisions locked in (with Jonny)

- **Object:** a large, centred fitness watch — the whole section, no side panel.
  Breaks the strict 50/50 hero-left rhythm deliberately (it's a statement piece).
- **Face:** a **squircle** (rounded-rect) echoing the case shape — not a circle.
- **Centre:** three concentric **activity rings** + a **pulsing heart** in the
  ring hole with the resting-HR number **knocked out** of the heart shape (mask
  cut-out, not text on top). No "bpm/rest" label.
- **Rings (outer→inner):** steps (accent-start `#a877bf`), active minutes
  (accent-mid `#c79ad6`), sleep (accent-end `#7a4988`).
- **Ring goals (hardcoded constants):** **10,000 steps / 60 active min / 8 hrs
  sleep.** A full ring = goal met; fill = `min(1, value / goal)`. Goals live as
  named constants in the component with a comment explaining they're personal
  targets, not from the API.
- **Complications (icon + value, no word labels), one per face corner:**
  - **top-left** — steps (two-footprints glyph)
  - **top-right** — active minutes (bolt glyph), unit `m`
  - **bottom-left** — sleep (moon glyph), unit `h`
  - **bottom-right** — "Synced HH:MM" tag with a small live dot (from
    `fetchedAt`)
  Each complication is colour-keyed to its ring.
- **Motion:**
  - Heart **pulses at the true resting rate** — CSS animation period = `60 / bpm`
    seconds, set via a CSS custom property from `restingHeartRate` (72 bpm →
    0.83 s/beat). Keyframe is a cardiac shape: quick systole contraction, slower
    diastole recovery.
  - Rings **sweep** from empty to their fill on load; numbers **count up**.
  - **All motion disabled under `prefers-reduced-motion`** — reuse the existing
    `useReducedMotion()` hook pattern from `src/components/FlipWord.tsx` (don't
    hand-roll a `matchMedia` listener). Reduced-motion renders final values with
    no animation.
- **Accessibility:** icons are `aria-hidden`; each complication carries a text
  `aria-label` (e.g. "Steps 8,432", "Active 47 minutes", "Sleep 7.3 hours"). The
  heart SVG has `role="img"` + `aria-label="Resting heart rate 72 bpm"`. Keep
  `focus-visible` outlines on any links (there are none here currently).

## Graceful degradation (load-bearing principle)

`health.json` is currently **all-null** (no successful bake yet), and each field
is independently nullable. The redesign must handle this — the current component
doesn't render the "rest-day fallback" its own data-layer comment promises.

- **All four null / data is `null`:** render a **rest-day state** — empty (unfilled)
  rings, no pulsing heart, and a short line ("Rest day — the watch is off the
  charger…"). The section must never render blank or broken.
- **Some fields null:** show a muted em-dash (—) for that complication / omit its
  ring fill; the rest render normally. No metric ever shows "0" for missing data.
- The whole section still returns `null` (renders nothing) only if
  `useHealthData()` itself returns `null` (fetch failed) — matching current
  behaviour and the Gaming/Reading pattern.

## Scope / non-goals

- **No data changes.** Same `HealthData` shape, same `useHealthData()` hook, same
  `health.json`, same bake job. Do **not** add new Google Health metrics here
  (distance/floors/etc. are tracked separately in memory, out of scope).
- **No new styling framework.** Tailwind utilities + a small amount of custom CSS
  in `src/index.css` for the watch (following the `.crt-*` / `.tv-cabinet` /
  `.bookshelf` precedent — a named block of section-specific CSS). Reuse existing
  tokens: `--color-accent-*`, the deck/plastic surface tokens, the LCD screen
  tokens where a dark screen field is wanted.
- **Icons:** inline SVG (no new icon dependency). If the project already has an
  icon convention, match it; otherwise these are self-contained paths.

## Implementation sketch

`src/components/Health.tsx` — rewrite the presentation, keep the hook usage:

1. `const data = useHealthData();` — unchanged. `const reduced = useReducedMotion();`
2. Derive `syncedAt` from `data.fetchedAt` (format `HH:MM`, local).
3. Compute ring fills against the hardcoded `GOALS`.
4. Render:
   - section wrapper + `// Life beyond the keyboard` heading + lede (unchanged copy).
   - the watch: straps, case, squircle face.
   - face contents: rings SVG (centred), heart SVG (masked number, `--beat` var),
     four corner complications.
5. Rest-day / null handling as above.
6. Section-specific CSS block in `src/index.css` for the watch chrome + the
   `@keyframes beat` and ring-sweep, each gated behind
   `@media (prefers-reduced-motion: reduce)`.

## Verification

- `npm run build` (tsc + vite build — type-check clean, no `any`).
- `npm run lint` clean.
- Manual: real data renders; toggle OS reduced-motion → no animation, final
  values shown; temporarily point at an all-null fixture → rest-day state;
  check light + dark themes; check mobile (watch scales down, corners don't
  collide); keyboard focus + screen-reader labels read sensibly.

## Reviewer decisions (resolved)

- **Sparse rings on a low-activity day are fine** (Jonny) — a nearly-empty steps
  ring on a genuine rest day is honest and stays; no floor/minimum fill.
- **Mobile ring/complication spacing:** to be handled during the build — at small
  breakpoints, shrink the rings slightly (and/or tighten the face) so the corner
  complications don't collide with the enlarged dial. Not a blocker.

## Process

Per `CLAUDE.md`: this is AI-assisted work. When implemented, the PR is prefixed
`[ai-assisted]`, references this plan, ends with a `Manually reviewed by <name>`
line, keeps the `Co-Authored-By` trailer, and is **merged by a human** once CI is
green. One GitHub issue = this unit of work; branch off `main`; `Closes #NN`.
