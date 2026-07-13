/**
 * Which GitHub repos to feature in the Projects section, and in what order.
 * Names must match the GitHub repo name exactly. A repo listed here that isn't
 * in the fetched data is silently skipped.
 *
 * The per-project *content* — pitch and "Hardest Technical Challenge" — is NOT
 * here. Each repo carries its own `.portfolio.json` at its root:
 *
 *   { "pitch": "optional one-liner (else the GitHub About is used)",
 *     "challenge": "the hardest technical challenge, in your words" }
 *
 * The bake (scripts/fetch-github.mjs) reads it and merges it into the data, so
 * the story lives next to the code it describes.
 */
export const FEATURED_ORDER: string[] = [
  'skillswap',
  'freestyle-libre-mcp-server',
  'sitwellcc-web',
];
