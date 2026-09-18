# Redesign V4 — the map becomes the interface

> **Status on this branch — checkpoint.** Phase 0 resolved in favour of the full
> traverse, and the background, chrome, hero and Projects are built. Everything
> below is still the live plan; where this branch diverged from it, the divergence
> is recorded here rather than left to be discovered:
>
> - **Readout: a full-width strip, not the top of the rail** (§5.1). A 3.75rem
>   column can't hold a readable coordinate, and a readout that scrolls away can't
>   be watched ticking over.
> - **Progress: the strip's own bottom edge only.** §5.4's rail traverse line is
>   not built. The rail keeps its active-marker dot, and a route line there would
>   be a second answer to the same question.
> - **The rail now has a surface** (not in the plan). Full-bleed sections travel
>   underneath it, so without a background the cards showed through the nav icons.
> - **The stats are gone.** §9's Projects pass proposed a figures column; the band
>   that replaced it has been deleted. Of its four figures only the awards count
>   was evidence rather than telemetry, and the project count argued with the six
>   cards directly above it.
> - **Section titles carry no icons.** This deliberately reverses a v3 review
>   decision that added them so a heading and its rail entry read as one thing.
> - **The shell's panel column is gone.** The portrait is the hero's own leading
>   column now, so `ProfilePanel` is deleted and home is pane + rail. Home's pane
>   is consequently full width rather than two thirds.
> - **`--text-masthead` is capped at 7.7rem**, and the ceiling is set by the
>   hero's copy column rather than by taste (§6 proposed 8.5rem).
> - **Not yet built:** §5.2/§5.3 (terrain-profile section rules and heading
>   waypoint references), §6's `--text-label` consolidation, §8 (testimonials),
>   and the per-section passes in §9.


**Status:** Draft for review. Supersedes nothing yet; sits on top of `v3-two-pane-shell.md`.
**Branch:** `feature/map-interface` (cut from `main`, or continued on `feature/v3-two-pane-shell` if that hasn't merged)
**Goal:** Keep the colours, keep the topo map, keep every section the site has today — and
turn the map from wallpaper into the site's interface language. Coordinates, grid
references, contour rules, a traverse and a legend become the chrome; the sections keep
their internals and their order and get restyled in that vocabulary.

---

## 1. Decisions locked in (agreed, this session)

| Decision | Choice |
| --- | --- |
| **Map** | **Interface chrome.** The map supplies the visual language — grid refs, coordinates, contour rules, legend, scale. Sections stay in the current shell and order. Not a navigation-metaphor rebuild, not "material only". |
| **Typography** | **Mono only, pushed harder.** Stay on JetBrains Mono. No second face. Go bigger, heavier, tighter; add the missing scale steps and proper numeral handling. |
| **Motion** | **Hero + key sections.** Pointer-follow and scroll-linked positional motion on the hero, the stats column and project imagery. Everything else stays calm. |
| **Testimonials** | **Structure only.** Reserve the slot between Health and Contact, design the treatment, ship nothing until the quotes exist. |
| **Colours** | Unchanged. Existing `@theme` tokens and both palettes (`default` / `yorkshire`), dark + light. |
| **Background** | Kept — the canvas ASCII relief stays, and gets *more* load-bearing (see §2). |

---

## 2. The concept, and the one hard constraint it has to satisfy

The site already has the best asset on it and hides it: a real elevation field baked from
OS Terrain 50 across a genuine 25 × 20 km window of South Yorkshire
(`scripts/build-topography-grid.mjs`, `public/topography-grid.json`). Today it is a
drifting decorative canvas. The redesign promotes it to the thing the interface is *about*.

There is one constraint that decides the whole architecture, and it's already written down
in the codebase. `MapLegend`'s docblock says:

> The values describe the *dataset*, not the pixels on screen. That distinction matters:
> the background drifts continuously, so anchoring a spot height to a point in the viewport
> would be a lie. Everything here stays true whatever the canvas is doing.

That reasoning is correct, and it's the blocker for the direction you picked. You cannot
put a live grid reference in the chrome while the map drifts for its own amusement, because
the readout would be fiction.

**The resolution: the traverse.** Replace the free-running time-based drift with a
**scroll-driven pan along a real route across the baked window**. The map has a fixed
position in the terrain; the page's scroll progress moves you along a route on it. As a
result:

- the grid reference in the chrome is **true**, because the map really is where it claims
- the progress bar becomes **distance along the traverse**, not an arbitrary percentage
- each section becomes a **waypoint** with a real grid reference and a real spot height
- each section's rule becomes the **actual elevation profile** of the terrain at that point
- the cursor reticle can sample the **real elevation under the pointer**, because it reads
  the same function the canvas samples

This is the shape the site's own design instinct asks for elsewhere — motion that reflects
real underlying state rather than a decoupled effect — applied to the biggest object on the
page. It also converts the one genuinely awkward thing about the background (it moves for no
reason) into the interface's core mechanic.

### What this supersedes

- **The time-based drift** (`driftX`/`driftY` in `TopographicBackground.tsx`) goes. Replaced
  by scroll-linked traverse offset.
- **`MapLegend`'s blanket refusal of positional data** is narrowed, not deleted: the legend
  still describes the dataset, and now *also* the traverse origin/terminus, which are real
  fixed positions. The interactive readout only ever reports the traverse parameter, which
  the map is genuinely showing.
- **The footer keeps the OGL attribution and the dataset facts.** The licence line is not
  moving into chrome.

### The one thing to be careful about

The last scroll-linked experiment on this site — the panel strip — was built, seen in a
browser and reverted ("I'm not sure this works"). This is a different mechanism (a background
pan, not content moving between columns) and it has a *reason* to exist that the strip didn't,
but it is still scroll-driven motion on a large surface. **Phase 0 exists specifically to
settle that question with a running prototype before anything is built for real.** If the
traverse reads badly, the fallback is the static-traverse variant in Phase 0, where the map
parks at each section's waypoint instead of panning continuously.

---

## 3. What stays, what changes

**Stays exactly as-is (protected):**

- Every colour token, both palettes, both themes.
- The shell: `ShellFrame`, `layout="panel" | "flush"`, the single `lg` breakpoint, document-owned
  scroll, sticky panel + rail.
- The section order and every section's internals, except where sequenced in §7.
- The v3 gains you said you liked: **bolder display type**, the **big-number stats**
  (`ProjectStats`), the **awards** treatment in `ProjectRow`, **Skills as the curated stack
  list** (already reverted back), and the **leaning bookshelf**.
- Prerender-safety: no `window`/`document`/`matchMedia` in render bodies. Every new thing
  in this plan is effect-only or pure.
- Reduced motion via `useReducedMotion` + paired media queries. No new dependency.

**Changes:**

- Chrome gains a map data strip (coordinate + grid ref + scale) at every width.
- `SectionRule` stops being a mirrored glyph string and becomes a real terrain profile.
- Section headings gain a grid reference and spot height.
- The background pans by scroll, and grows a cursor reticle.
- A traverse progress indicator replaces the bare active-marker as the "where am I" cue.
- The type scale gains steps and tabular numerals.
- Hero and key sections gain the pointer/scroll motion.

---

## 4. The map data model

Everything here is **derived, never invented** — the standing rule for the topography
content module, and the reason the legend is trustworthy today.

### Facts already in the repo

| Thing | Value | Source |
| --- | --- | --- |
| BNG window | E 420000–445000, N 380000–400000 | `scripts/build-topography-grid.mjs` `WIN` |
| Extent | 25 × 20 km | derived from the window |
| Grid | 200 × 160 cells, 125 m/cell | bake `OUT_COLS`/`OUT_ROWS` |
| Relief | 20–513 m | `public/topography-grid.json` `min`/`max` |
| 100 km square | **SK** (origin E 400000, N 300000) | window lies inside SK |
| Sheffield centre | SK 358 873 | falls inside the window — good sanity anchor |

### New: `src/lib/gridref.ts`

A pure, dependency-free British National Grid module.

```ts
/** BNG easting/northing (metres) → 6-figure reference, e.g. "SK 358 873". */
export function toGridRef(easting: number, northing: number): string;
/** BNG → WGS84 lat/lon, for a coordinate readout. */
export function toLatLon(easting: number, northing: number): { lat: number; lon: number };
```

Two things to get right:

- **The 100 km letter pair** is fiddliest part. Do *not* hand-roll the letter arithmetic —
  derive it from a documented 5 × 5 letter table held as a constant, and lock it with
  known-answer tests so it can't silently drift.
- **`toLatLon` must use a real OSGB36 → WGS84 conversion** (Helmert transform + the
  Airy 1830 ellipsoid), not a naive approximation, or the displayed coordinates are wrong by
  ~100 m. A correct implementation is ~40 lines of arithmetic and needs no dependency.

**Known-answer tests (these are the acceptance bar for the module):**

| Easting | Northing | Expected |
| --- | --- | --- |
| 435860 | 387370 | `SK 358 873` (Sheffield) |
| 420000 | 380000 | `SK 200 800` (window SW) |
| 445000 | 400000 | `SK 450 000` (window NE) |

`SK 450 000` is correct and not a bug: the window's northern edge is exactly the SK/SE
boundary. Worth knowing before it looks like an off-by-one.

### New: `src/content/waypoints.ts` (generated)

Waypoints are **baked**, not measured at runtime, so a section's reference is stable across
reloads and available in the prerendered HTML. Generated by a new script from the committed
grid JSON, in the same spirit as `content/topography.ts` (which is already hand-maintained
from the bake's own output):

```ts
export type Waypoint = {
  id: string;          // section id, 'start' for the hero
  easting: number;
  northing: number;
  ref: string;         // "SK 235 828"
  elevationM: number;  // sampled from the grid
};

/** Ordered along the traverse. Regenerate with `npm run bake:waypoints`. */
export const WAYPOINTS: readonly Waypoint[] = [ /* … */ ];
```

- **The route is authored; the terrain is real.** A single polyline across the window,
  passing near real high ground and into the city, with eight stops: `start` (hero) →
  projects → skills → listening → reading → gaming → health → contact. Authoring the path is
  legitimate (it's a choice of route); the grid refs and elevations along it are then
  sampled from the data and cannot be fudged.
- **`elevationM` is read from the grid** at each waypoint, so a section's spot height is a
  real number in 20–513 m. If the route's profile turns out to be dull, change the *route*,
  not the elevations.
- **Cumulative distance and ascent** come out of the same table, which is what lets the
  progress indicator read `14.2 km · 268 m ascent` instead of `62%`.
- Adding a section (e.g. testimonials later) regenerates the table; refs shift, and that's
  correct.

**Illustrative refs** (evenly spaced across the sheet, to show the shape — the real ones are
sampled along the authored route):

| Stop | Grid ref | Spot height |
| --- | --- | --- |
| start (hero) | SK 200 800 | low |
| projects | SK 235 828 | |
| skills | SK 271 857 | |
| listening | SK 307 885 | |
| reading | SK 342 914 | |
| gaming | SK 378 942 | |
| health | SK 414 971 | |
| contact | SK 450 000 | high ground |

### New: `src/lib/useTraverse.ts`

Turns document scroll progress into a position along the route.

```ts
export function useTraverse(): {
  /** 0–1 along the whole document. */
  progress: number;
  /** The waypoint you are at or most recently passed. */
  current: Waypoint;
  /** Interpolated position, for the map readout. */
  position: { easting: number; northing: number; ref: string; elevationM: number };
  /** Cumulative distance/ascent to here. */
  travelled: { km: number; ascentM: number };
  /** Where the map should be drawn, in grid cells. */
  pan: { x: number; y: number };
};
```

- **Single owner, like `useActiveSection`.** One hook, called once in `ShellFrame`, whose
  output is handed down. Two independent observers over the same scroll would be two sources
  of truth — the mistake `useActiveSection` already exists to avoid.
- RAF-throttled `scroll` + `resize` listeners, geometry read inside the effect only.
- Return `progress: 0` and the `start` waypoint as the server snapshot, so prerendered HTML
  is coherent and hydration matches.
- **Merge consideration:** `useActiveSection` already measures section offsets on scroll for
  the rail. Do not add a parallel measurement pass. Either derive `active` from
  `useTraverse`'s waypoint list, or have one shared measurement module both consume. Recommend
  folding `useActiveSection` into the traverse hook and keeping `useActiveSection`'s public
  shape as a thin adapter, so `MobileBar`/`SectionRail` don't change.

---

## 5. The map interface chrome

### 5.1 The data strip

One component, `src/components/MapReadout.tsx`, rendered once per width (same
single-instance discipline as `SectionNavLinks`):

```tsx
<MapReadout orientation="horizontal" />  // below lg, in MobileBar
<MapReadout orientation="vertical" />    // lg+, top of the rail
```

Content, in mono, tracked out, `tabular-nums`:

```
SK 358 873 · 53.380°N 1.471°W        1:25 000
```

- **Static parts** (scale, sheet, extent) come from `content/topography.ts` and are in the
  prerendered HTML.
- **Live parts** (the interpolated ref/coords) are enhancement — they show the `start`
  position in the static HTML and update on scroll. Everything meaningful survives JS-off.
- **Contrast:** this sits over the moving canvas. It needs a surface. Reuse the established
  `bg-background/70 backdrop-blur-sm` card treatment, and re-check contrast against the
  worst-case glyph density — this is the one place the background could quietly fail WCAG,
  and the v3 plan already flagged it.
- The `scale` label on its own is set dressing, but it's *true* set dressing (the window is
  genuinely ~25 km across a viewport), which is the standard the legend is held to.

### 5.2 Section rules become terrain profiles

`SectionRule` currently quotes the glyph ramp back as a mirrored string. Replace with the
**real elevation profile along the route up to that section's waypoint**.

- New component keeps the name and the call site, so `SectionHeading` doesn't change.
- Draws from the shared grid: a single row (or a narrow band) of the baked field sampled
  along the route, mapped through the existing `RAMP` (`·:-=+*#%@`) — the same ramp the
  background uses, so the rule is literally a slice of the map.
- **Height must be reserved** (a fixed-height container) because the grid arrives via fetch.
  Before it loads, render the current mirrored-ramp profile as the fallback — so there is no
  layout shift and the no-JS HTML still has a rule.
- Gains the waypoint's **grid ref and spot height** as small `text-[0.65rem] text-muted`
  labels at the ends of the rule. This is the "elevation ramp as rule" from the agreed
  preview, but with real numbers.

**Shared grid access is required here.** Today `TopographicBackground` fetches
`topography-grid.json` itself. Move the fetch to the existing shared cache in `src/lib/assets.ts`
(`fetchAsset`/`loadAsset`/`useAsset` are already there and already solve exactly this problem
for `github.json`) and add a `useTopographyGrid()` hook. Without this the grid downloads once
per section rule.

### 5.3 Section headings

`SectionHeading` gains the waypoint line under/above the title:

```
──────────  ▲ 0142 m  ──────────
▤ PROJECTS                      SK 235 828
```

- Grid ref and spot height are **static** (baked), so they're in the prerendered HTML.
- Keep the existing rule→heading gap; the heading and its map data read as one pair.
- The icon stays, sized `size-[1em]`, inheriting `currentColor` — unchanged.

### 5.4 Progress indicator

You liked yeqq's progress bar. On this site it should be the **traverse**, not a second
scrollbar, and it must not duplicate the rail's active marker.

- **At `lg`+:** the rail's existing `rail-marker` dot stays (it's the "you are here" pin, a
  non-colour cue and an a11y requirement). Add a thin vertical traverse line behind the rail
  tiles, filled to `progress`, with a small tick at each waypoint. Rail tiles sit on the line
  at their waypoint — so the rail *is* the route.
- **Below `lg`:** a 2px horizontal line under the sticky `MobileBar`, `scaleX(progress)`, with
  waypoint ticks. This is the yeqq bar, in the mobile chrome.
- **Readout:** `SK 358 873 · 14.2 km · 268 m` alongside, using the same `MapReadout` data.
- **Mechanism:** CSS scroll-driven animations (`animation-timeline: scroll(root)`) where
  supported, driven by the same `useTraverse` value as a fallback so there's one source of
  truth. Check support at implementation time and prefer the CSS path — it runs off the main
  thread and is the cheaper option on a page that already has a canvas RAF loop.
- **Reduced motion:** the bar still tracks scroll (it reports position, it isn't an
  animation), but no transition easing.
- **Back-to-top keeps its always-present-but-disabled behaviour** — the rail must not shift.

### 5.5 Cursor reticle

The pointer interactivity you liked on dungyov, made honest and cheap:

- The existing spotlight becomes a **reticle** at the pointer, and reads out the **real
  sampled elevation** under it — it calls the same `sampleHeight()` the canvas uses, so the
  number is true by construction.
- **Desktop + fine pointer + no reduced motion only.** Touch gets the still map, no listener
  attached. Pointer reads stay RAF-throttled through refs.
- `aria-hidden`, `pointer-events-none`. It is decoration that happens to be accurate.
- **Cost:** one extra text draw per frame at most, and only when the pointer is inside the
  window. The existing loop already pauses on `visibilitychange`.

---

## 6. Typography — mono only, pushed harder

No new typeface. The push comes from size, weight, tracking and numerals.

### Scale

Extend the `@theme` block in `src/index.css`. Existing tokens stay; add above and below:

```css
/* Above the hero: the first screen's statement line. */
--text-masthead: clamp(3rem, 9vw, 8.5rem);
--text-masthead--line-height: 0.9;
--text-masthead--letter-spacing: -0.04em;
--text-masthead--font-weight: 800;

/* Below the stat tier: the map chrome. Small, tracked out, tabular. */
--text-label: 0.6875rem;
--text-label--line-height: 1.2;
--text-label--letter-spacing: 0.14em;
--text-label--font-weight: 500;
```

- **Raising `--text-display`** rather than adding `masthead` is the simpler option; the reason
  to add a tier is that the hero's role board (`FlipWord`) is grid-locked to `--slot-w`
  derived from the h1's tracking. Changing display tracking breaks the board. A separate
  masthead token keeps the board's geometry untouched. **Verify the board still aligns.**
- `--text-title` gains one step at `lg` — you've asked twice for desktop type and spacing to
  keep growing, and the pattern is `lg:`-gated overrides with mobile untouched.
- **`--text-label` gives the map chrome one shared token** instead of the seven ad-hoc
  `text-[0.6rem]` / `text-[0.65rem]` literals currently in `MapLegend`, `BuildStamp` and
  `AssetReadout`. Consolidate them.

### Numerals

**`font-variant-numeric: tabular-nums` on every figure that can change:** the stats
(`ProjectStats`), the coordinate readout, the grid refs, the count-up, the scale bar ticks.
JetBrains Mono is already monospaced, but tabular figures also pin letter-spacing so the
count-up doesn't jiggle and the coordinate readout doesn't reflow as you scroll. This is the
single highest-value typographic fix in the plan.

### Weights and fallbacks

- `index.html` already loads 400/500/700/800 — nothing new to download.
- **Set the fallback stack explicitly** so a failed font fetch doesn't reflow into a
  proportional face: `'JetBrains Mono', ui-monospace, 'SF Mono', 'Fira Code', monospace` is
  already right. Add `font-display: swap` awareness — a swapped proportional fallback at
  masthead size will shift the first screen badly. Consider `font-display: optional` for the
  700/800 faces, or accept the shift and keep the hero's height reserved.

---

## 7. Motion — hero and key sections

Scope: pointer-follow and scroll-linked **positional** motion on the hero, the stats column
and project imagery. Nothing fades; nothing cross-fades. Motion must reflect real state.

### Hero

- **Copy drift** (new). The headline and subheadline translate a small amount against the
  portrait, giving the screen depth. Written to CSS custom properties by the same single
  pointer handler that already drives `--portrait-x/--portrait-y`, so there is one listener,
  one RAF throttle, one reset path.

  ```css
  .hero-copy  { transform: translate3d(calc(var(--hero-x) * -6px), calc(var(--hero-y) * -4px), 0); }
  .portrait-picture { transform: translate3d(calc(var(--portrait-x) + 0.35rem), /* … */); }
  ```

- **Ownership:** the effect stays inside `PortraitFigure` today. Adding copy drift means the
  handler needs to reach sibling elements. Move it to a small `usePointerParallax()` hook
  **owned by the hero section**, which sets the custom properties on the hero element — so the
  effect can't be silently lost when a component moves again (it already happened once with
  the portrait).
- Gate: `(hover: hover) and (pointer: fine)` **and** not reduced motion. Base offset applies
  on every device so the layout never shifts between touch and desktop.
- Keep it small. The dungyov effect is bigger and giddier than this site's taste; the taste
  says subtle, so this is 4–10px, not a full track.

### Stats

- Count-up already exists (`useCountUp`, scroll-triggered, reduced-motion aware). Keep.
- Add **positional** scroll motion: the figures column translates a few px as its section
  crosses the viewport, pure function of scroll, no fades, reversible. Reuses `useTraverse`.
- Add `tabular-nums`.

### Projects

- Pointer-follow on project imagery within rows: the row's accent border already responds on
  hover. Add a small cursor-relative offset on any imagery and keep body copy static
  (legibility over the topo is a hard rule, and moving text is the fastest way to break it —
  the copy drift above is hero-only for this reason).
- **Keep the per-row boxed surface.** An earlier restyle that stripped the card surface and
  laid copy straight on the contours was rejected as unreadable, and rows must keep border +
  translucent background + blur, with the accent border on hover.

---

## 8. Testimonials — structure only

Reserve the slot, design the treatment, ship no content.

- New `src/content/reviews.ts` exporting `REVIEWS: readonly Review[] = []` with the shape
  (`quote`, `name`, `role`, `company`, optional `avatarUrl`, `sourceUrl`).
- New `src/components/Testimonials.tsx`, rendering `null` when `REVIEWS` is empty.
- **`SECTIONS` gains `testimonials`** (so the waypoint, nav entry and heading all exist),
  but the nav and the section both filter on `REVIEWS.length > 0`. This keeps one section
  registry — the reason nav and headings can't drift — while nothing renders until there's
  content. Add `visibleSections()` in `content/sections.ts` and have `SectionNavLinks`,
  `FooterNav` and `Home` consume it.
- **Treatment** (from the Majd reference, but in this site's restraint): one quote at a time
  in a boxed surface, attribution as a term/value row in the map-data style, waypoint grid
  ref in the heading like every other section. Multiple quotes cycle with the same
  scroll-linked positional motion as the other key sections — not a carousel, not
  auto-advancing. **This is the section where a fade would be tempting; don't.** If a
  crossfade is genuinely needed, it's a decision to confirm, not assume.
- **Content plan:** quotes sourced from LinkedIn, with name/role/company recorded, credited
  and linked to the source. Do not invent attributions, and don't ship a quote without a
  permission check.

---

## 9. Section-by-section passes

Kept in the current order; each pass is the map vocabulary applied without breaking what
works. Ordered by payoff, and each one is independently reviewable and committed before the
next starts.

| # | Section | Pass |
| --- | --- | --- |
| 1 | **Projects** | First content screen, so it carries the weight. Heading gains waypoint ref. Stats column becomes the map-data readout (term/value rows, tabular numerals, keep the ascent-style gradient and the count-up). Rows keep their boxes and the awards treatment. Fix the known inversion — below `lg` the pane is *wider* than at `lg`, so viewport breakpoints give more columns where there's less room; move the grid to a **container query on the section**. |
| 2 | **Skills** | Keep the curated stack list and the taxonomy connectors. Replace the GitHub language bar — the weakest element on the page — with the map-data treatment, or absorb it into the heading. |
| 3 | **Listening** | Keeps its internals. The deck needs a width decision in the narrower pane; the visualizers and the knob already handle reduced motion and theming correctly — don't touch the mechanism. |
| 4 | **Reading** | Keep the leaning shelf and the full seven books at every width. The known `w-[min(72rem,100vw-3rem)]` breakout must become **pane-relative** (container query on `.bookshelf`), or it overflows horizontally once the pane isn't the viewport. |
| 5 | **Gaming** | CRT/case scale against the pane. Decide whether the interactive power/dial controls need a static fallback for no-JS. |
| 6 | **Health** | Watch scale; revisit the `@media (max-width: 400px)` override; the live clock becomes client-only when prerendering lands. |
| 7 | **Contact + Footer** | Keep the footer nav, colophon, easter egg and asset readout. Fold the legend's *key* up into the chrome and leave the **attribution and licence** in the footer. |
| 8 | **Testimonials** | Promote from §8 once quotes exist. |

---

## 10. Files

### New

| File | Purpose |
| --- | --- |
| `src/lib/gridref.ts` | BNG easting/northing → grid ref + lat/lon. Pure, tested. |
| `src/lib/useTraverse.ts` | Scroll progress → route position, current waypoint, pan offset. |
| `src/lib/usePointerParallax.ts` | One pointer handler for hero copy + portrait drift. |
| `src/lib/useTopographyGrid.ts` | Shared fetch/decode of `topography-grid.json` via `lib/assets.ts`. |
| `src/content/waypoints.ts` | **Generated.** Waypoint refs + sampled elevations. |
| `src/content/reviews.ts` | `REVIEWS` (empty for now). |
| `src/components/MapReadout.tsx` | Coordinate / grid ref / scale strip, horizontal + vertical. |
| `src/components/TraverseProgress.tsx` | Rail traverse line + sub-`lg` bar + waypoint ticks. |
| `src/components/Testimonials.tsx` | Reserved section, renders null when empty. |
| `scripts/build-waypoints.mjs` | Bakes `content/waypoints.ts` from the grid JSON + authored route. |

### Changed

| File | Change |
| --- | --- |
| `src/components/TopographicBackground.tsx` | Time drift → scroll-linked traverse pan; reticle + sampled elevation; consume the shared grid hook. |
| `src/components/SectionRule.tsx` | Mirrored ramp → real terrain profile from the shared grid, with reserved height. |
| `src/components/SectionHeading.tsx` | Waypoint grid ref + spot height. |
| `src/components/ShellFrame.tsx` | Own `useTraverse`; pass down to navs, readout and progress. |
| `src/components/SectionRail.tsx` / `MobileBar.tsx` | Mount `MapReadout` + `TraverseProgress`; one instance each. |
| `src/components/Hero.tsx` | `usePointerParallax` for copy + portrait; new masthead token. |
| `src/components/PortraitFigure.tsx` | Hand pointer ownership to the hero hook. |
| `src/components/ProjectStats.tsx` | `tabular-nums`; map-data readout styling; keep gradient + count-up. |
| `src/components/MapLegend.tsx` | Key moves to chrome; attribution + licence stay; adopt `--text-label`. |
| `src/components/Projects.tsx` / `Reading.tsx` / `Skills.tsx` | Container queries; pane-relative breakout. |
| `src/content/sections.ts` | `testimonials` entry + `visibleSections()`. |
| `src/content/topography.ts` | Traverse origin/terminus facts; regenerate alongside any re-bake. |
| `src/index.css` | `--text-masthead`, `--text-label`; tabular numerals; traverse + reticle + progress classes; retire the dead `.topo-drift` keyframes. |
| `package.json` | `bake:waypoints` script. |

### Untouched

`src/data/*`, `api/`, the theme context, the section order, all colour tokens, and every
device metaphor (turntable, tape deck, CRT, watch, bookshelf).

---

## 11. Phases

Phase 0 gates everything. Each later phase is independently reviewable, ends with
`npm run lint && npm run build` clean plus the phase's own checks, is committed and pushed
before the next starts, and must leave the tree prerender-ready.

**0 — Prototype the traverse (throwaway).**
Build **three or four working variants** on a local dev route so they can be opened side by
side and judged in a real browser, wired to the real grid and the real content:

1. **Full traverse** — map pans continuously with scroll, live readout, reticle, rail-as-route.
2. **Static traverse** — map parks at each waypoint and holds until the next one; readout
   reports the waypoint.
3. **Chrome only** — no background pan at all; the map language lives entirely in rules,
   headings, readout and stats.
4. **Chrome + reticle** — variant 3, plus the cursor reticle sampling real elevation.

Then **delete every demo route, component and demo-only CSS**. Nothing from Phase 0 ships;
only the chosen direction does. This exists because the last scroll-linked experiment was
built before it was judged, and was reverted.

**1 — Map data foundation.** `gridref.ts` with its known-answer tests, `waypoints.ts` + the
bake script, `useTopographyGrid` on the shared asset cache, and the route authored + sampled.
No visual change. This is the phase that can be verified without a browser.

**2 — Chrome.** `MapReadout` in the rail and the mobile bar; `ShellFrame` owns `useTraverse`;
static facts present in the HTML, live values as enhancement. Verify: contrast over the worst-case
canvas density, exactly one instance per width, no duplicate controls in the a11y tree, and
that the static HTML still carries the dataset facts with JS off.

**3 — Rules and headings.** Terrain profiles + waypoint refs and spot heights on all seven
headings. Verify: no layout shift before the grid resolves, no-JS fallback renders, the rule
reads as a deliberate pair with its heading.

**4 — The traverse.** Replace the drift with the scroll-linked pan; reticle on desktop.
Verify: reduced motion (no time-based motion anywhere), touch devices attach no listener,
the RAF loop still pauses when the tab is hidden, no frame-rate regression on a low-end
profile, and — the important one — **that the readout is never lying**: the ref shown must
correspond to the terrain actually drawn.

**5 — Progress.** Rail traverse line, sub-`lg` bar, waypoint ticks, distance/ascent readout.
Verify: no shift as it fills, ticks land on the real waypoints, back-to-top stays present
and disabled, active state still carries a non-colour cue.

**6 — Typography.** New scale tokens, `tabular-nums` everywhere a figure can change,
`--text-label` consolidation, mobile untouched and desktop stepped up. Verify: contrast at
every new size in both themes × both palettes, the `FlipWord` board still aligns, no reflow
at 320px or 400 % zoom.

**7 — Motion.** Hero copy drift + hook ownership; stats positional motion; project imagery
follow. Verify: reduced motion stills everything, touch is static, one listener only, and
no motion on any text carrying body copy.

**8 — Section passes.** The §9 table, in order, one commit each.

**9 — Testimonials.** Promote §8 when quotes exist.

**10 — Verification and docs.** Full sweep (§12), copy the plan to
`docs/plans/map-interface-redesign.md`, update `v3-two-pane-shell.md` for anything this
changes, and open the PR.

---

## 12. Verification

- `npm run lint && npm run build && npm run probe:ssr` clean — read the **full** lint output,
  not a tail.
- `gridref.ts` known-answer tests pass (`SK 358 873`, `SK 200 800`, `SK 450 000`).
- **The readout is honest:** pan to several scroll positions and confirm the ref shown matches
  the terrain drawn — not merely that it updates.
- **Light + dark × default + Yorkshire:** all four combinations, every new element, contrast
  at 4.5:1 body / 3:1 large, including chrome text over the drifting canvas at worst-case
  glyph density.
- **Reduced motion:** no time-based drift, no marker animation, no bar easing, reticle absent,
  hero and stats still, and the traverse readout still reporting position.
- **Touch / coarse pointer:** no listeners attached, map static, layout identical to desktop
  (base offsets applied everywhere).
- **Keyboard:** skip link → content → rail; visible focus throughout; no trap; every new
  control is a real link/button.
- **Zoom / reflow:** 320px and 400 % with no lost content and no horizontal scroll on both
  routes — the Reading breakout is the one to watch.
- **JavaScript disabled:** both routes readable; dataset facts, section headings, waypoint
  refs and spot heights all present; footer nav and internal links working.
- **No hydration warnings** on either route.
- **Lighthouse** mobile + desktop: a11y, SEO and best-practices not regressed; no new CLS;
  confirm the added per-frame overhead hasn't cost performance.

---

## 13. Risks and open questions

| Risk | Mitigation |
| --- | --- |
| **Scroll-linked background motion reads as gimmicky** — exactly what killed the panel strip. | Phase 0 prototype, judged in a browser before anything is built. Variant 3 (chrome only) is the safe fallback and still delivers the direction. |
| **Grid-ref letter arithmetic is easy to get subtly wrong.** | Table-driven + known-answer tests, not hand-rolled arithmetic. |
| **`toLatLon` without a proper Helmert transform** would be wrong by ~100 m while looking plausible. | Real OSGB36→WGS84 conversion, checked against the known Sheffield coordinate. |
| **Chrome text over the moving canvas fails contrast.** | Boxed surface + worst-case-density check; already a known hazard in the v3 plan. |
| **Two scroll-measuring hooks become two sources of truth.** | Fold into `useTraverse`; keep `useActiveSection` as an adapter so navs don't change. |
| **Scroll-driven pan is disorienting for motion-sensitive users.** | Gated off entirely under reduced motion; variant 2 (static traverse) is the fallback. |
| **The route's real elevation profile is boring.** | Change the route, never the elevations. |
| **Testimonials get invented or shipped without permission.** | Structure only; content needs real quotes plus a permission check. |

**Open questions to settle before Phase 2** (not blockers for Phase 0/1):

1. Should the readout show the **whole route** distance/ascent, or only the segment walked so far?
2. Does the traverse run **SW → NE** (rising into the Peak) or **NE → SW** (descending into the city)? The direction sets the page's emotional shape.
3. Does the rail's traverse line **replace** the per-tile active marker, or sit behind it? Recommend behind — the marker is the non-colour cue and removing it would signal state by colour alone.

---

## 14. Conventions for this work

- Branch `feature/map-interface`; commits prefixed `[ai-assisted]`; PR into `main` with
  `## Changes` and `## Notes`; delete the branch after merge.
- Keep the plan file in `docs/plans/map-interface-redesign.md` so the PR can reference it, and
  treat it as living — update it when a decision moves.
- Exclude `.commandcode/`, `.agents/`, `.claude/skills/`, `skills-lock.json` and raw source
  assets (`public/images/portrait-original.jpg`, `public/images/profile-screenprint.png`)
  from commits.
- No new runtime dependency. Everything here is CSS, a canvas the site already runs, and
  ~100 lines of pure arithmetic.
