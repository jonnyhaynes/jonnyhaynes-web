# Career & credentials: replacing Skills

**Status:** Complete — on `main`'s working tree (not yet committed)
**Type:** `[ai-assisted]`
**Related:** `src/components/Career.tsx`, `src/content/career.ts`,
`src/lib/useInView.ts`, `src/lib/useHydrated.ts`, `src/index.css`,
`src/theme/copy.ts`, `src/pages/Home.tsx`, `docs/resume.md`

## What shipped

- **The Skills section is now Career & credentials.** Same slot on the page, new
  job: the section id moves `#skills` → `#career`, and the heading key is renamed
  in both palettes (`'Career & credentials'` / `'Mi work an learnin'`).
- **Data ported from `feature/map-interface`, data only.** `ROLES` (6 engineering
  roles, newest first, transcribed from `docs/resume.md`), `CREDENTIALS` (FAA
  mental-health award, ITC Outdoor First Aid with its verified link, HND) and
  `CAREER_LEAD`. The branch's horizontal traverse, baked elevation profile,
  waypoints, ruler and pin were deliberately **not** carried across.
- **Two arrangements, one DOM.** Each role is a list item holding its title button
  and its panel, so below `lg` it is an **accordion** — the detail opens in place
  under the title that was picked, nothing open on arrival. From `lg` the item's
  own box is dropped (`display: contents`) so those two children join a column
  grid: titles in the first column, the open panel spanning the second. The
  accordion markup *is* the two-column layout, so there is no duplicated content.
- **The selection survives the layout switch.** `open` is one piece of state both
  arrangements read, and reaching the desktop layout counts as opening the current
  role (adjusted during render, as `FlipWord` does). So narrowing the window, or
  rotating a tablet, keeps the reader where they were instead of collapsing the
  detail back into the list — and widening keeps it too. A phone still arrives with
  nothing open.
- **Each tab carries its own period** — `HMA Digital · 2017 — present`,
  `Ledgard Jepson · 2015 — 2017` — so the current role reads "present", not "now".
  Tab titles are cream at rest and accent when selected, which is also carried by
  a filled surface (never colour alone).
- **The detail pane says only what the tab doesn't.** It carries the place
  (`Barnsley`) and the bullets in `--color-muted`, the ink project cards use for
  copy. The role title and the period are **not** repeated — the control beside it
  already names the role and carries its dates.
- **The selected tab joins the panel** — flush edges, squared where they meet, no
  border between them — while the panel's left border still divides it from every
  tab that isn't selected.
- **Each role title is typed out**, one character at a time, staggered down the
  list, once, when the section first comes into view. The cursor sits at the
  insertion point as it writes and then stays at the end, flashing (the same
  `animate-pulse` underscore the "building …" line carries).
- **A full-bleed blurred band** (`backdrop-filter`) with top and bottom hairlines
  sets the section apart from the sections above and below it.
- **Credentials** below the columns: **2 across on a phone, 4 from the tablet tier
  up** (three qualifications + an awards count derived from `WORK_PROJECTS`), as
  boxed cells.
- **Deleted:** the GitHub language bar and its whole chain — `Skills.tsx`,
  `LanguageBar.tsx`, `content/skills.ts`, `content/languages.ts`.
- **Resume reconciled** so the CV and the site agree: downloads `1M+ → 2M+` and
  `Emergency First Aid — Level 3` → `ITC Level 3 Award in Outdoor First Aid`.
  `public/resume.pdf` rebuilt.

## Why the reveal is sliced, not clipped

The first implementation revealed the titles with an animated `clip-path` and a
`steps(var(--chars))` timing function. Both were wrong for this content:

- A `clip-path` reveals a **vertical line sweeping the whole box**, so a title that
  wraps to two lines has both lines revealed from the left at once — a wipe, not
  typing.
- `steps()` cannot be relied on to take a custom property, so the stepping could
  silently fall back to a smooth wipe.
- A cursor inside the clipped box cannot travel with the reveal.

The title is now **sliced**: the typed prefix renders as text, the cursor is an
inline box after it, and the remainder holds its space with `visibility: hidden`.
That types glyph by glyph, keeps the cursor at the insertion point (following the
text onto a second line) and never reflows. The pace (`TYPE_STEP` 75ms per
character, `TYPE_STAGGER` 220ms between titles) lives in the component.

## Accessibility

- A list of **disclosures**, not tabs: each control carries `aria-expanded` and
  `aria-controls`, which is what the markup actually is once the panel opens under
  its own title. Fully keyboard operable (Tab to a title, Enter/Space to toggle).
  Tabs were dropped as the ARIA shape because a tablist cannot hold the `li`
  wrappers, and because an accordion is honest at both widths while a tablist would
  have to become something else below `lg`.
- The typed title is **decorative** (`aria-hidden`), with the readable title as an
  `sr-only` copy beside it — the same split `FlipWord` uses — so the underscore
  cursor is never announced.
- Under `prefers-reduced-motion` the titles are simply present, the cursor static.
- All six role details are in the markup and visible by default; only the
  `data-enhanced` attribute (set once hydration runs) hides the inactive ones.

## Verification

- `npm run lint` and `npm run build` clean.
- **Widths** — 390, 768, 1000, 1440: no sideways scroll at any of them; one `<h1>`.
  Credentials resolve to `165px 165px` at 390, `171px ×4` at 768, `203px ×4` at
  1000 and 1440.
- **Accordion** — at 390 and 768 the open panel's top equals its title's bottom and
  its left equals the title's left, i.e. it opens in place under the right title.
- **Selection across the layout switch** — pick role 3 at 1440 then narrow to 390:
  panel 3 is still open, in place under its title. Pick role 2 at 390 then widen to
  1440: panel 2 is open, side by side. Arriving with no interaction shows 0 panels
  on a phone and 1 on desktop.
- **Sweep** — 320, 390, 768, 1024, 1280, 1440: nothing past the right edge, no
  control under 24px, and the section's scroll width equals the viewport at every
  one. The boundaries hold: 1023 is the accordion (in place), 1024 is the two
  columns; 767 is two credential cards across, 768 is four.
- **Desktop** — the first title's right edge meets the open panel's left edge
  (579 = 579) and the panel spans the list's height (536); one panel displayed.
- **Typing** — `Full Stack_` / `Senior _` / `_` sampled at 700ms, all titles
  complete with the cursor at the end at 5s; title heights unchanged (24/48/24)
  between the two, so nothing reflows.
- **Join** — the junction pixel is the border colour (`rgb(52,54,60)`) beside
  unselected tabs and the surface (`rgb(33,34,38)`) at the selected one.
- **Contrast** (all four palettes, AA): accent 4.76–5.94:1, muted 4.97–6.78:1,
  foreground 12.8–14.4:1.
- Toggling `data-enhanced` on the live DOM takes visible panels 1 → 6.

## Follow-ups (open)

- **Client-rendered, so no reachable no-JS page.** The "all six details visible"
  fallback can't be exercised in the shipped app (there is no prerender on `main`
  yet); it was verified by toggling `data-enhanced` on the live DOM instead.
- **No hover ink on a role title** — now that inactive titles sit at cream, the old
  grey→cream hover is dead and was removed. If a hover affordance is wanted, the
  obvious one is the title going accent, which the site's nav tiles already do.
