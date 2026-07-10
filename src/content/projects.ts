/**
 * Hand-authored annotations for the Projects section, keyed by GitHub repo name.
 *
 * The repo data (name, description, stack, links, last commit) is fetched live
 * from GitHub — see src/data/github.ts. This file layers the *story* on top:
 * a punchier pitch and the "Hardest Technical Challenge" narrative that the API
 * can't know. Only repos listed here are treated as featured projects; the
 * `order` array controls which appear and in what order.
 *
 * To feature a project: add its repo name to `FEATURED_ORDER` and (optionally)
 * an entry in `PROJECT_NOTES`. A repo with no note still renders using its
 * GitHub description as the pitch.
 */

export type ProjectNote = {
  /** Overrides the GitHub description as the card's one-line pitch. */
  pitch?: string;
  /** The "Hardest Technical Challenge" blurb — the bit engineers care about. */
  challenge?: string;
};

/**
 * Repos to feature, in display order. Names must match the GitHub repo name.
 * TODO(jonny): curate this list — pick the 2–4 projects that best sell you.
 */
export const FEATURED_ORDER: string[] = [
  'skillswap',
  'freestyle-libre-mcp-server',
  'sitwellcc-web',
];

export const PROJECT_NOTES: Record<string, ProjectNote> = {
  // TODO(jonny): replace the placeholder pitch/challenge text with the real story.
  skillswap: {
    pitch: 'TODO: one-line pitch for skillswap.',
    challenge:
      'TODO: the hardest part (the security fix commit suggests PII/access-control work — worth telling that story).',
  },
  'freestyle-libre-mcp-server': {
    pitch: 'Gives Claude live access to Freestyle Libre glucose data via MCP.',
    challenge:
      'TODO: the hardest part (e.g. reverse-engineering the unofficial API, session/auth handling, data normalisation…)',
  },
  'sitwellcc-web': {
    pitch: 'TODO: one-line pitch for the Sitwell CC site.',
    challenge:
      'TODO: the tricky bit (e.g. Astro content pipeline, the routes-from-Discord bridge, performance…)',
  },
};
