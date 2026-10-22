/**
 * Copy and data for the desk. Everything here is hand-authored except the live
 * panels (books, games and health), which read the baked snapshots and fall back
 * to the values below when a fetch is missing or stale. The turntable uses the
 * live now-playing API instead of a baked snapshot.
 */

export type DeskLink = { label: string; href: string };

export type DeskProject = {
  slug: string;
  name: string;
  org: string;
  short: string;
  kind: string;
  stat?: string;
  desc: string;
  stack: string[];
  awards: { name: string; url?: string }[];
  links: DeskLink[];
};

export const PROJECTS: readonly DeskProject[] = [
  {
    slug: 'calm-harm',
    name: 'Calm Harm',
    org: 'HMA Digital',
    short: 'HMA Digital · mental health support',
    kind: 'App',
    stat: '2M+ downloads',
    desc: 'A free Expo and React Native app with more than 2 million downloads globally, helping young people manage the urge to self-harm through DBT-based activities — comfort, distract, express, release — plus guided breathing.',
    stack: ['Expo', 'React Native'],
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
    links: [
      {
        label: 'App Store',
        href: 'https://apps.apple.com/gb/app/calm-harm/id961611581',
      },
      {
        label: 'Google Play',
        href: 'https://play.google.com/store/apps/details?id=uk.org.stem4.calmharm',
      },
      {
        label: 'Video',
        href: 'https://www.instagram.com/tv/ChN-Phkqiyw/',
      },
    ],
  },
  {
    slug: 'create-and-bloom',
    name: 'Create & Bloom',
    org: 'HMA Digital',
    short: 'HMA Digital · NHS creative health',
    kind: 'App',
    desc: 'An NHS creative-health app built in Expo and React Native: guided drawing, writing, dance and mixed-arts courses that build a daily creative practice, with signposting to local workshops.',
    stack: ['Expo', 'React Native'],
    awards: [
      {
        name: 'NHS Excellence Award for Digital Innovation',
        url: 'https://www.england.nhs.uk/nhsawards/',
      },
    ],
    links: [
      {
        label: 'App Store',
        href: 'https://apps.apple.com/gb/app/create-bloom/id6443400144',
      },
      {
        label: 'Google Play',
        href: 'https://play.google.com/store/apps/details?id=uk.co.hma.createandbloom',
      },
      {
        label: 'Article',
        href: 'https://www.southwestyorkshire.nhs.uk/2025/06/06/create-bloom-app-launches-to-inspire-creativity-and-support-wellbeing/',
      },
    ],
  },
  {
    slug: 'digibete',
    name: 'DigiBete',
    org: 'HMA Digital',
    short: 'HMA Digital · Type 1 diabetes',
    kind: 'Platform & app',
    desc: 'A QISMET-accredited Type 1 diabetes self-management platform and app for the whole family, built on Laravel and Filament, clinically approved by NHS experts, with resources for under-25s.',
    stack: ['Laravel', 'Filament'],
    awards: [
      {
        name: 'DBA Design Effectiveness Silver',
        url: 'https://effectivedesign.org.uk/projects/2021/digibete-digital-platform',
      },
    ],
    links: [{ label: 'Web', href: 'https://www.digibete.org/' }],
  },
  {
    slug: 'sitwell-cc',
    name: 'Sitwell CC',
    org: 'Side project',
    short: 'Side project · Rotherham cycling club',
    kind: 'Web',
    desc: 'The website for Sitwell Cycling Club in Rotherham — social rides, races, Go-Ride coaching and charity fundraising — built in Astro and React with Tailwind, and edited by the club through Sanity CMS.',
    stack: ['Astro', 'React', 'Tailwind', 'Sanity'],
    awards: [],
    links: [
      {
        label: 'Repo',
        href: 'https://github.com/jonnyhaynes/sitwellcc-web',
      },
    ],
  },
  {
    slug: 'skillswap',
    name: 'Skillswap',
    org: 'Side project',
    short: 'Side project · community platform',
    kind: 'Web app',
    desc: 'A community skill-swapping platform built in TypeScript, React and Tailwind over PostgreSQL — neighbours offer, request and swap skills, with real-time messaging and reviews.',
    stack: ['TypeScript', 'React', 'Tailwind', 'PostgreSQL'],
    awards: [],
    links: [
      { label: 'Repo', href: 'https://github.com/jonnyhaynes/skillswap' },
    ],
  },
  {
    slug: 'cmux-sentinel',
    name: 'CMUX Sentinel',
    org: 'Open source',
    short: 'Forked repository · open source',
    kind: 'Dev tool',
    desc: 'An opinionated custom sidebar for cmux: a monospace workspaces list with live per-agent states and pluggable AI usage meters, written in Swift and TypeScript.',
    stack: ['Swift', 'TypeScript'],
    awards: [],
    links: [
      { label: 'Repo', href: 'https://github.com/jonnyhaynes/cmux-sentinel' },
    ],
  },
  {
    slug: 'ancon',
    name: 'Ancon',
    org: 'Ledgard Jepson',
    short: 'Ledgard Jepson · structural fixings',
    kind: 'Web & app',
    desc: 'A multi-language Rails site for Ancon’s stainless-steel structural fixings, in hand-written HTML and CSS — plus the Wall Tie Product Selector app for iOS and Android.',
    stack: ['Rails', 'HTML', 'CSS'],
    awards: [],
    links: [{ label: 'Web', href: 'https://www.ancon.co.uk/' }],
  },
  {
    slug: 'ezz-steel',
    name: 'Ezz Steel',
    org: 'Ledgard Jepson',
    short: 'Ledgard Jepson · bilingual digital',
    kind: 'Web',
    desc: 'A bilingual Rails site for the Egyptian steel producer, in hand-written HTML and CSS — the entire layout mirrors between the English and Arabic versions.',
    stack: ['Rails', 'HTML', 'CSS', 'RTL'],
    awards: [],
    links: [{ label: 'Web', href: 'https://www.ezzsteel.com/' }],
  },
];

export type DeskRole = {
  title: string;
  org: string;
  years: string;
  from: number;
  to: number | null;
  badge: { band: string; text: string; strap: string };
  access: string[];
  points: string[];
};

export const ROLES: readonly DeskRole[] = [
  {
    title: 'Full Stack Developer',
    org: 'HMA Digital',
    years: '2017 — now',
    from: 2017,
    to: null,
    badge: { band: '#1D3FD1', text: '#FFFFFF', strap: '#1D3FD1' },
    access: ['React Native', 'Expo', 'TypeScript', 'Next.js', 'Laravel', 'Claude Code'],
    points: [
      'Architect and scale cross-platform iOS and Android apps in React Native, Expo and TypeScript.',
      'Engineered Calm Harm, which has passed two million global downloads and won a DBA Gold.',
      'Built the DigiBete platform for teenagers with type 1 diabetes, award-winning for UI design and effectiveness.',
      'Integrate bespoke JavaScript frameworks — Next.js, React — alongside PHP ecosystems in Laravel, Statamic and WordPress.',
      'Introduced Claude Code into the workflow, accelerating deployment while raising code-quality and documentation standards.',
    ],
  },
  {
    title: 'Senior Front-End Developer',
    org: 'Ledgard Jepson',
    years: '2015 — 2017',
    from: 2015,
    to: 2017,
    badge: { band: '#FFD43B', text: '#0B1B4A', strap: '#E0B21C' },
    access: [],
    points: [],
  },
  {
    title: 'Front-End Developer',
    org: 'Ledgard Jepson',
    years: '2011 — 2015',
    from: 2011,
    to: 2015,
    badge: { band: '#0B1B4A', text: '#FFFFFF', strap: '#0B1B4A' },
    access: [],
    points: [],
  },
  {
    title: 'Designer',
    org: 'Ebuyer',
    years: '2009 — 2011',
    from: 2009,
    to: 2011,
    badge: { band: '#C9D5FA', text: '#0B1B4A', strap: '#8FA6F5' },
    access: [],
    points: [],
  },
  {
    title: 'Consultant & Visiting Lecturer',
    org: 'Wakefield College',
    years: '2009 — 2010',
    from: 2009,
    to: 2010,
    badge: { band: '#E3E8F0', text: '#0B1B4A', strap: '#9AA9C6' },
    access: [],
    points: [],
  },
  {
    title: 'Web User Experience Designer',
    org: 'TechnoPhobia Ltd.',
    years: '2006 — 2009',
    from: 2006,
    to: 2009,
    badge: { band: '#EEF2FF', text: '#1D3FD1', strap: '#7C95FF' },
    access: [],
    points: [],
  },
];

export const CREDENTIALS = [
  { title: 'HND, Interactive use of Media', meta: 'Wakefield College · 2004–2006' },
  {
    title: 'Supervising First Aid for Mental Health',
    meta: 'FAA Level 3',
  },
  { title: 'Outdoor First Aid', meta: 'ITC Level 3' },
  { title: '4 industry awards', meta: 'Listed against the work', highlight: true },
] as const;

/** Static fallback until the baked audiobook snapshot loads (or if it is missing). */
export const BOOKS = [
  {
    title: 'Letters to Our Sons',
    author: 'Stephen Graham',
    cover: '#FFD43B',
    ink: '#0B1B4A',
    currentlyReading: true,
  },
  {
    title: 'The Book of Trespass',
    short: 'The Book of Trespass',
    author: 'Nick Hayes',
    cover: '#E3E8F0',
    ink: '#0B1B4A',
  },
  {
    title: 'The Man in the High Castle',
    author: 'Philip K. Dick',
    cover: '#1D3FD1',
    ink: '#FFFFFF',
  },
] as const;

/** Shown until the baked games snapshot loads (or if it is missing). */
export const GAMES_FALLBACK = [
  { title: 'Farming Simulator 25', platform: 'PC', status: 'LAST PLAYED' },
  { title: 'The Alters', platform: 'XBOX', status: 'RECENTLY PLAYED' },
  { title: 'Clair Obscur: Expedition 33', platform: 'XBOX', status: 'RECENTLY PLAYED' },
  { title: 'Call of Duty: Modern Warfare III', platform: 'XBOX', status: 'RECENTLY PLAYED' },
  { title: 'Hollow Knight: Voidheart Edition', platform: 'XBOX', status: 'RECENTLY PLAYED' },
] as const;

/** Shown until /api/now-playing answers (or if it is unavailable). */
export const TRACK_FALLBACK = {
  title: '1979',
  artist: 'The Smashing Pumpkins',
  url: 'https://open.spotify.com/search/1979%20The%20Smashing%20Pumpkins',
};

export const EMAIL_PARTS = ['jonny.d.haynes', 'gmail', 'com'] as const;
export const CV_URL = '/jonnyhaynes-cv.pdf';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/jonnyhaynes/';
export const GITHUB_URL = 'https://github.com/jonnyhaynes';

export const ROLE_WORDS = {
  first: ['Full-Stack', 'Front-End', 'Software', 'AI'],
  second: ['Developer', 'Engineer', 'Enthusiast'],
} as const;

export function randomRole() {
  const first = ROLE_WORDS.first[Math.floor(Math.random() * ROLE_WORDS.first.length)];
  const second =
    ROLE_WORDS.second[Math.floor(Math.random() * ROLE_WORDS.second.length)];
  return {
    label: `${first} ${second}`,
    sr: `${first === 'AI' ? 'an' : 'a'} ${first} ${second}`,
  };
}
