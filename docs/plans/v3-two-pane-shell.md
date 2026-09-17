# Portfolio V3 — two-pane shell, display type, and a first-screen hero

**Status:** Planned, not started.
**Goal:** Re-lay the site as the reference composition — a fixed profile panel, an
independently scrolling content pane, and a vertical icon rail — with a much larger,
much heavier monospace display scale. The page's first screen becomes a plateau: the
hero fills it and the first content section (Projects) starts on the next one.

Supersedes the single-column stack of `v2-redesign.md` phases 1/3; the data layer,
theme system and device metaphors all stay.

**Committed direction: the site must be crawlable and readable without JavaScript.**
Prerendering is a committed follow-up (see "Follow-up plans" #1), and every component in
*this* plan is written SSR-safe so that stays a build change rather than a rewrite.

> When implementing, copy this file to `docs/plans/v3-two-pane-shell.md` so the PR can
> reference it, per `docs/plans/README.md`.

## Decisions locked in (with Jonny)

- **Type:** stay monospace-only. Add **600/700/800** weights of JetBrains Mono and
  raise the display scale hard. No second typeface. (JetBrains Mono ships 100–800, so
  800 is real, not synthesised.)
- **Layout:** **three-tier.** <768px single column with document scroll; 768–1023px
  **condensed** panel (no portrait) + inner scrolling pane; ≥1024px **full** panel
  (portrait) + pane + icon rail.
- **First screen:** hero fills it. **No** stats row, **no** client-logo strip, and
  **not** straight into Projects — Projects begins on the next screen.
- **`/privacy` gets the shell but NOT the profile panel.** The rail and the scrolling
  pane are site chrome and carry over; the panel is home-only, so the privacy policy
  isn't presented next to Jonny's face. This means **two shell variants** — see §1.
- **No JS, no problem — content must be crawlable and readable with JavaScript
  disabled.** Prerendering is committed (follow-up plan #1), not optional. Consequences
  for this pass are in the SEO section; the headline one is that every component built
  here must be SSR-safe from the start.
- **Portrait treatment: keep the existing screenprint cut-out.** Scaled up and seated in
  the panel. No full-bleed variant, no new asset.
- **Home affordance on `/privacy`: keep the content-level "← Back to home" link.** The
  rail does not grow a conditional "Home" item.
- **Scope of this pass:** the shell, the type scale, the hero, and the accessibility +
  SEO work below. Each content section keeps its current internals for now and gets **its
  own follow-up plan** (see the last section).
- Accent colours stay the existing heather/Yorkshire tokens. The reference's green is
  **not** being adopted.
- **Accessibility and SEO are acceptance criteria for every phase**, not a trailing
  polish pass. See the dedicated section — the shell is where both are won or lost.

## What exists today (verified)

| Thing | Where | Note for this work |
| --- | --- | --- |
| App shell | `src/App.tsx` | `min-h-dvh` div + `TopographicBackground` + flat `<Routes>`. **No layout route, no shared shell.** Deliberately has no `bg-*` so the `-z-10` canvas shows through — preserve that. |
| Page composition | `src/pages/Home.tsx`, `src/pages/Privacy.tsx` | Each renders its own `<header>` (toggles live here), `<main>`, `<Footer />`. Width wrappers (`max-w-6xl`/`max-w-4xl px-6`) live in the pages, **not** in the sections — so sections drop into a pane cleanly. |
| Scroll | — | **100% document scroll.** No sticky, no scroll listeners, no IntersectionObserver, no scroll-snap. Nothing to unpick. |
| Background | `src/components/TopographicBackground.tsx` | ASCII relief on a Canvas 2D element, `fixed inset-0 -z-10`, `aria-hidden`, sized from `window.innerWidth/innerHeight`. Already viewport-fixed → **survives the split unchanged**, but it touches `window` at body scope, so it needs a client-only boundary for prerendering (see §10). |
| Tokens | `src/index.css` `@theme` (lines 14–26) | Only `--font-mono` + 5 colours. Type scale is **not** tokenised — sizes are inline in JSX. |
| Theme | `data-theme` + `data-palette` on `<html>` | Light block at `index.css:96`, Yorkshire at `:172`. Pre-paint script in `index.html:13`. Generated colours are contrast-checked — keep that discipline. |
| Toggles | `src/theme/ThemeToggle.tsx`, `PaletteToggle.tsx` | Both already implement the **exact** reveal-on-hover label pill (absolutely positioned `right-full`) we want on the rail, and already handle `aria-label`, `aria-pressed`, `focus-visible` and `motion-reduce`. Reuse the pattern verbatim. Carry a hydration hazard — see §10. |
| Copy | `src/theme/copy.ts` | Palette-keyed (default vs Yorkshire dialect). Section headings come from `heading(palette, key)`. **Must keep working** — including in the rail's hover labels. |
| Motion | none installed | All motion is hand-rolled CSS keyframes or `rAF`/canvas. `src/lib/useReducedMotion.ts` is the shared gate, alongside paired `@media (prefers-reduced-motion: reduce)` CSS. Add nothing new. |
| Icons | `src/components/icons.tsx` | Hand-rolled SVGs, `fill="currentColor"`, `aria-hidden`, `className` prop. Follow it. |
| SEO | `index.html` only | **One static head shared by both routes**: `/privacy` currently serves the home title, description and canonical. No SSR, no prerender, no `react-helmet`, no `document.title` write anywhere in `src`. `vercel.json` rewrites all non-`/api` paths to `/index.html`, so today the shipped HTML is an empty `<div id="root">`. |

## Architecture

### 1. Shell = a react-router layout route, in two variants

The pane and rail are shared by both routes; the profile panel is home-only. Rather than
branch inside one component on `pathname`, model it as **one frame plus two thin layout
routes**, so each route declares what it is:

```tsx
function App() {
  return (
    <div className="min-h-dvh text-foreground">
      <TopographicBackground />
      <Routes>
        <Route element={<PanelShell />}>           {/* panel + pane + rail */}
          <Route path="/" element={<Home />} />
        </Route>
        <Route element={<PlainShell />}>           {/* pane + rail */}
          <Route path="/privacy" element={<Privacy />} />
        </Route>
      </Routes>
    </div>
  );
}
```

`src/components/ShellFrame.tsx` holds all the actual work — the grid, the pane ref, the
skip link, the mobile bar, the rail and the route-change scroll reset — and takes an
optional `panel` slot:

```tsx
export function ShellFrame({ panel }: { panel?: ReactNode }) {
  const paneRef = useRef<HTMLDivElement>(null);
  const { pathname, hash } = useLocation();
  useDocumentScrollReset(paneRef, pathname, hash);

  return (
    <div className="shell" data-panel={panel ? 'true' : 'false'}>
      {panel}
      <div ref={paneRef} className="pane">
        <MobileBar />
        <Outlet />
      </div>
      <SectionRail paneRef={paneRef} />
    </div>
  );
}
```

`PanelShell` / `PlainShell` are then one-liners in the same file:
`<ShellFrame panel={<ProfilePanel />} />` and `<ShellFrame />`.

`data-panel` drives the column template (see §2), so the no-panel variant is pure CSS, not
a second layout to maintain.

Consequences worth stating up front:

- **Rail anchors work from `/privacy`.** Every rail link resolves to `/#projects` etc. when
  not on the home route, so the nav is identical on both pages.
- **`Privacy` keeps a content-level "← Back to home" link** (confirmed). With no panel
  there's no branding or home affordance in the chrome on that route, and an inline link in
  the article is unambiguous and works without JS. The rail does not grow a conditional
  "Home" item; its top item stays back-to-top (scroll), which is a different job.
- **Privacy's prose gets its own reading width** inside the pane (`max-w-2xl`-ish) so it
  doesn't stretch across the full pane now that the panel column is gone.
- `Privacy` stops rendering its own `<header>` toggles — they live in the rail and the
  mobile bar on both routes, exactly once.

The skip link moves into `ShellFrame`, targeting the pane's `<main id="main"
tabIndex={-1}>` so keyboard focus actually lands (today the target isn't focusable). That
applies to **both** variants — it's about the scroll container, not the panel.

### 2. One markup, three tiers — CSS-first, no viewport hook

The site's existing convention is CSS visibility swapping (`Reading.tsx` renders two markup
trees with `md:hidden` / `hidden md:flex`) and `matchMedia` only ever for *capability*
queries. Keep that. The shell is a plain block on mobile and a `h-dvh` grid from `md`. The
column template comes from a custom property so the two variants differ by one declaration:

```css
.shell {
  --shell-cols: minmax(0, 1fr);
}
@media (min-width: 48rem) {
  .shell[data-panel='true'] {
    --shell-cols: 17rem minmax(0, 1fr);
  }
}
@media (min-width: 64rem) {
  .shell[data-panel='true'] {
    --shell-cols: clamp(20rem, 24vw, 23rem) minmax(0, 1fr) 3.75rem;
  }
  .shell[data-panel='false'] {
    --shell-cols: minmax(0, 1fr) 3.75rem;
  }
}
```

| Tier | Shell | Panel | Pane | Rail |
| --- | --- | --- | --- | --- |
| `<768px` | `block min-h-dvh` | on `/` only: first child, full width, **with** portrait; absent on `/privacy` | not a scroller — flows in the document | hidden; toggles live in the sticky `MobileBar` |
| `768–1023px` | `md:grid md:h-dvh md:overflow-hidden` + `md:grid-cols-(--shell-cols)` | on `/`: `md:h-dvh`, **no portrait**, identity + blurb + CTAs + socials + toggles | `md:h-dvh md:overflow-y-auto` | hidden |
| `≥1024px` | as above, three columns on `/`, two on `/privacy` | on `/`: `lg:h-dvh`, full treatment with portrait | as above | `hidden lg:flex`, `lg:h-dvh`, **both variants** |

Notes that matter:

- Use `h-dvh`, never `h-screen`/`100vh` — `dvh` is already the site's convention on the
  root. Mobile browser chrome will otherwise clip the panel's bottom row.
- `md:overflow-hidden` on the shell prevents a second scrollbar; the pane is the only
  scroller. `md:overscroll-contain` on the pane stops scroll chaining into the page.
- `md:scroll-smooth motion-reduce:scroll-auto` on the pane. Do **not** put `scroll-behavior`
  on `html` — smooth scrolling is a reduced-motion violation and can also break the "reset to
  top on route change" behaviour.
- The panel gets `md:overflow-y-auto` as a safety valve only (its content is short); it
  should never actually scroll at ≥1024px.
- One component per region, tiered with variants — not three parallel trees.
- **Scroll ownership is the one thing JS must know about:** `useActiveSection` needs to pick
  `root: paneEl` vs `root: null`, which it derives from `matchMedia('(min-width: 48rem)')` and
  re-evaluates on change. Resizing across the breakpoint flips scroll ownership, and observers
  must be rebuilt.

### 3. Anchors, skip link and scroll reset inside an inner scroller

- Plain `href="#projects"` works: fragment navigation scrolls the **nearest scrollable
  ancestor**, so the same anchors that work today keep working once the pane is the scroller.
  `scroll-mt-16` on every section root still applies.
- No change needed to the hero CTAs' targets (`#projects`, `#health`, `#contact`).
- Cross-route anchors (`/#projects` from `/privacy`) land correctly on navigation, but the pane
  mounts fresh so the browser resolves the fragment after paint — verify this rather than
  assume, and don't let the scroll reset fight the fragment (hence the `hash` guard below).
- Skip link: `#main` sits inside the pane. `tabIndex={-1}` + `focus:outline-none` on `<main>`
  so fragment navigation moves keyboard focus instead of only scrolling.
- Route change (`/` ⇄ `/privacy`) currently relies on the browser resetting document scroll,
  which no longer happens. In `ShellFrame`:

  ```tsx
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;                       // let the fragment win
    paneRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash]);
  ```

  `behavior: 'auto'` deliberately ignores CSS `scroll-smooth`, so a route change doesn't
  smooth-scroll back to the top. This effect only runs in the browser, so it's prerender-safe.
- **All navigation stays real anchors** — `<Link to="/#projects">` renders an `<a href>`, never
  a JS `onClick` scroll handler. This keeps the nav crawlable, keyboard-operable, and working
  with JS disabled (which is now a requirement, not a nicety), and it's what makes the rail
  contribute internal links rather than costing them.

### 4. Active-section tracking — `src/lib/useActiveSection.ts`

New, and the only genuinely novel mechanism in this plan. Must degrade cleanly on the server —
it reads `matchMedia`/DOM, so it's **effect-only** (no work in the render body) to keep
prerendering honest.

- **Root:** the pane element on `md+`, `null` (viewport) below it (see §2).
- **Band:** `rootMargin: '-45% 0px -45% 0px'`, `threshold: 0` — the section straddling the
  pane's vertical middle wins. This is what makes the rail feel right rather than flickering as
  sections enter from the bottom.
- **Short trailing sections:** Contact may never cross the middle band. Special-case "pane
  scrolled to within a few px of its bottom → last section wins".
- **Late-arriving sections:** Projects/Listening/Reading/Gaming/Health all render `null` until
  their fetch resolves. Discover targets by querying `#main section[id]` inside a
  `MutationObserver` on the `<main>` subtree, re-observing on each mutation; this also covers
  sections that mount after first paint. (Once prerendering lands, those sections will be
  present in the initial HTML, so this becomes a belt-and-braces path rather than the norm.)
- **On `/privacy` there are no sections**, so the hook yields nothing and the rail simply has no
  active item. No active marker is correct here — do not fall back to marking the first link.
- **Degrade:** no `IntersectionObserver` → no active state. Rail links still work.
- **`StrictMode`:** the effect runs twice in dev; make setup/teardown idempotent
  (`observer.disconnect()` / `mutationObserver.disconnect()` in cleanup).
- **a11y:** the active link gets `aria-current="true"`, and the active state is signalled by more
  than colour (a filled marker), never by colour alone.

### 5. `src/components/SectionRail.tsx` + `src/content/sections.ts`

Section list in one place, keyed on the existing `HeadingKey` so the rail and the section
headings can't drift:

```ts
export const SECTIONS = [
  { id: 'projects',  label: 'Projects'  },
  { id: 'skills',    label: 'Skills'    },
  { id: 'listening', label: 'Listening' },
  { id: 'reading',   label: 'Reading'   },
  { id: 'gaming',    label: 'Gaming'    },
  { id: 'health',    label: 'Health'    },
  { id: 'contact',   label: 'Contact'   },
] as const satisfies readonly { id: HeadingKey; label: string }[];

/** `#projects` on the home route, `/#projects` from anywhere else. */
export function sectionHref(pathname: string, id: HeadingKey): string {
  return pathname === '/' ? `#${id}` : `/#${id}`;
}
```

`sections.ts` also exports the section icons, and **both the rail and the footer nav render from
this one list via `sectionHref`**, so the two navs can't disagree.

Rail composition, top to bottom: back-to-top (only once the hero is scrolled past) · the seven
section links · a divider · the theme toggle · the palette toggle. **Rendered on both routes**;
the section links become cross-route anchors on `/privacy`.

- `<nav aria-label="Sections">` wrapping a `<ul>`; the toggles sit **inside** the nav column but
  outside the list, keeping their existing `<button>` semantics, `aria-label`s and `aria-pressed`
  (palette) untouched.
- **Labels:** `aria-label` stays plain English (`Projects`), matching the copy.ts discipline of
  keeping aria-labels out of dialect. The **visible** hover pill reuses `heading(palette, id)` —
  so it reads `// Projects`, or `// Summat Ah med` when the rose is lit. Reuse the toggle's
  existing pill markup/classes verbatim, including the `group-focus-visible:` reveal so the label
  is available to keyboard users, not just hover.
- Tile styling reuses the already-defined recess tokens: `size-10 rounded-full place-items-center
  text-muted hover:bg-control-hover hover:text-accent-start` plus the site-standard
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start`.
- **Target size:** each tile must clear 24×24 CSS px minimum (WCAG 2.5.8) — `size-10` gives 40px,
  comfortably.
- Motion: the active marker uses the existing `motion-reduce:` escape hatch.
- **No duplicate controls in the a11y tree:** rail is `hidden lg:flex`, mobile bar is `lg:hidden`.
  `display: none` removes the hidden one from the accessibility tree, so the toggles exist exactly
  once at every size on every route. This is a real risk given they currently live in two page
  headers.
- **Back-to-top appears on scroll**, which means it changes the DOM after hydration — mount it
  client-side only (or render it hidden and toggle a class) so prerendered HTML and the pre-scroll
  client state agree.

### 6. `src/components/ProfilePanel.tsx` — home route only

Content, all from existing sources:

| Element | Source |
| --- | --- |
| Portrait | `PortraitFigure` (LCP element) |
| Status strip | new `StatusStrip`, reusing `currentlyBuilding(useGitHubData())` + `relativeTime` |
| Name / role | `SITE.name`, `SITE.hero.microcopy` |
| Blurb | `copy(palette).hero.subheadline` |
| CTAs | `copy(palette).hero.viewWork` → `#projects`; `copy(palette).hero.getInTouch` → `#contact`; `SITE.resumeUrl` → "Download CV" |
| Socials | `GitHubIcon`, `LinkedInIcon` + the runtime-assembled email |

- **Desktop:** panel card, portrait filling the upper area, identity + blurb + CTA row + social
  row anchored to the bottom; the status strip rotated 90° down the left edge (the reference's
  "Available for Work" slot) with the pulsing `_` dot. Card surface follows the existing card
  treatment — `bg-background/70 backdrop-blur-sm` — so the topographic field still reads behind it
  and it matches `ProjectCard`.
- **Tablet:** identity, blurb, CTAs, socials and the toggles; portrait and status strip hidden via
  `md:hidden lg:block` (shown at base, hidden at md, re-shown at lg).
- **Mobile:** the block opens the page — portrait, identity, blurb, CTAs; the sticky `MobileBar`
  above it carries the status chip and the toggles.
- **Semantics:** the panel is an `<aside aria-labelledby>` pointing at its own visible label. It is
  **not** a `<header>` (that would make it a page-level `banner` landmark) and its name line is
  **not a heading** — the page keeps exactly one `<h1>`, which is the hero (`/`) or "Privacy"
  (`/privacy`). A second `<h1>` or a wrong-level heading in the panel would break the document
  outline for screen readers and crawlers alike.
- **Portrait: keep the existing screenprint cut-out** (confirmed) — scaled up and seated in the
  panel, keeping the halftone `::after` and accent offset `::before` treatments and the halftone
  over the contour field. No new asset; the untracked `portrait-original.jpg` /
  `profile-screenprint.png` are not used by this plan.
- The hero's pointer-parallax effect and the `--portrait-x/--portrait-y` plumbing move with the
  portrait, or (recommended) get **dropped**: it existed to make the small floated cut-out feel
  alive, and the panel is a different context. If kept, it must stay effect-only to remain
  prerender-safe.
- **Retained alt text** on the portrait; the status strip's rotated text is real text, not an
  image, and its pulsing dot stays `aria-hidden`.
- Because the panel only mounts on `/`, the LCP element is now **route-dependent** — see §9.

### 7. Hero = the first screen

`src/components/Hero.tsx` becomes a full-height composition:

- `min-h-dvh` (works in every tier: full viewport on mobile, exactly the pane viewport on desktop,
  since the pane is `h-dvh`).
- Keeps: microcopy eyebrow, the `FlipWord` split-flap role headline, subheadline, the two CTAs.
  **Removes:** `PortraitFigure` (→ panel), the GitHub/LinkedIn links (→ panel), the pointer
  parallax.
- Headline scale: `text-display font-extrabold`. Adopt the reference's highlight device — one
  headline word inside an accent-filled rounded box using the already AA-verified `bg-accent-start`
  + `text-background` pairing. In monospace at display size this is the "bigger bolder" hook, and
  costs nothing new.
- The role headline already carries an `sr-only` span with the readable role and the `FlipWord`
  board is `aria-hidden` — **keep that**: the animated board must never be the only source of the
  page's name/role text. It also means the prerendered HTML carries a real, crawlable sentence.
- The role rotation is a `setInterval` in an effect, so the prerendered HTML shows the first role
  and hydration agrees — no mismatch.
- Bottom of the screen carries a restrained scroll affordance (`// scroll` mono label and/or
  chevron), because the first screen is now a plateau with no hint that content continues. Genuine
  UX need created by the layout, not decoration. It's decorative UI, so `aria-hidden`.
- **Gotcha:** `.flip-role` derives its cell width from `--slot-w: calc(1ch - 0.025em)`,
  hard-coupled to the h1's `tracking-tight` (`index.css:371`). If the display class changes
  tracking, `--slot-w` must change with it or the flipped letters drift out of rhythm with the
  static "I'm a". Keep `tracking-tight` on the h1, or tokenise both from one value.

### 8. Type scale

Add to the `@theme` block in `src/index.css` (Tailwind v4 emits these as real utilities, including
the co-located line-height/tracking/weight):

```css
--text-display: clamp(2.5rem, 6.5vw, 6rem);
--text-display--line-height: 0.95;
--text-display--letter-spacing: -0.03em;
--text-display--font-weight: 800;

--text-title: clamp(1.75rem, 3.5vw, 3rem);
--text-title--line-height: 1.05;
--text-title--letter-spacing: -0.02em;
--text-title--font-weight: 700;
```

- Load the heavier weights: `index.html:98` → `jetbrains-mono:400,500,700,800`. Without this,
  `font-extrabold` renders as **synthetic** bold and will look wrong.
- `SectionHeading` (`text-sm uppercase tracking-wider text-muted`) becomes `text-title` in
  `text-foreground` with the `//` prefix kept — one edit raises every section's presence, and it's
  the cheapest part of "bigger bolder".
- Body prose keeps its current size; the contrast is the point.
- Use `clamp()` throughout so the display type scales with the viewport instead of stepping — this
  is also what keeps 320px and 400% zoom reflow-safe (WCAG 1.4.10).

### 9. Fixes forced by the split

- **`Reading.tsx` horizontal overflow.** The bookshelf breaks out with `w-[min(72rem,100vw-3rem)]`
  + `left-1/2 -translate-x-1/2`. Inside a scroll pane `100vw` is the **viewport**, not the pane, so
  this overflows horizontally. It must become pane-relative (a percentage of the pane, or a
  container query — `.bookshelf` already sets `container-type: inline-size`). The section is
  otherwise untouched this pass, so this is a bug fix, not a restyle. Horizontal overflow also
  breaks the zoom/reflow requirement, so it's an a11y fix as much as a visual one.
- **`index.html` portrait preload** (`imagesizes="(min-width: 1024px) 30vw, 70vw"`) and the matching
  `sizes` in `PortraitFigure.tsx` both assume a 30vw in-hero portrait. The panel is a fixed width,
  so these become something like `(min-width: 1024px) 23rem, (min-width: 768px) 1px, 80vw` —
  otherwise the LCP element downloads the wrong variant, hurting LCP. **Prerendering resolves the
  awkward part of this**: once each route has its own HTML file, the preload lives only in the home
  document and `/privacy` simply doesn't ship it. Until then the shared `index.html` preloads a
  panel image on a page with no panel — a small, measurable waste, not a correctness bug.
- Delete the now-dead `.topo-drift` / `@keyframes topo-drift` (`index.css:240–258`): nothing has
  consumed them since the background became a canvas.
- Retire `.hero-with-portrait`, `.portrait-art`, `.portrait-picture` (`index.css:428–513`) into the
  new panel classes, keeping the halftone and accent-offset treatments.

### 10. Prerender-safety constraints on this pass's components

Prerendering is committed, so writing these components SSR-safe now is cheap; retrofitting later is
not. Applies to every component built in this plan:

- **No `window`/`document`/`localStorage`/`matchMedia` access in a render body or at module scope.**
  Effects only. `TopographicBackground` (already reads `matchMedia` at body scope) and the Health
  watch's live clock are the pre-existing offenders and will need a client-only boundary; the new
  components must not add more.
- **Hydration must match.** Real hazards in the existing code that prerendering will expose:
  - `PaletteToggle` renders `aria-pressed` from context, and `ThemeContext`'s initial state is
    derived from `localStorage` — the server renders the default while the client's first render may
    already know the stored `yorkshire` value, so the markup differs. Same class of problem for
    `ThemeToggle`'s icon. Fix by rendering the toggles' *state* client-side only (or
    `suppressHydrationWarning` on the two attributes), not by dropping the static markup.
  - `CurrentlyBuildingChip`/`StatusStrip` render `null` until the fetch resolves — that's fine
    (server renders the same null), but `relativeTime` output depends on "now", so the timestamps
    must not be baked into the prerendered HTML.
  - `Footer` calls `new Date().getFullYear()` — stable enough per build, but it bakes the build
    year into static HTML.
- **Client-only boundary:** a tiny `useIsMounted`/`<ClientOnly>` wrapper is the lowest-risk
  mechanism (no dependency) for the canvas background, the visualizers and the watch's clock.

## Accessibility and SEO

These are acceptance criteria for each phase, not a later pass. The shell is where both are won or
lost, so most of it belongs in phases 2–5.

### Landmarks and heading order

- On `/`: one `<main>`, one `<nav aria-label="Sections">`, one `<aside>` (the panel), one
  `<footer>`. On `/privacy`: the same **minus the aside** — and the missing panel must not leave a
  gap in the landmark structure, so `PlainShell` is reviewed as its own page, not as "home with a
  bit missing".
- Exactly **one `<h1>` per route** (`/` → the hero; `/privacy` → "Privacy"). The profile panel's
  name line is a styled `<p>`, never a heading. `SectionHeading` is already `<h2>` and stays that
  way; nothing may introduce an `<h3>` before an `<h2>`.
- Decorative canvases stay `aria-hidden`.
- DOM order = visual order (`panel → main → rail`), so tab order runs panel CTAs → content → nav,
  which is the sensible sequence. Do not use CSS `order` to rearrange tiers in a way that desyncs
  focus order from reading order.

### Keyboard and focus

- Skip link first in the tab order on both routes, targeting the now-focusable `<main>`.
- Every rail tile, toggle, and panel CTA keeps a visible `focus-visible` ring using the site's
  existing outline convention; the rail's label pill reveals on `group-focus-visible:` too — a
  hover-only affordance is not acceptable.
- Rail tiles ≥24×24px (WCAG 2.5.8); they're links/buttons, never `div` + click handler.
- No keyboard trap: the pane is a scroll container, so verify Tab and arrow/PageDown scrolling both
  work and that focus can leave it — on `/privacy` as well, where the pane is wider.

### Contrast

- New display type and the highlight pill must clear 4.5:1 (body) / 3:1 (large text) in **both**
  themes and **both** palettes. The pill reuses the existing verified `accent-start` on
  `background` pairing; the rail's active tile adds a non-colour marker.
- **Watch the panel surface specifically.** It's `bg-background/70` + `backdrop-blur-sm` over a
  *drifting* ASCII canvas, so the effective background behind panel text is not constant. Check
  contrast against the worst-case glyph density and raise the panel's opacity if 70% doesn't hold.
  This is the one place the topo background could quietly fail WCAG.
- Re-verify the light theme: panel card, rail, and highlight pill all flip.

### Reflow, zoom and motion

- Content must survive 320px width and 400% zoom with no loss of content or function (WCAG 1.4.10)
  — the Reading breakout fix is required for this, and neither route may produce horizontal page
  scroll.
- `h-dvh` + `md:overflow-hidden` must not clip content at large text sizes / browser zoom; verify
  the panel and rail stay usable at 200% zoom, since their heights are now viewport bound. If the
  panel content can't fit, it scrolls rather than overlaps.
- No smooth scrolling, drift, role rotation, or marker animation under `prefers-reduced-motion` —
  reuse `useReducedMotion.ts` plus paired CSS media queries, the two mechanisms the codebase already
  uses everywhere.

### SEO and crawlability

**Requirement: all content is crawlable and readable with JavaScript disabled.** That is the bar,
and it's why prerendering is committed rather than deferred. Concretely:

1. **Prerender both routes to static HTML (committed — follow-up plan #1).** Approach: an
   SSG-capable build (`vite-react-ssg` is the natural fit for react-router v8) or a build-time
   `renderToString` pass, emitting `/index.html` and `/privacy/index.html` with real markup. The
   data-driven sections can render their real content at build time by importing the already-baked
   `public/data/*.json` (GitHub, Spotify top/audiobooks, gaming, health) rather than fetching — so
   Projects, Skills, Reading, Gaming and Health become static HTML too. Only `/api/now-playing`
   stays client-side as progressive enhancement. `vercel.json`'s catch-all rewrite to
   `/index.html` must be re-checked so the prerendered `/privacy/index.html` isn't shadowed.
2. **Per-route document head, in the static HTML.** Today both routes share one head, so
   `/privacy` ships the home title, description and `canonical` — a genuine duplicate-canonical
   problem. With prerendering, each route emits its own `<title>`, description and `canonical` at
   build time, which is what the no-JS crawler sees. Additionally add `src/lib/useDocumentMeta.ts`
   (no dependency) so **client-side** navigation between routes updates the head too — the SPA
   transition otherwise leaves the previous route's title in place. Keep `index.html`'s OG/Twitter
   copy in step with the hero subheadline, and keep the JSON-LD `Person` accurate to whatever role
   the panel states.
3. **A crawlable nav at every tier, present in the static HTML.** The rail is desktop-only, so
   below `lg` there's no nav landmark at all. Add a `<nav aria-label="Sections">` in the `Footer`
   rendering the same `SECTIONS` list through `sectionHref` — every tier gets a real nav, the site
   gains internal links, and it costs one small component. The rail's absence on mobile becomes a
   progressive enhancement rather than a gap. Because the rail is `hidden lg:flex` and the mobile
   bar is `lg:hidden`, **the links themselves are hidden from the prerendered crawler at desktop
   widths** — this is exactly why the footer nav must exist as real anchors.
4. **Verify with JS off.** Load `/` and `/privacy` with JavaScript disabled and confirm the hero,
   headings, all sections' content, the footer nav and the privacy article are readable, that
   internal links work, and that nothing important is `display: none` at that viewport. This is a
   recurring check on every phase, not a one-off at the end.

**Also avoid:** CLS from the new fixed regions. Give the panel and rail stable widths (the grid
does) and confirm the shell doesn't shift as the pane's content mounts — and that switching between
the two shell variants doesn't shift the layout, since Core Web Vitals covers the whole page.

## Files

**New**

| File | Purpose |
| --- | --- |
| `src/components/ShellFrame.tsx` | The shared frame: grid, pane ref, skip link, mobile bar, rail, scroll reset |
| `src/components/PanelShell.tsx` | Layout route element: `<ShellFrame panel={<ProfilePanel />} />` |
| `src/components/PlainShell.tsx` | Layout route element: `<ShellFrame />` (no panel) |
| `src/components/ProfilePanel.tsx` | Three-tier profile panel (home only) |
| `src/components/StatusStrip.tsx` | Rotated "currently building" strip (reuses `currentlyBuilding`) |
| `src/components/SectionRail.tsx` | `nav` + section links + toggles + back-to-top (both routes) |
| `src/components/MobileBar.tsx` | Sticky `<md` bar carrying status chip + toggles |
| `src/components/FooterNav.tsx` | Crawlable section nav for every tier |
| `src/components/ClientOnly.tsx` | No-dependency mount guard for canvas/clock client-only UI |
| `src/content/sections.ts` | Section ids/labels/icons + `sectionHref` |
| `src/lib/useActiveSection.ts` | Pane-aware active-section tracking |
| `src/lib/useDocumentMeta.ts` | Client-side per-route title/description/canonical |

**Changed**

| File | Change |
| --- | --- |
| `src/App.tsx` | Two layout routes (`PanelShell` for `/`, `PlainShell` for `/privacy`) |
| `src/pages/Home.tsx` | Drop header/skip link/width wrappers; one container for sections |
| `src/pages/Privacy.tsx` | Drop its header toggles; keep the content-level back link; own reading width and document meta |
| `src/components/Hero.tsx` | Full-height first screen; remove portrait, socials, parallax |
| `src/components/SectionHeading.tsx` | `text-title` |
| `src/components/Footer.tsx` | Add `FooterNav` |
| `src/components/icons.tsx` | Rail icons: arrow-up, projects, skills, music, book, gamepad, heart-pulse, mail |
| `src/components/Reading.tsx` | Pane-relative bookshelf breakout |
| `src/index.css` | Shell/panel/rail/pane classes (+ `--shell-cols` variants); `@theme` type tokens; delete `.topo-drift`, `.hero-with-portrait`, `.portrait-*` |
| `index.html` | Font weights 700/800; portrait preload `imagesizes`; meta copy kept in step |

**Untouched by design:** all `src/data/*`, `api/`, `scripts/`, the theme context, and every
section's internals. (`TopographicBackground.tsx` is untouched except for the client-only boundary
it will need under prerendering.)

## Phases

Each phase is independently reviewable, and each carries its own a11y/SEO acceptance checks. 1–2
are prerequisites for the rest. **Every phase must leave the tree prerender-ready** — no `window`
in render bodies, no new hydration mismatches.

1. **Type foundation.** `@theme` tokens, font weights in `index.html`, `SectionHeading` bump.
   Visible immediately, zero structural risk. Verify contrast in both themes and both palettes, and
   that the FlipWord board still aligns.
2. **Shell — both variants.** `ShellFrame` + `PanelShell`/`PlainShell` + the two layout routes + the
   three tiers + pane scroll + scroll reset. Sections render inside unchanged, and the panel slot is
   stubbed so the no-panel variant can be reviewed properly from the start. Verify landmarks on both
   routes, one-`h1` rule, no double scrollbar, no horizontal overflow, keyboard scroll, 200% zoom,
   and that privacy's prose has a sane reading width.
3. **Panel.** `ProfilePanel` + `StatusStrip`, portrait move, `index.html` preload and
   `PortraitFigure` sizes, retire the hero portrait CSS. Verify panel contrast over the drifting
   canvas, that the panel introduces no heading, and that the LCP preload doesn't hurt `/privacy`.
4. **Rail and nav.** `SectionRail` + `useActiveSection` + new icons + `FooterNav`; toggles move off
   the page headers into the rail and mobile bar. Verify no duplicate controls in the a11y tree **on
   both routes**, focus-visible pills, `aria-current`, target sizes, and that the rail is correct
   (and inactive) on `/privacy`.
5. **Hero.** Full-height first screen, highlight word, scroll affordance, remove the parallax.
   Verify the `sr-only` role text survives and the board stays `aria-hidden`.
6. **Head, client-only boundaries and cleanup.** `useDocumentMeta` for both routes; `ClientOnly`
   around the canvas/clock; `Reading` breakout fix; delete dead CSS; cross-route anchor
   verification; full keyboard + VoiceOver pass; **JS-disabled pass on both routes**; Lighthouse
   a11y/SEO/perf; confirm no CLS.

## Verification

- `npm run build && npm run lint` clean.
- **≥1024px:** panel and rail stationary while only the pane scrolls; no second scrollbar; rail
  marks the active section and updates as you scroll and as late-loading sections appear; each rail
  link jumps to its section; back-to-top appears only after screen one; skip link moves focus into
  `<main>`.
- **768–1023px:** condensed panel with no portrait on `/`, no rail, pane still the scroller, toggles
  present in the panel (home) / mobile bar, `FooterNav` provides the nav.
- **<768px:** one document scroll only, profile block opens the home page, sticky bar toggles work,
  **no horizontal overflow anywhere** (especially Reading).
- Hero fills exactly one screen at every tier; Projects begins below the fold.
- **`/privacy`:** renders in `PlainShell` with **no panel**, rail present and functional, no
  duplicate toggles, its own title/description/canonical, pane scroll reset on navigation, a
  content-level back link, and the rail's `/#…` anchors navigating home correctly to the right
  section.
- Light theme **and** Yorkshire palette checked in all three tiers, on both routes.
- **Keyboard-only pass:** skip link → pane content → rail, visible focus throughout, no trap.
- **VoiceOver pass:** landmarks announced, active section reported, animated board silent, readable
  role announced.
- **Contrast:** highlight pill, active rail tile, and panel text over the drifting canvas all
  checked at 4.5:1/3:1 in every theme × palette combination.
- `prefers-reduced-motion`: no smooth scroll, no drift, rotation stopped, no marker animation.
- **Zoom/reflow:** 400% zoom and 320px width with no lost content and no horizontal scroll, on both
  routes.
- **JavaScript disabled:** both routes readable, all section content present, footer nav and
  internal links working, nothing critical hidden. Re-run this on each phase, and again after
  prerendering lands.
- **No hydration warnings** in the console on either route under the prerendered build.
- **Lighthouse** (mobile + desktop): a11y, SEO and best-practices not regressed; confirm LCP still
  preloads the right portrait variant on `/` and that no new CLS is introduced.

## Follow-up plans (in order, written when we get there)

1. **Prerendering / SSG — committed, and first.** Emit real HTML for `/` and `/privacy`; render the
   data-driven sections from the baked `public/data/*.json` at build time; per-route static head;
   re-check the `vercel.json` rewrite; add the `ClientOnly` boundaries and fix the hydration hazards
   listed in §10. Landing this before the section restyles means every restyle can assume its output
   is static HTML, instead of being re-verified afterwards.

Then, one plan per section. Each keeps its current internals for now, and each follow-up should
cover: enlarged `text-title` heading in the new scale, the pane's real content width (no more
`max-w-4xl`/`max-w-6xl` split), reduced chrome, a full-bleed option, its own a11y and reduced-motion
verification, and — now a hard requirement — **its content present in the prerendered HTML with a
sensible no-JS reading order**:

2. **Projects** — the first content screen, so it carries the most weight.
3. **Skills** — the GitHub language bar is the weakest element; likely absorbed.
4. **Listening** — the tape deck needs a width decision in the narrower pane; the one section where
   live data is genuinely interactive.
5. **Reading** — bookshelf sizing against the pane, plus the breakout fix above.
6. **Gaming** — CRT/case scale, and whether the interactive power/dial controls need a static
   fallback.
7. **Health** — watch scale; the `@media (max-width: 400px)` override needs revisiting; the live
   clock becomes client-only.
8. **Contact + Footer** — merge into a closing screen now the panel holds the CTAs, and fold in
   `FooterNav`.

## Additions beyond this plan (agreed in review, shipped alongside)

Requested after the plan was approved, so recorded here rather than left out of the doc the PR
references. All are in `main` with the shell work; none change the architecture above.

- **Column ratio.** Panel is `1fr` against a `2fr` pane (`minmax(0, 1fr) minmax(0, 2fr)`), plus the
  fixed rail strip at `lg`. Uncapped, so an ultrawide display grows the panel with the viewport —
  revisit with `min(33.333%, 30rem)` if that reads wrong.
- **OS map legend** (`MapLegend`, in the footer colophon). Real map furniture for the background
  dataset: segmented km scale bar, extent, grid resolution, sheet, relief range, and the OGL
  attribution the licence requires. Values come from `src/content/topography.ts`, derived from the
  bake script's window and the grid JSON's own metadata — never invented. Deliberately describes the
  *dataset*, not the pixels, because the background drifts and positional annotations would lie.
- **Elevation-ramp section rule** (`SectionRule`, rendered by `SectionHeading`). The canvas's own
  glyph ramp, mirrored into a profile, quoted back as the rule above each section.
- **Asset readout** (`AssetReadout` in the footer colophon). Lists what the page really fetched, with
  timings, via a new `src/lib/assets.ts` registry. Native `<details>` so it's keyboard-operable for
  free; renders nothing before the first request.
- **Shared fetch cache.** `fetchAsset`/`loadAsset`/`useAsset` in `src/lib/assets.ts`. `useGitHubData`
  was being called from four components, so `github.json` was fetched four times; all four baked
  snapshots now go through one shared promise per name. This is what makes the readout honest.
- **Build stamp** (`BuildStamp` in the footer). `v<version> · <sha> · <date>`, injected by the
  `define` block in `vite.config.ts` and declared in `src/vite-env.d.ts`.
- **Skills as a taxonomy** (`Skills`). Groups are nodes; tools hang off a dotted connector with
  diamond markers. Still a plain nested list underneath, so it stays navigable and crawlable.
- **Big-number stats** (`ProjectStats`, in Projects). Derived figures only — contribution count from
  the snapshot, project count from the grid, award count summed from the work projects. Rendered as
  `dt` then `dd` with `flex-col-reverse`, so the DOM order stays valid while the number reads first.
- **Base64 easter egg** (footer). Decodes to a Yorkshire line; `aria-hidden` and kept out of the
  visible text content deliberately, so a crawler indexes prose rather than encoded noise.
- **Activity chip.** Moved three times in review: the rotated vertical status strip from §6 was dropped, the
  chip left the social row, and it is now the **first line of the hero at lg**, and the **first line of
  the page below lg** (the shell renders it on its own row above the panel, so it sits above the
  headshot). `StatusStrip.tsx` is deleted; it keeps its original minimal style (pulsing underscore,
  `building`, repo, relative time).
  It is placed *after* the `h1` in the DOM but absolutely positioned, so it reads after the heading to
  a screen reader while sitting above it visually — the one place where visual and reading order
  deliberately differ, and the two focusable groups it involves (the chip, then the CTAs) still run
  top-to-bottom either way. Note `order` alone is not enough: the hero centres its content, so an
  ordered item lands mid-screen.
  **Gotcha worth remembering:** each mount point gates visibility on a *wrapper*. Putting `hidden` on
  the chip itself does not work — its class list sets `inline-flex`, and Tailwind emits `.inline-flex`
  after `.hidden`, so the chip's own display class wins and it renders twice on small screens. That
  bug shipped and was caught in review. `npm run probe:ssr` now asserts both wrappers exist.
  Consequence: `/privacy` has no hero and no panel, but the shell row is route-agnostic, so it does
  show the chip below lg — and never at lg. At very short viewports the pinned chip and the centred
  hero block can crowd each other, same caveat as the `// scroll` cue at the other end.
- **Two tiers, not three.** §2's condensed tablet tier was dropped in review: below `lg` the shell is a
  single column (top bar, chip, panel, content all stacked, document scroll) and from `lg` it becomes
  the three-column sheet. A tablet now gets the phone arrangement. Consequences:
  - The profile panel's card treatment and its "fill the row" behaviour moved from `md:` to `lg:`, and
    the portrait is no longer conditionally hidden — there's no narrow in-between column to drop it in.
  - `useActiveSection`'s scroll-ownership query moved from `(min-width: 48rem)` to `(min-width: 64rem)`.
    This is load-bearing: the shell switches to an inner scroll container at `lg`, so leaving the query
    at `md` would have measured the wrong element on every tablet.
  - The `grid-template-rows: auto auto minmax(0,1fr)` scaffolding for the bar/chip rows is gone — those
    are hidden at `lg` anyway, so no row spanning is needed.
- **The document owns the scrollbar at every width.** §1 had the pane as an inner scroll container from
  `md` up; in review that was wrong — with three columns it put the scrollbar in the middle of the
  layout, beside the content column, instead of at the window edge. The shell now lays the columns out
  but scrolls nothing: `.shell` has no height or overflow, the panel and rail are
  `position: sticky; top: 0; height: 100dvh`, and the page scrolls as a whole.
  What this simplified, because the pane stopped being a scroller anywhere:
  - `useActiveSection` lost its `paneRef` argument, its breakpoint branch and its listener re-binding.
    It measures the viewport and listens on `window`, full stop.
  - `BackToTopButton` lost its `paneRef` and is now just `window.scrollTo`.
  - `ShellFrame` no longer holds a ref at all, and `.pane`'s `overflow-y`, `overscroll-behavior` and
    `scroll-behavior` rules are gone. Smooth anchor scrolling is still there — `ShellFrame` passes the
    behaviour to `scrollIntoView` explicitly, so reduced motion is honoured without a CSS rule.
  Caveat: the panel keeps `height: 100dvh; overflow-y: auto` so a tall panel still reaches its own
  bottom. On a short window that gives the panel an internal scrollbar — the one scrollbar left inside
  the chrome, and only when its content genuinely can't fit.
- **Projects grid: two across from `md`, and two is the ceiling** — no three-across anywhere. The single
  breakpoint works at both tiers because the pane's width changes with the layout: full width below `lg`
  (~348px cards at md), two thirds of the sheet above it (~285px cards).
- **Known inversion, not yet fixed:** below `lg` the pane is *wider* than at `lg` (full width, rather
  than two thirds of it minus the rail). Every section using viewport breakpoints therefore gets more
  columns where there is less room. `Skills` (`md:grid-cols-2 lg:grid-cols-3`) is the clearest case —
  two sparse columns on a full-width tablet, three tight ~182px columns at `lg` — and `Reading`'s
  `md:flex` bookshelf has the same shape. The right fix is a container query on the section so it
  responds to the pane rather than the viewport; worth doing in the per-section passes.
- **Section nav moved to the top below `lg`.** The rail's links become a horizontal icon strip in the
  pane bar, so the same nav is reachable on phones and tablets instead of only from the footer. Both
  navs now render from one component (`SectionNavLinks`), which owns the ordering, `aria-current` and
  the active marker, so they can't drift apart.
  Two details this forced:
  - `useActiveSection` moved up into `ShellFrame`, which hands `active`/`scrolled` to both navs. Two
    observers watching the same pane would have been two sources of truth.
  - The horizontal strip is a scroll container, so an absolutely positioned hover pill would be
    clipped by it. The top bar's tiles therefore carry their names as sr-only text only, and the
    footer's text nav stays as the nav a sighted touch user can read — renamed `"Section index"` so
    it isn't a second landmark sharing the name of the one now visible at the same widths.

## Parked: the glasses

Two attempts at giving the portrait's eyes some life, both reverted and shelved. Recorded so a third
start doesn't begin from zero.

- **Painted eyelids** (4d1fe3e, reverted). Ellipses over the eyes, faded in for 130ms on randomised
  4–9s gaps. Rejected: a flat shape over a photograph reads as a shape rather than an eyelid, and it
  has to cross the glasses frame to reach the eye.
- **A second image** (f933594, reverted). The animation was good — a closed-eye frame generated from
  the photo by cloning nearby skin, so the glasses survived intact — but the marks never landed
  reliably, and at 640px it read as eyes *absent* rather than eyes closed.
- **Next idea, also parked:** a reflection in the lenses that follows the page scroll, on desktop
  only. Not started.

**Measurements, as percentages of `public/images/portrait-cutout-960.webp` (960×1129).** His head is
turned, so everything sits well right of where a frontal portrait would put it — the left eye is past
the halfway mark, near the bridge rather than in the outer half of its lens.

| | x | y | w | h |
| --- | --- | --- | --- | --- |
| left iris | 49.9 | 38.8 | | |
| right iris | 70.1 | 38.0 | | |
| left lens glass | 33.5 | 35.5 | 18.5 | 11.5 |
| right lens glass | 62.5 | 34.5 | 13.0 | 9.5 |

Method note, because it cost two false starts: measure at **3–5× with a 2% grid**, or from pixel
luminance (threshold inside each lens so the very dark frames can't dominate). A 1× overlay looks
plausible while being several percent out — the first estimate put the left lid at 34.5% when the eye
is at 50%.
