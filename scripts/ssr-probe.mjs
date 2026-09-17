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

// Section headings. This used to detect them by counting `//` prefixes, which
// broke the moment the prefix was dropped — so it asserts the headings
// themselves now, and separately that the prefix hasn't come back.
const headings = [...home.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) =>
  m[1]
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim(),
);
check('home renders section headings', headings.length >= 4, `${headings.length} found`);
check(
  'headings carry no // prefix',
  headings.every((heading) => !heading.includes('//')),
  headings.join(', '),
);
check('footer colophon is present', /OS Terrain 50/.test(home));
check('build stamp is inlined', /v\d+\.\d+\.\d+/.test(home));

// Structure.
check('home has exactly one h1', count(home, 'h1') === 1, `${count(home, 'h1')}`);
check('home has exactly one main', count(home, 'main') === 1, `${count(home, 'main')}`);
check('privacy has exactly one h1', count(privacy, 'h1') === 1, `${count(privacy, 'h1')}`);

// Levels must not skip a step. The project cards are <h4> precisely so they nest
// under the "Selected works" <h3>; a skip is how that regresses.
const headingSkip = (() => {
  let previous = 1;
  for (const [, level] of home.matchAll(/<h([1-4])[\s>]/g)) {
    if (Number(level) > previous + 1) return `h${previous} → h${level}`;
    previous = Number(level);
  }
  return null;
})();
check('heading levels never skip', headingSkip === null, headingSkip ?? 'no skips');

// The left panel is the portrait and nothing else, so it is deliberately not a
// landmark. It used to be an <aside> restating the hero's name, role, pitch and
// both destinations; these guard that it stays stripped back.
check('home renders the portrait panel', home.includes('portrait-art'));
check('privacy renders no portrait panel', !privacy.includes('portrait-art'));
// Home reserves a leading column for the portrait; privacy starts the pane at the
// left edge and holds it to two thirds with a trailing spacer instead.
check('home uses the panel layout', home.includes('data-layout="panel"'));
check('privacy uses the flush layout', privacy.includes('data-layout="flush"'));
for (const [label, needle] of [
  ['the subheadline', 'Building React, React Native and TypeScript products'],
  ['the role', 'Full-Stack Developer'],
  ['"View My Work"', 'View My Work'],
  ['"Get in Touch"', 'Get in Touch'],
]) {
  const seen = home.split(needle).length - 1;
  check(`${label} appears exactly once`, seen === 1, `${seen}`);
}

// Navigation must be real anchors, not click handlers.
const sectionHrefs = [...home.matchAll(/href="(\/#[^"]+)"/g)].map((m) => m[1]);
check(
  'section links are absolute anchors',
  sectionHrefs.length >= 14 && sectionHrefs.every((href) => href.startsWith('/#')),
  `${sectionHrefs.length} found`,
);

// The activity chip renders nothing without data, so its own markup can't be
// asserted. What can be asserted is that the mount points at the top of the page
// are gone: it lives in the Projects heading now, and previously rendered twice
// (shell row + hero) because `hidden` lost to the chip's own `inline-flex`.
check('the old top-of-page chip mounts are gone', !home.includes('mobile-chip'));

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
