import type { Palette } from './context';

/**
 * Palette-keyed copy. The `default` set is byte-identical to the hand-authored
 * strings; `yorkshire` swaps in broad Yorkshire dialect when the rose is lit.
 *
 * Headings keep the shared `// lower-case` mono format — only the words change.
 * Prose + button labels go full dialect under Yorkshire (article reduction
 * "t'workflow", "wi'", "abaht", "reyt"; lexical swaps "natter", "gi' us a
 * shout"). Data labels, aria-labels on icon-only controls, and legal/privacy
 * copy stay standard English so screen-reader output and clarity don't suffer.
 */
const COPY = {
  default: {
    // Section headings (the `// name` line each section opens with).
    headings: {
      projects: '// Projects',
      skills: '// Skills',
      listening: '// On the digital turntable',
      reading: '// My bookshelf',
      gaming: '// What I’m playing',
      health: '// Life beyond the keyboard',
      contact: '// Get in touch',
    },
    hero: {
      subheadline:
        'Building React, React Native and TypeScript products — with AI woven through the workflow.',
      viewWork: 'View My Work',
      getInTouch: 'Get in Touch',
    },
    contact: {
      prose:
        'Got a project, a role, or just fancy a natter about React? Drop me a line.',
      emailMe: 'Email Me',
      downloadResume: 'Download Resume',
    },
    health: {
      lead: 'A day away from the compiler, more or less — pulled from my watch.',
      restDay: 'is rather the point of a day beyond the keyboard.',
    },
    footer: {
      // The sentence wraps around the inline rose + links, so it's split into the
      // lead ("Forged in Yorkshire") and the "using" connective before the links.
      using: 'using',
      andAi: '& AI',
    },
    chip: {
      building: 'building',
    },
  },
  yorkshire: {
    // Apostrophe-light on purpose — Yorkshire dialect drops trailing/leading
    // elision marks (wi, an, playin, makin, Ave). The ONE apostrophe kept is
    // the definite-article reduction t' (t'workflow, t'compiler), where dropping
    // it makes the word unreadable. "I'm/I've" contractions are reworded away
    // rather than written "Im".
    headings: {
      projects: '// Summat Ah med',
      skills: '// What Ah do well',
      listening: '// Ont digital turntable',
      reading: '// Mi bookshelf',
      gaming: '// What Ah play',
      health: '// Life beyont keyboard',
      contact: '// Gi us a shout',
    },
    hero: {
      subheadline:
        'Building React, React Native an TypeScript stuff — wi AI threaded reyt through t’workflow.',
      viewWork: 'Ave a look',
      getInTouch: 'Gi us a shout',
    },
    contact: {
      prose:
        'Got a project, a role, or just fancy a natter abaht React? Drop us a line.',
      emailMe: 'Email us',
      downloadResume: 'Grab mi CV',
    },
    health: {
      lead: 'A day away from t’compiler, more or less — pulled off mi watch.',
      restDay: 'is rather t’point of a day beyont keyboard.',
    },
    footer: {
      using: 'wi',
      andAi: 'an AI',
    },
    chip: {
      building: 'makin',
    },
  },
} as const satisfies Record<Palette, unknown>;

export type HeadingKey = keyof (typeof COPY)['default']['headings'];

export function heading(palette: Palette, key: HeadingKey): string {
  return COPY[palette].headings[key];
}

/** The full palette-keyed copy tree, for components that need more than a heading. */
export function copy(palette: Palette): (typeof COPY)[Palette] {
  return COPY[palette];
}
