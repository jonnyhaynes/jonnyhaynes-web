/**
 * Manually-curated skills, grouped for the Skills section (spec §C). The
 * GitHub language-breakdown bar above this is the data-backed companion; this
 * is the hand-picked list of what Jonny actually works with.
 *
 * TODO(jonny): edit these lists — they're a sensible starting point drawn from
 * the projects/stack, not a definitive claim. Keep each group tight (~6-8).
 */

export type SkillGroup = {
  title: string;
  skills: string[];
};

export const SKILL_GROUPS: SkillGroup[] = [
  {
    title: 'Frontend',
    skills: [
      'React',
      'React Native',
      'TypeScript',
      'Astro',
      'Tailwind CSS',
      'Vite',
    ],
  },
  {
    title: 'Backend',
    skills: [
      'Node.js',
      'Supabase / PostgreSQL',
      'REST & GraphQL APIs',
      'Serverless functions',
      'MCP servers',
    ],
  },
  {
    title: 'Tools & DevOps',
    skills: [
      'Git & GitHub',
      'GitHub Actions (CI/CD)',
      'Vercel',
      'ESLint & Prettier',
      'AI-assisted workflows',
    ],
  },
];
