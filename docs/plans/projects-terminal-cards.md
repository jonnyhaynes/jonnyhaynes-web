# Plan: Projects section as an interactive terminal

Supersedes the earlier per-card "terminal reveal" design in this file's history.
The whole Projects section becomes one working shell.

## Goals

1. **Fork badge** — surface `isFork` (already baked) as a "fork" tag in listings.
2. **Top six, alphabetical** — bake seven, show six A–Z (case-insensitive), so
   the six survive `SELF_EXCLUDE` (which drops `jonnyhaynes-web`).
3. **Replace the card grid with a terminal** — `ls` lists projects, `cd <name>`
   opens one and prints its data, `open` launches its links. Collapses the
   section to one prompt line at rest; detail is on demand.
4. **Works for everyone, not just engineers** — the terminal is self-
   demonstrating and click-driven, with a semantic fallback for a11y + crawlers.

## Approved design decisions

- **Terminal-only** — the visible UI is the terminal; the cards are gone.
- **Driven by typing AND clicking** — real text input, plus every project name /
  command is a clickable chip; a quick-command bar for mobile.
- **Auto-demo on load** — types `ls` then `cd <project>` itself so a first-timer
  watches it work. Cancels on first interaction; skipped under reduced motion.
- **"Not into terminals? Just click the project names."** nudge in the heading.
- **Plain-English aliases** — "show projects" → ls, "open skillswap" → cd, "back"
  → cd .., "details" → cat, etc.
- **Did-you-mean** — Levenshtein-nearest suggestion for mistyped commands AND
  project names, offered as a clickable chip. Never a cold "command not found."
- **Command set:** `ls`, `cd <name>`, `cd ..`, `open [repo|live]`, `cat`/`info`,
  `clear`, `help`, `whoami`. History (↑/↓), tab-completion of project names.

## Non-negotiables (CLAUDE.md principles — flagged, not optional)

- **Semantic DOM fallback.** The six projects also render as a real, visually-
  hidden `<ul>` with name/pitch/stack/challenge/links, so screen readers and
  JS-rendering crawlers (incl. Googlebot) get the full content. The terminal is
  an enhancement layered over it. NOTE: this does not cover a JS-disabled client
  — the whole site is a client-rendered SPA, so with JS off nothing renders.
  True no-JS support (prerender/SSR) is tracked separately in issue #511.
- **Graceful degradation.** If `github.json` is absent, the terminal still boots
  and reports "projects unavailable"; the section never blanks or throws.
- **Accessibility.** Real `<input>` with a label; output in an `aria-live`
  region; the fallback list is the accessible source of truth; focus-visible
  rings; the whole thing keyboard-operable; blink/typing disabled under
  `prefers-reduced-motion`.
- **Theming across all 4 combos** (dark/light × default/yorkshire). All chrome
  from `--term-*` tokens flipped in the `[data-theme='light']` block; runnable/
  output text keys off `--color-accent-start` so Yorkshire recolours for free
  (same pattern as the LCD readout, `index.css:31-44` + `109-115`).

## Architecture

New directory `src/components/projects-terminal/`:

- **`ProjectsTerminal.tsx`** — the mounted terminal UI: title bar, scrollback
  screen (`aria-live="polite"`), prompt row with `<input>`, quick-command bar.
  Owns screen lines, `cwd`, and history state.
- **`useShell.ts`** — the command engine, framework-light and unit-testable in
  isolation: takes the project list + a `print` callback, exposes `run(raw)`.
  Houses alias rewriting, did-you-mean (small `levenshtein` helper), and each
  command. Keeping parsing out of the component keeps the view thin.
- **`AccessibleProjectList.tsx`** — the semantic, visually-hidden `<ul>` fallback
  (also what renders if JS is disabled / terminal fails to mount).
- **`projectsTerminal.css`** or additions to `index.css` — `--term-*` tokens +
  light overrides + `blink` keyframe, following existing conventions.

`Projects.tsx` becomes: heading + nudge, then `<AccessibleProjectList>` +
`<ProjectsTerminal>` (terminal visually on top; list `sr-only`). Uses
`featuredProjects(data)` (now six, alphabetical). Graceful empty state preserved.

### Data + bake (unchanged from prior plan)

- `scripts/fetch-github.mjs`: bake **7** (both GraphQL + REST slices `6`→`7`);
  update stale comments; re-run so `github.json` holds 7.
- `src/data/github.ts`: add `isFork: boolean` to `GitHubProject`;
  `featuredProjects(data, limit = 6)` = filter self-exclude → sort A–Z
  (`localeCompare`, `sensitivity: 'base'`) → slice 6. (These two are already
  done on this branch.)

## Behaviour details

- **Boot:** greeting line naming project count + "plain English works" + a
  `help` chip. Then auto-demo (see above). Auto-`ls` result stays on screen.
- **`cd <name>`:** sets cwd, prints a detail block (pitch / stack / hardest /
  links). Unknown name → did-you-mean nearest project.
- **`open`:** opens repo (default) or `live` in a new tab (`noreferrer`).
- **Bare project name** typed as a command → treated as `cd <name>`.
- **Unknown command:** did-you-mean nearest known command, else a friendly
  "click a project or type help" with chips.
- **Reduced motion:** no auto-typing, no cursor blink; commands print instantly.

## Out of scope

- No change to the "currently building" chip, language breakdown, or the fork-
  inclusion bake rule (shipped previously).
- No persistence of terminal state across reloads.
- Not a general filesystem sim — only the commands listed above.

## Verification

1. `node scripts/fetch-github.mjs` → 7 projects in `github.json`.
2. `npm run dev`:
   - Section shows the terminal; auto-demo runs then settles.
   - `ls` lists six A–Z; `cmux-sentinel` shows a fork tag.
   - `cd skillswap`, `open repo`, `cat`, `clear`, `help`, ↑/↓, tab-complete work.
   - Plain English: "show projects", "open skillswap", "back".
   - Did-you-mean: `cd skilswap`, `halp`.
   - All four theme × palette combos: chrome + accent recolour correctly.
   - Reduced motion (OS setting): no typing animation, everything reachable.
   - Keyboard-only: Tab to input, operate; fallback list present in DOM
     (inspect / disable JS → projects still listed with links).
3. `npm run build` (type-check) + `npm run lint` clean.

## PR

Branch `feat/projects-terminal-cards` (already created), `[ai-assisted]` title,
reference this plan, `Manually reviewed by <name>` line, `Co-Authored-By`
trailer. Human reviews + merges once CI green.
