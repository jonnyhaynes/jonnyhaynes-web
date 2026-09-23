/**
 * The curated Projects grid.
 *
 * Curation is explicit: only the repos named in FEATURED_REPOS appear, picked
 * from the baked GitHub snapshot. WORK_PROJECTS are hand-written, because
 * commercial work has no public repo to read from — it has store or product
 * links instead, plus any awards.
 *
 * The tech stack is written into each pitch rather than listed separately, so
 * `stack` is source material only and is no longer rendered.
 */

export type ProjectLinkKind =
  | 'repo'
  | 'live'
  | 'appstore'
  | 'play'
  | 'article'
  | 'video';

/** An outbound link on a card. `kind` selects the icon and the link's label. */
export type ProjectLink = {
  kind: ProjectLinkKind;
  url: string;
};

/** An award won by a work project; `name` is shown, `url` is where it links to. */
export type Award = {
  name: string;
  url: string;
};

export type WorkProject = {
  kind: 'work';
  name: string;
  company: string;
  pitch: string;
  stack: string[];
  links: ProjectLink[];
  awards: Award[];
};

/** The main employer behind the work projects — carried into the card's sr-only
 *  label. Not the only one: commercial work predates HMA, so an entry names its
 *  own company where it differs. */
export const COMPANY = 'HMA';

/** An earlier employer, for the work that predates HMA. */
export const LEDGARD_JEPSON = 'Ledgard Jepson';

/**
 * The personal repos shown in the grid. List order is irrelevant — the grid
 * sorts everything by card title (see useProjects in ../data/projects).
 *
 * Each entry is keyed on the GitHub repo name, which must match exactly or the
 * entry is silently skipped (see curatedRepos in ../data/projects). `name` is the
 * card title, because a repo name isn't always what you'd show a human; `pitch`
 * overrides the wording the repo's own `.portfolio.json` supplied, and `stack`
 * overrides its GitHub language breakdown.
 */
export type FeaturedRepo = {
  repo: string;
  name: string;
  pitch?: string;
  stack?: string[];
};

export const FEATURED_REPOS: FeaturedRepo[] = [
  {
    repo: 'cmux-sentinel',
    name: 'CMUX Sentinel',
    pitch:
      'An opinionated custom sidebar for cmux: a monospace workspaces list with live per-agent states and pluggable AI usage meters, written in Swift and TypeScript.',
    stack: ['Shell', 'Swift', 'TypeScript', 'Makefile'],
  },
  {
    repo: 'sitwellcc-web',
    name: 'Sitwell CC',
    pitch:
      'The website for Sitwell Cycling Club in Rotherham — social rides, races, Go-Ride coaching and charity fundraising — built in Astro and React with Tailwind, and edited by the club through Sanity CMS.',
    stack: ['Astro', 'TypeScript', 'Tailwind', 'React', 'Sanity'],
  },
  {
    repo: 'skillswap',
    name: 'Skillswap',
    pitch:
      'A community skill-swapping platform built in TypeScript, React and Tailwind over PostgreSQL — neighbours offer, request and swap skills, with real-time messaging and reviews.',
    stack: ['TypeScript', 'React', 'Tailwind', 'PostgreSQL'],
  },
];

export const WORK_PROJECTS: WorkProject[] = [
  {
    kind: 'work',
    name: 'Create & Bloom',
    company: COMPANY,
    pitch:
      'An NHS creative-health app built in Expo and React Native: guided drawing, writing, dance and mixed-arts courses that build a daily creative practice, with signposting to local workshops.',
    stack: ['Expo', 'React Native', 'Nativewind', 'Redux'],
    links: [
      {
        kind: 'appstore',
        url: 'https://apps.apple.com/gb/app/create-bloom/id6443400144',
      },
      {
        kind: 'play',
        url: 'https://play.google.com/store/apps/details?id=uk.co.hma.createandbloom',
      },
      {
        kind: 'article',
        url: 'https://www.southwestyorkshire.nhs.uk/2025/06/06/create-bloom-app-launches-to-inspire-creativity-and-support-wellbeing/',
      },
    ],
    awards: [
      {
        name: 'NHS Excellence Award for Digital Innovation',
        url: 'https://www.england.nhs.uk/nhsawards/',
      },
    ],
  },
  {
    kind: 'work',
    name: 'Calm Harm',
    company: COMPANY,
    pitch:
      'A free Expo and React Native app with more than 2 million downloads globally, helping young people manage the urge to self-harm through DBT-based activities — comfort, distract, express, release — plus guided breathing.',
    stack: ['Expo', 'React Native', 'Nativewind', 'Redux'],
    links: [
      {
        kind: 'appstore',
        url: 'https://apps.apple.com/gb/app/calm-harm/id961611581',
      },
      {
        kind: 'play',
        url: 'https://play.google.com/store/apps/details?id=uk.org.stem4.calmharm',
      },
      {
        kind: 'video',
        url: 'https://www.instagram.com/tv/ChN-Phkqiyw/?igshid=YmMyMTA2M2Y%3D',
      },
    ],
    awards: [
      {
        name: 'DBA Design Effectiveness Gold',
        url: 'https://www.dba.org.uk/calm-harm-app-wins-gold-dea/',
      },
      {
        name: 'UK Digital Experience Gold',
        url: 'https://www.hma.co.uk/insights/win-hma-uk-digital-experience-awards/',
      },
    ],
  },
  {
    kind: 'work',
    name: 'Ancon Building Products',
    company: LEDGARD_JEPSON,
    pitch:
      'A multi-language Rails site for Ancon’s stainless-steel structural fixings, in hand-written HTML and CSS — plus the Wall Tie Product Selector app for iOS and Android.',
    stack: ['Rails', 'HTML', 'CSS'],
    links: [{ kind: 'live', url: 'https://www.ancon.co.uk/' }],
    awards: [],
  },
  {
    kind: 'work',
    name: 'DigiBete',
    company: COMPANY,
    pitch:
      'A QISMET-accredited Type 1 diabetes self-management platform and app for the whole family, built on Laravel and Filament, clinically approved by NHS experts, with resources for under-25s.',
    stack: ['Laravel', 'Filament', 'Tailwind', 'Alpine.js', 'HTML'],
    links: [{ kind: 'live', url: 'https://www.digibete.org/' }],
    awards: [
      {
        name: 'DBA Design Effectiveness Silver',
        url: 'https://effectivedesign.org.uk/projects/2021/digibete-digital-platform',
      },
    ],
  },
];
