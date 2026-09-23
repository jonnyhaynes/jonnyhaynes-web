/**
 * Career history and credentials.
 *
 * Transcribed from `docs/resume.md`, which is the source of truth — the resume is
 * what gets sent to employers, so the two disagreeing would be worse than either
 * being thin. Keep them in step: if a role changes there, it changes here.
 *
 * Newest first, because that is the order the section reads in and the order a CV
 * reads in. Nothing here is derived; the only career facts the rest of the site
 * knows on its own are the two employers named on the work projects and the awards
 * attached to them.
 */

export type Role = {
  title: string;
  company: string;
  /** As written on the resume, because a career section is a factual claim. */
  period: string;
  place: string;
  /** The role held now — marked in the UI, and the only one in present tense. */
  current?: boolean;
  detail: string[];
};

export const ROLES: readonly Role[] = [
  {
    title: 'Full Stack Developer',
    company: 'HMA Digital',
    period: 'May 2017 — present',
    place: 'Barnsley',
    current: true,
    detail: [
      'Architect and scale cross-platform iOS and Android apps in React Native, Expo and TypeScript.',
      'Engineered Calm Harm, which has passed two million global downloads and won a DBA Gold.',
      'Built the DigiBete platform for teenagers with type 1 diabetes, award-winning for UI design and effectiveness.',
      'Integrate bespoke JavaScript frameworks — Next.js, React — alongside PHP ecosystems in Laravel, Statamic and WordPress.',
      'Introduced Claude Code into the workflow, accelerating deployment while raising code-quality and documentation standards.',
    ],
  },
  {
    title: 'Senior Front-End Developer',
    company: 'Ledgard Jepson',
    period: 'Mar 2015 — May 2017',
    place: 'Sheffield',
    detail: [
      'Mentored junior staff and took full responsibility for the technical quality of the team’s output.',
      'Partnered with the Digital Director on resource planning and technical estimation, and translated designs into highly semantic interfaces.',
    ],
  },
  {
    title: 'Front-End Developer',
    company: 'Ledgard Jepson',
    period: 'Jan 2011 — Mar 2015',
    place: 'Sheffield',
    detail: [
      'Directed the company’s move to responsive web design and mobile app production with PhoneGap.',
      'Built the Wall Tie Product Selector iOS and Android app in HTML5, SASS and JavaScript — the app that sits alongside Ancon.',
      'Engineered offline-capable web applications, caching JSON in HTML5 local storage.',
    ],
  },
  {
    title: 'Founder',
    company: 'Colouring Code',
    period: 'Jan 2010 — Jan 2011',
    place: 'Sheffield',
    detail: [
      'Ran an independent consultancy, managing client relationships and shipping Ruby on Rails and HTML5 platforms for letting agents and brands including Pom-Bear Crisps.',
    ],
  },
  {
    title: 'Consultant & Visiting Lecturer',
    company: 'Wakefield College',
    period: 'May 2009 — Apr 2010',
    place: 'Wakefield',
    detail: [
      'Modernised the FdA Web Design module structure and lectured on semantic HTML, CSS and web accessibility standards.',
    ],
  },
  {
    title: 'Web User Experience Designer',
    company: 'TechnoPhobia Ltd.',
    period: 'Nov 2006 — Jul 2009',
    place: 'Sheffield',
    detail: [
      'Built functional prototypes and templates for high-profile systems, including the South Yorkshire Police recruitment platform.',
    ],
  },
];

export type Credential = {
  name: string;
  /** Who awarded it, or where it was studied. */
  from: string;
  year?: string;
  /**
   * Where the qualification is described by whoever awards it. Optional, because
   * a link that goes nowhere is worse than no link — the mental health award and
   * the HND don't have one I could verify.
   */
  url?: string;
};

/** Qualified-for things: certifications and education. */
export const CREDENTIALS: readonly Credential[] = [
  {
    name: 'FAA Level 3 Award in Supervising First Aid for Mental Health',
    from: 'First Aid Awards',
  },
  {
    name: 'ITC Level 3 Award in Outdoor First Aid',
    from: 'ITC First',
    url: 'https://www.itcfirst.org.uk/qualifications/itc-level-3-award-in-outdoor-first-aid/32',
  },
  {
    name: 'HND, Interactive use of Media',
    from: 'Wakefield College',
    year: '2004 — 2006',
  },
];

/** The opening line, in the resume's own words. */
export const CAREER_LEAD =
  'Nearly two decades of digital engineering — from semantic HTML in 2006, through award-winning cross-platform apps, to AI-accelerated delivery.';

/* ── Period maths ────────────────────────────────────────────────────────────
   Two facts about the whole career, needed by anything that has to place these
   roles on an axis: where it starts, and where one role sits on it. The resume
   writes months as words, so parsing them is the only way to compare them. */

/**
 * Resolved once at module load. `Date.now()` during render is impure, and the
 * present tense of a career does not change mid-session.
 */
export const CAREER_NOW = Date.now();

/** "Nov 2006" → a timestamp. */
export function monthStart(text: string): number {
  return new Date(`1 ${text}`).getTime();
}

/** "Jan 2011 — Mar 2015" → [start, end], with "present" resolving to now. */
export function roleSpan(period: string): [number, number] {
  const [from, to] = period.split(' — ');
  return [monthStart(from), to === 'present' ? CAREER_NOW : monthStart(to)];
}
