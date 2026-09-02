# Plan: include forks that carry a `.portfolio.json`

## Problem

The GitHub bake (`scripts/fetch-github.mjs`) excludes all forks from the
projects list — GraphQL hard-filters `isFork: false` (line 104) and the REST
fallback does `.filter((r) => !r.fork)` (line 243). So `jonnyhaynes/cmux-sentinel`
(a fork) never appears on the site, even though it's real, diverged work.

We don't want *every* fork in — most are throwaway. The signal for "I mean this
one" is an explicit **`.portfolio.json` at the fork's repo root** (the same file
we already read for `pitch`/`challenge`). A fork with that file is opted in; a
fork without it stays excluded.

## Decision (approved)

**Compete on recency.** A fork with a `.portfolio.json` joins the same candidate
pool as owned repos and is sorted by `pushedAt` desc; the top 6 win. No reserved
slot. Consequence: `cmux-sentinel` (last push 2026-08-24) will not appear until
it's pushed more recently than the current 6th project. Adding the
`.portfolio.json` file is itself a push, which should bump it.

## Approach

### GraphQL path (`fetchViaGraphQL`)

1. Add a second repo collection to the query alongside `repositories`: fetch
   forks with `isForkable`/`isFork: true` — i.e. a `forks` block using
   `ownerAffiliations: OWNER`, `isFork: true`, `privacy: PUBLIC`,
   `orderBy: PUSHED_AT desc`, `first: 25` (small cap — we only need recent
   candidates), selecting the **same node fields** as owned repos so
   `mapProjectNode` works unchanged.
2. After mapping, probe each fork's `.portfolio.json` in parallel using the
   existing `fetchPortfolioMeta(repo)` helper. Keep only forks where it returns
   non-null. Reuse the returned `pitch`/`challenge` (avoids a second fetch in
   `enrichWithPortfolioMeta`).
3. Tag kept forks with `isFork: true` on the project node (owned repos get
   `isFork: false`). No UI consumes this yet — it's there so the UI *can* badge
   forks later without a re-bake schema change.
4. Merge: `candidates = [...ownedProjects, ...keptForks]`, sort by `pushedAt`
   desc, `slice(0, 6)`. Run `enrichWithPortfolioMeta` only on owned projects
   (forks are already enriched from step 2) — or run it on the merged set but
   have it no-op when `pitch`/`challenge` already set. Simplest: enrich owned
   only, keep forks' metadata from step 2.
5. `lastActivity` / "Currently building" logic is unchanged — it already
   considers forks via a separate activity list. No change needed there.

### REST fallback (`fetchViaREST`)

Mirror the rule so tokenless runs behave the same:

1. Stop hard-excluding forks. Split `all` into `sourceRepos` (non-fork) and
   `forkRepos` (fork, non-private).
2. For each fork, call `fetchPortfolioMeta(r.name)`; keep only those with a
   non-null result. Map kept forks to the project shape with `isFork: true`.
3. Merge with `sourceRepos`-derived projects, sort by `pushedAt` desc,
   `slice(0, 6)`.
4. Language breakdown stays owned-repos-only (forks' languages aren't "my"
   language footprint) — leave `languageBreakdown(sourceRepos.map(...))` as is.

### Node shape change

`mapProjectNode` and the REST project object gain one field: `isFork: boolean`.
Defaults to `false` for owned repos. Additive — existing consumers ignore it.

## Out of scope

- No UI change. A fork badge in the projects section is a possible follow-up;
  this plan only makes the data available.
- No reserved slot / forced inclusion (explicitly decided against).
- Language breakdown unchanged.

## Verification

1. `node scripts/fetch-github.mjs` with `GITHUB_TOKEN` set locally → inspect
   `public/data/github.json`. Confirm no regression to the 6 owned projects and
   that `isFork` appears on nodes.
2. Add a `.portfolio.json` to `jonnyhaynes/cmux-sentinel` (separate action, in
   that repo). Re-run the bake → confirm `cmux-sentinel` now competes and, given
   the fresh push, appears in the top 6.
3. `npm run build` + `npm run lint` clean.
4. Tokenless dry-run (`unset GITHUB_TOKEN`) → REST path still produces valid
   JSON and applies the same fork rule.

## PR

- Branch `feat/forks-with-portfolio-json`, `[ai-assisted]` title, reference this
  plan, `Manually reviewed by <name>` line, `Co-Authored-By` trailer.
- Human reviews + merges once CI green.
