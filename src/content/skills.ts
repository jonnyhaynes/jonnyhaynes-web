/**
 * Hand-picked capabilities for the Skills section — what Jonny can *do*, not the
 * tools he does it with. The GitHub language-breakdown bar above this is the
 * data-backed "what I build with"; this list is the "what I can do" beside it.
 *
 * Verb-led on purpose. Keep each group tight (~3-4) and honest — every line
 * should be something Jonny would stand behind in an interview.
 */

export type SkillGroup = {
  title: string;
  skills: string[];
};

export const SKILL_GROUPS: SkillGroup[] = [
  {
    title: 'Frontend craft',
    skills: [
      'Build accessible, semantic UIs (WCAG, keyboard, reduced-motion)',
      'Design and maintain reusable component systems',
      'Craft responsive layouts and motion that respect the user',
      'Ship fast interfaces — Core Web Vitals, bundle discipline',
    ],
  },
  {
    title: 'Ship end-to-end',
    skills: [
      'Wire up data with Node, serverless & typed APIs',
      'Model data in Supabase / Postgres',
      'Automate delivery with GitHub Actions & Vercel',
    ],
  },
  {
    title: 'Quality & workflow',
    skills: [
      'Test critical paths with Playwright & Maestro',
      'Weave AI through the dev workflow (incl. MCP servers)',
      'Keep TypeScript strict and the codebase honest',
    ],
  },
];
