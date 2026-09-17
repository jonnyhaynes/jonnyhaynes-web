// Renders each route to static HTML and asserts what has to be true when there's
// no browser: that the tree renders without touching `window`, that the markup a
// crawler receives contains real content, and that the document structure is
// sound (landmarks, one h1, real anchor hrefs).
//
// Run with: npm run probe:ssr
//
// This is a guard on the road to prerendering — it caught a `window.matchMedia`
// read in a useState initializer that threw on the server.

import { render } from '../.ssr-probe/ssr-probe.js';

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });
const count = (html, tag) => (html.match(new RegExp(`<${tag}[ >]`, 'g')) ?? []).length;

let home;
let privacy;
try {
  home = render('/');
  privacy = render('/privacy');
} catch (error) {
  console.error('\n✗ SSR render threw — a component is touching the DOM during render:\n');
  console.error(error);
  process.exit(1);
}

// Real content, not an empty shell.
check('home renders substantive markup', home.length > 20000, `${home.length} bytes`);
check('home contains the hero', /I’m a/.test(home));
check('home contains section headings', (home.match(/\/\/ /g) ?? []).length >= 4);
check('footer colophon is present', /OS Terrain 50/.test(home));
check('build stamp is inlined', /v\d+\.\d+\.\d+/.test(home));

// Structure.
check('home has exactly one h1', count(home, 'h1') === 1, `${count(home, 'h1')}`);
check('home has exactly one main', count(home, 'main') === 1, `${count(home, 'main')}`);
check('privacy has exactly one h1', count(privacy, 'h1') === 1, `${count(privacy, 'h1')}`);
check('privacy has no profile panel', count(privacy, 'aside') === 0, `${count(privacy, 'aside')}`);
check('home has the profile panel', count(home, 'aside') === 1, `${count(home, 'aside')}`);

// Navigation must be real anchors, not click handlers.
const sectionHrefs = [...home.matchAll(/href="(\/#[^"]+)"/g)].map((m) => m[1]);
check(
  'section links are absolute anchors',
  sectionHrefs.length >= 14 && sectionHrefs.every((href) => href.startsWith('/#')),
  `${sectionHrefs.length} found`,
);

// The chip mounts twice (shell top row below lg, hero at lg and up) and renders
// nothing without data, so its own markup can't be asserted here. What CAN be
// asserted is that each mount point is gated on a wrapper — the failure mode was
// `hidden` on the chip itself losing to its own `inline-flex`, which rendered it
// twice on every small screen.
check(
  'the hero gates the chip on a wrapper, not on the chip',
  home.includes('absolute top-6 left-0 hidden lg:block'),
);
check('the shell gates the chip row below lg', home.includes('mobile-chip px-6 pt-4 lg:hidden'));

// Controls that change after hydration must start in their rest state. The rail
// and the top bar each own a back-to-top, gated by CSS so only one shows.
const backToTops = [...home.matchAll(/<button[^>]*Back to top[^>]*>/g)].map(
  (m) => m[0],
);
check('a back-to-top exists in both navs', backToTops.length === 2, `${backToTops.length} found`);
check(
  'every back-to-top starts disabled',
  backToTops.length > 0 && backToTops.every((b) => /disabled=/.test(b)),
);

// Known gap, reported rather than asserted: these sections render nothing until
// their data lands, so prerendering has to supply it at build time.
const dataGated = ['reading', 'gaming', 'health'].filter(
  (id) => !home.includes(`id="${id}"`),
);
if (dataGated.length) {
  check(
    'data-gated sections absent without data (expected until prerender)',
    true,
    dataGated.join(', '),
  );
}

const failed = results.filter((r) => !r.pass);
for (const { name, pass, detail } of results) {
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
