# Scroll-linked section titles in the panel

**Status:** proposed · revised after review
**Branch:** `feature/v3-two-pane-shell` (PR #681)

## Goal

Make the left panel earn its place as you read. Today it is a static portrait. It
should become a running indicator of where you are: as you scroll into a section,
that section's title scrolls up through the panel, holds while you're in that
section, then carries on out of the top as the next one arrives from below. The
section headings in the content column keep their icon and let their title go.

The panel is `lg` and up only, so **this is a desktop change**. Phones and tablets
keep their visible section titles and are untouched.

## The motion

**Positional, driven by the scroll. No fades, no cross-fade, no opacity anywhere.**

The panel is a window onto a **strip of slots**, one per state:

```
slot 0        the portrait      (before the first section)
slot 1        Projects
slot 2        Skills
...
slot 7        Get in touch
```

Each slot is the panel's full height, with its content centred. Only one is framed
at a time; the strip is translated behind the window and clipped by it. Scrolling
moves the strip, so:

- entering a section — its title rises from below, tracking the scroll;
- **while that section is current the strip does not move at all** — the title
  hangs, and this is the pause;
- leaving — the title carries on up and out as the next rises in.

The strip carries the **portrait as slot 0**, so the first transition is the
portrait sliding out and "Projects" sliding in — one continuous motion, which is
the "replaces my picture" half of the request, with no special case for it.

### The mapping

The hook already measures every section's top edge on each frame. From that, per
frame:

```
t        = clamp01(1 - (nextSectionTop - line) / RAMP)   // 0 far out, 1 at the line
progress = (sections above the line) + t                 // 0 .. 7, as a float
offset   = -progress * slotHeight                        // the strip's translateY
```

- **The pause falls out of the ramp, not out of a timer.** `t` is 0 for the whole
  body of a section and only rises in the `RAMP` px before the next section reaches
  the reading line, so the strip is genuinely still through the middle of every
  section.
- **RAMP is the knob** for how long the handover takes: `0.4 * viewportHeight` is a
  starting point. Linear within the ramp, so the motion stays attached to the
  scroll rather than lagging behind it — the ramp boundary is a kink, not an ease,
  and if it reads as a jerk the answer is a slightly longer ramp, not a curve.
- Since the offset is a pure function of the scroll, **the direction of travel is
  implicit**. No direction state, and nothing to get wrong when a scroll reverses
  mid-handover.

### Reduced motion

No scroll-linking. The panel shows only the current slot, changing at the section
boundaries — no strip, and therefore no movement — rather than a slowed-down
version of the same travel.

## Decisions

1. **The `<h2>` stays in the document.** The visible title is hidden with
   `lg:sr-only`, not removed: the text stays in the DOM, so the outline, the
   crawlers and the probe's heading checks are unaffected. The panel's copy is
   presentational and `aria-hidden`, so no section is announced twice.
2. **The panel's titles use the same type as the headings they came from**
   (`font-mono text-title`), so a title reads as having travelled from the content
   column into the panel rather than as a new element.
3. **The portrait stays in the strip** rather than being shown/hidden around it.
   One motion, one code path, and scrolling back to the top returns to it the same
   way.
4. **A context carries the scroll state to the panel.** `PanelShell` builds
   `ProfilePanel` outside `ShellFrame`, so props can't reach it without a second
   observer — the thing `ShellFrame`'s comment explicitly rules out.

## Critical files

**New**

- `src/lib/activeSectionContext.tsx` — holds `{ active, offset }`, provided by
  `ShellFrame`, read by the panel (and, as a tidy-up, the two navs).

**Changed**

- `src/lib/useActiveSection.ts` — return the strip **offset** alongside `active`,
  computed in the existing `measure` loop from rects it already reads. State is set
  from the rAF callback, never synchronously in the effect body, so the
  `react-hooks/set-state-in-effect` rule stays satisfied.
- `src/components/ShellFrame.tsx` — provide the context; the observer stays a single
  call site.
- `src/components/SectionRail.tsx`, `src/components/MobileBar.tsx` — read the
  context instead of `active`/`scrolled` props. Mechanical.
- `src/components/ProfilePanel.tsx` — the strip: one full-height slot per state,
  titles from `heading(palette, id)` (`src/theme/copy.ts`, already palette-keyed),
  title slots `aria-hidden`, translated by the offset, clipped by the panel.
- `src/components/SectionHeading.tsx` — the title span gains `lg:sr-only`. The icon,
  the `children` slot and the rule above are untouched.
- `src/index.css` — the strip and slot rules, the window's clipping, and the
  reduced-motion fallback, beside the existing shelf motion rules.

## Phases

1. **State plumbing.** Context + the offset on the hook + the navs off props. Build,
   lint and probe stay green; nothing visible changes.
2. **The headings.** `lg:sr-only` on the title span. Visible on desktop only.
3. **The strip.** The panel, the slots, the translate, the clip, the reduced-motion
   fallback.
4. **Verification and docs.**

## Verification

- **The probe covers the static half:** the `<h2>` text is still in the markup
  (`sr-only` is CSS-only), so `headings carry no //` and `heading levels never skip`
  keep passing. Add one check that the panel's title slots are `aria-hidden`.
- **The motion needs eyes**, and a browser. I have neither, and the section is
  data-gated, so everything below is unverified until it's looked at: that the strip
  is *still* through the middle of a section and not creeping; that the handover
  spans the ramp and reads as attached to the scroll; the portrait-to-Projects
  transition; a scroll reversal mid-handover; the Yorkshire titles with the rose
  lit; and the reduced-motion fallback.
- Confirm at `lg` and below that section titles are hidden only at `lg`.
- The plan doc gets an "Additions beyond this plan" entry, as the V3 doc does.

## Risks

- **A title is long for the column.** "Life beyond the keyboard" at `text-title` is
  ~24 characters; the panel is 369–490px, which fits roughly 15–19 mono characters
  per line. Two or three lines, so the slot needs a measure and must not overflow.
- **Writing a transform every frame** is the one performance-sensitive part. It's a
  CSS custom property on one element inside the existing rAF pass, alongside the
  measurement already happening, but it should be checked on a low-end machine.
- **The heading row becomes icon-only at `lg`.** That's the intent, but it's a large
  visual change to all seven sections and wants looking at before it's trusted.
