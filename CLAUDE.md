# Claude Code context for jonnyhaynes.co.uk

This file orients Claude Code on this repo. Keep it lean -- it points, it doesn't
explain. Substantive design and rationale live in `/docs`; read those before any
non-trivial change. A bloated CLAUDE.md is a smell: if a section wants more than a
few lines, move it to its own doc under `/docs` and link it.

## What this is

Jonny Haynes's personal website — a React + Vite + TypeScript SPA.

See `README.md` for status and `docs/dev-workflow.md` for how we build here.

## Stack

**React 19 + Vite 8 + TypeScript** SPA, `npm` for packages. Routing via
`react-router` 7. Strict TypeScript (avoid `any`). Deployed on Vercel.

- `npm run dev` — Vite dev server
- `npm run build` — `tsc && vite build` (type-check is part of the build)
- `npm run lint` — ESLint (flat config, `eslint.config.js`)

No test runner or Prettier config yet — `build` + `lint` are the checks. Styling is
plain CSS in `src/app.css` (CSS custom properties, layers, `@keyframes`); no CSS
framework.

## Load-bearing principles

These shape the code. Don't change them without a deliberate, flagged decision.

- **Secrets stay server-side.** API tokens (GitHub, Spotify, Fitbit) live in Vercel
  env vars / GitHub Actions secrets and never reach the client bundle. Live data is
  fetched via server functions; most data is baked to static JSON by a scheduled job.
  See `docs/about-page-plan.md`.
- **Graceful degradation.** Data-driven sections must render fine when their JSON is
  missing or stale — an API being down can never break the page.
- **No new styling framework.** Match the existing CSS conventions in `src/app.css`
  (custom properties, `@layer`, grid/flex, `prefers-reduced-motion`).
- **Accessibility & reduced motion.** Animations respect `prefers-reduced-motion`;
  keep focus-visible outlines and readable minimum font sizes (`clamp()`).

## Scope boundaries

What this project is **not**, and shouldn't drift towards. If a request would drift
here, push back before building.

- It's a **personal portfolio site**, not a web app or product — no auth, no user
  accounts, no database, no backend beyond small read-only data-baking jobs.
- Not a blog/CMS — content is hand-authored in components, not managed.
- The health/music/GitHub sections are personality, not a dashboard product. Keep
  them light; don't build a general-purpose analytics layer.

## How we work (the short version)

Full process: `docs/dev-workflow.md`. The non-negotiables:

- **Plan first.** For non-trivial work, produce an implementation plan saved to
  `docs/plans/<ticket>.md` and have a human approve it before writing code. The
  plan is what gets reviewed, not the first code.
- **A human reviews and merges every PR.** Claude opens the PR and gets CI green; a
  named person reviews the diff against the plan and merges. Claude never merges.
- **Never put secrets, credentials, or client data into the model.** If unsure,
  it's out of bounds until you've asked.
- **Mark AI-assisted work.** Prefix AI-assisted PR titles `[ai-assisted]`, reference
  the approved plan doc, and end the description with a `Manually reviewed by <name>`
  line. Keep the `Co-Authored-By` trailer on commits.

## Documents

Source of truth lives in `/docs`. Read the relevant doc before responding:

- `docs/dev-workflow.md` -- how we build (the loop + standing conventions)
- `docs/about-page-plan.md` -- implementation plan for the living About page
  (CV / GitHub / Spotify / Fitbit integrations); current in-flight work
- `docs/plans/` -- per-ticket implementation plans (plan-first)

## Working style

- Push back where appropriate rather than agreeing reflexively.
- When changing a load-bearing principle or scope boundary, flag it explicitly
  rather than slipping it in.
- Prefer pointing at a doc section over reproducing its content here.

## Raising pull requests

This project uses **GitHub**. Raise PRs with the `gh` CLI (or the REST API):

- Repo: `jonnyhaynes/jonnyhaynes-web` · Target branch: `main`.
- Push the branch (`git push -u origin <branch>`), then `gh pr create`.
- **Mark AI-assisted PRs:** prefix the title `[ai-assisted]` (or add an `ai-assisted`
  label), reference the approved plan doc (`docs/plans/<ticket>.md`) in the body, and
  end it with a `Manually reviewed by <name>` line confirming the diff was read.
- Keep the `Co-Authored-By` trailer on commits. **A human merges** once CI is green
  and the diff has been reviewed against the plan.
**Issue tracker: GitHub Issues.** One issue = one unit of work; acceptance criteria
are the test contract. Reference the issue in the branch name and PR, and close it from
the PR (`Closes #NN`) once merged.
