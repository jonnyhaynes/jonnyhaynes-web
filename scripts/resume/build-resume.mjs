// Build public/resume.pdf from docs/resume.md, styled in the site's light
// "Chalk / Deep Coal / Bright Heather" theme.
//
// Pipeline: parse the (hand-authored, stable) resume Markdown → render a
// print-optimised A4 HTML document with JetBrains Mono embedded as base64
// woff2 and the South Yorkshire contour relief inlined as a faint background →
// print to PDF via headless system Chrome.
//
// The HTML is fully self-contained (fonts + artwork embedded) so generation
// needs no network and the output is deterministic. Re-run whenever
// docs/resume.md changes:
//
//   node scripts/resume/build-resume.mjs
//
// Requires Google Chrome installed at the standard macOS path (override with
// the CHROME env var). Contours: OS Terrain 50, (c) Crown copyright, OGL v3.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

const CHROME =
  process.env.CHROME ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Light-theme tokens, lifted verbatim from src/index.css [data-theme='light'].
const T = {
  background: '#f4f3f0',
  foreground: '#202225',
  muted: '#61697a',
  accentStart: '#8b52a1',
  accentEnd: '#673d7a',
  // The site hero's gradient animates left→right through magenta → heather →
  // indigo (oklch hues ~340 → ~270). The static text gradient mirrors that
  // full sweep with three stops so the blue end is present, not just purple.
  gradFrom: '#b5439f', // magenta
  gradMid: '#8b52a1', // heather (the light-theme accent-start)
  gradTo: '#4f5bd5', // indigo/blue
};

// --- Markdown → structured resume ---------------------------------------

/**
 * Parse the resume Markdown. This is deliberately tailored to the known shape
 * of docs/resume.md (H1 name, bold role line, contact bullets, then H2
 * sections) rather than a general Markdown parser, to avoid a dependency.
 */
function parseResume(md) {
  const lines = md.split('\n');
  const doc = { name: '', tagline: '', contact: [], sections: [] };

  let i = 0;
  // H1 — name.
  while (i < lines.length && !lines[i].startsWith('# ')) i++;
  doc.name = lines[i].replace(/^#\s+/, '').trim();
  i++;

  // Tagline: first non-blank line, a bold-delimited pipe list.
  while (i < lines.length && lines[i].trim() === '') i++;
  doc.tagline = stripInline(lines[i].trim());
  i++;

  // Skip the blank line between the tagline and the contact bullets.
  while (i < lines.length && lines[i].trim() === '') i++;

  // Contact bullets (until the first blank line after them).
  while (i < lines.length && lines[i].trim() !== '') {
    const m = lines[i].match(/^-\s+\*\*(.+?):\*\*\s+(.+)$/);
    if (m) doc.contact.push({ label: m[1], value: m[2].trim() });
    i++;
  }

  // Sections.
  let section = null;
  let entry = null;
  const pushEntry = () => {
    if (entry && section) section.entries.push(entry);
    entry = null;
  };
  const pushSection = () => {
    pushEntry();
    if (section) doc.sections.push(section);
    section = null;
  };

  for (; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (line.startsWith('## ')) {
      pushSection();
      section = { title: line.replace(/^##\s+/, '').trim(), entries: [], body: [] };
    } else if (line.startsWith('### ')) {
      pushEntry();
      entry = { title: line.replace(/^###\s+/, '').trim(), meta: '', bullets: [], lines: [] };
    } else if (trimmed.startsWith('*') && trimmed.endsWith('*') && entry && !entry.meta) {
      // *May 2017 – Present • Barnsley* — the entry's italic meta line.
      entry.meta = trimmed.replace(/^\*|\*$/g, '').trim();
    } else if (trimmed.startsWith('- ')) {
      const text = stripInline(trimmed.replace(/^-\s+/, ''));
      if (entry) entry.bullets.push(text);
      else if (section) section.body.push(text);
    } else if (trimmed !== '') {
      // Free text under an entry (e.g. the education "HND, ..." line).
      if (entry) entry.lines.push(stripInline(trimmed));
      else if (section) section.body.push(stripInline(trimmed));
    }
  }
  pushSection();

  // The tagline-less summary section reads better as a paragraph; join its
  // body lines back together.
  return doc;
}

/** Turn a leading **Bold:** run into an accent lead (site's `HARDEST BIT:`). */
function renderBullet(text) {
  const m = text.match(/^\*\*(.+?):\*\*\s*(.*)$/);
  if (m) {
    return `<span class="lead">${esc(m[1])}:</span> ${esc(m[2])}`;
  }
  return esc(text);
}

/** Strip Markdown bold/italic markers, leaving plain text. */
function stripInline(s) {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(?<!\*)\*(?!\*)(.+?)\*/g, '$1');
}

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// --- HTML rendering ------------------------------------------------------

function fontFace(weight, b64) {
  return `@font-face{font-family:'JetBrains Mono';font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
}

/** The // section label, lowercased to match the site's `// skills` heads. */
function heading(title) {
  return `<h2><span class="slash">//</span> ${esc(title.toLowerCase())}</h2>`;
}

/** Rounded-full outline pills, matching the site's project-card skill chips. */
function pills(items) {
  return `<div class="pills">${items
    .map((t) => `<span class="pill">${esc(t)}</span>`)
    .join('')}</div>`;
}

function renderContact(contact) {
  return contact
    .map((c) => {
      let value = esc(c.value);
      if (c.label === 'Email') value = `<a href="mailto:${esc(c.value)}">${value}</a>`;
      else if (c.label === 'Website')
        value = `<a href="https://${esc(c.value)}">${value}</a>`;
      return `<span class="contact-item">${value}</span>`;
    })
    .join('<span class="contact-sep">/</span>');
}

/** A section rendered as a site-style card (rounded-lg, muted border,
 *  translucent so the topo shows through). */
function card(title, inner, extra = '') {
  return `<section class="card${extra ? ' ' + extra : ''}">${heading(
    title
  )}${inner}</section>`;
}

function renderSection(section) {
  // Core Stack — the ·-separated list as outline pills.
  if (section.title === 'Core Stack') {
    const tags = section.body
      .join(' ')
      .split('·')
      .map((t) => t.trim())
      .filter(Boolean);
    return card(section.title, pills(tags));
  }

  // Summary — a single flowing paragraph.
  if (section.title === 'Summary') {
    return card(section.title, `<p class="lede">${esc(section.body.join(' '))}</p>`);
  }

  // Entry-based sections (Experience, Education). Experience is long, so let
  // its card split across pages (--flow); short ones stay atomic.
  if (section.entries.length) {
    const entries = section.entries.map(renderEntry).join('');
    const flow = section.entries.length > 2 ? 'card--flow' : '';
    return card(section.title, `<div class="entries">${entries}</div>`, flow);
  }

  // Top Skills — short keywords, render as pills.
  if (section.title === 'Top Skills') {
    return card(section.title, pills(section.body));
  }

  // Remaining plain lists (Certifications, Languages) — stacked list, muted.
  return card(
    section.title,
    `<ul class="stack-list">${section.body
      .map((b) => `<li>${esc(b)}</li>`)
      .join('')}</ul>`
  );
}

/** One Experience/Education entry: role + company, then date · location. */
function renderEntry(e) {
  // "Full Stack Developer — HMA Digital" → role + company.
  const [role, company] = e.title.split(/\s+—\s+/);
  // "May 2017 – Present • Barnsley" → dates + place.
  let dates = e.meta,
    place = '';
  const bulletIdx = e.meta.indexOf('•');
  if (bulletIdx !== -1) {
    dates = e.meta.slice(0, bulletIdx).trim();
    place = e.meta.slice(bulletIdx + 1).trim();
  }

  const title = company
    ? `<span class="role-name">${esc(role)}</span><span class="at"> @ </span><span class="company">${esc(
        company
      )}</span>`
    : `<span class="role-name">${esc(role)}</span>`;

  const metaBits = [];
  if (dates) metaBits.push(`<span class="dates">${esc(dates)}</span>`);
  if (place) metaBits.push(`<span class="place">${esc(place)}</span>`);
  const meta = metaBits.length
    ? `<div class="entry-meta">${metaBits.join('<span class="dot">·</span>')}</div>`
    : '';

  const extra = e.lines.length
    ? `<div class="entry-lines">${e.lines.map(esc).join('<br>')}</div>`
    : '';
  const bullets = e.bullets.length
    ? `<ul>${e.bullets.map((b) => `<li>${renderBullet(b)}</li>`).join('')}</ul>`
    : '';

  // Dates · location sit UNDER the title. For entries with an extra line (e.g.
  // education's "HND, …"), the meta drops beneath that line instead.
  return e.lines.length
    ? `<div class="entry"><h3>${title}</h3>${extra}${meta}${bullets}</div>`
    : `<div class="entry"><h3>${title}</h3>${meta}${extra}${bullets}</div>`;
}

// Two-column split: the narrow left sidebar holds the scannable, contextual
// sections; the wide right column holds the summary + experience (what gets
// read most). Education/certs default to the sidebar.
const SIDEBAR = new Set([
  'Core Stack',
  'Top Skills',
  'Education',
  'Certifications',
]);
// Sections omitted from the CV entirely.
const OMIT = new Set(['Languages']);

function renderHtml(doc, fonts, topoSvg) {
  const contact = renderContact(doc.contact);
  const shown = doc.sections.filter((s) => !OMIT.has(s.title));

  const sidebar = shown
    .filter((s) => SIDEBAR.has(s.title))
    .map(renderSection)
    .join('');
  const main = shown
    .filter((s) => !SIDEBAR.has(s.title))
    .map(renderSection)
    .join('');

  // The tagline is a `|`-separated line: first part is the role (folded into
  // the "// Ey up. I'm a <role>" microcopy line), the rest is the muted
  // subheadline underneath.
  const [role, ...rest] = doc.tagline.split('|').map((s) => s.trim());
  const subhead = rest.join(' · ');

  // Size the SVG name to the glyph run. JetBrains Mono at this size is ~0.6em
  // wide per char; a little slack on the right avoids clipping the last glyph.
  const NAME_SIZE = 40;
  const nameW = Math.ceil(doc.name.length * NAME_SIZE * 0.62) + 12;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
${fontFace(400, fonts.w400)}
${fontFace(500, fonts.w500)}

*{margin:0;padding:0;box-sizing:border-box;}

/* Page margins live on @page so they repeat on EVERY printed page (padding on
   a single page-spanning element only insets the first page). */
@page{size:A4;margin:22mm 20mm 20mm;}

:root{
  --bg:${T.background};
  --fg:${T.foreground};
  --muted:${T.muted};
  --accent-start:${T.accentStart};
  --accent-end:${T.accentEnd};
  --line:color-mix(in srgb,var(--muted) 22%,transparent);
}

html{-webkit-print-color-adjust:exact;print-color-adjust:exact;}

body{
  font-family:'JetBrains Mono',ui-monospace,monospace;
  background:#fff;
  color:var(--fg);
  font-size:10px;
  line-height:1.6;
  letter-spacing:-0.1px;
}

/* The content flows within the @page margin box; no padding here so page 2+
   inherit the same margins. */
.page{position:relative;z-index:1;}

/* Contour relief: a fixed layer repeats on every printed page in Chrome,
   filling the whole sheet including the @page margins. Negative insets push it
   past the margin box out to the paper edges. Whisper-quiet so it reads as
   texture, not decoration. */
.bg{
  position:fixed;
  top:-24mm;left:-22mm;
  width:214mm;height:301mm;
  z-index:0;
}
.topo{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  color:var(--muted);
  opacity:0.07;
}
.topo svg{width:100%;height:100%;}

/* ---- Header (mirrors the site hero: the "// Ey up…" microcopy line, then the
   gradient name headline underneath) ---- */
.microcopy{
  color:var(--accent-start);
  font-size:12px;
  margin-bottom:10px;
}
.name{display:block;height:${Math.round(NAME_SIZE * 1.05)}px;}
.name svg{height:100%;overflow:visible;}
.name text{font-weight:500;font-size:${NAME_SIZE}px;letter-spacing:-1px;}

.subhead{
  margin-top:10px;
  color:var(--muted);
  font-size:11px;
  max-width:66ch;
}

.contact{
  margin-top:16px;
  color:var(--muted);
  font-size:9.5px;
}
.contact a{color:var(--fg);text-decoration:none;}
.contact-sep{color:var(--line);margin:0 9px;}

/* ---- Two-column body ----
   The sidebar is FLOATED into the left lane rather than laid out as a grid
   track. A float occupies the left of page 1 only; once it ends, the main
   content keeps flowing in the same right lane (its left margin is reserved),
   so the experience column is always "content width minus the sidebar" — full
   two-column on page 1, right-lane-only on later pages with the left empty. */
.columns{margin-top:22px;}
.columns::after{content:'';display:block;clear:both;}

.col-side{
  float:left;
  width:33%;
}
/* Sidebar cards: flex gave even spacing; use margins so the float paginates. */
.col-side > .card{margin-bottom:14px;}
.col-side > .card:last-child{margin-bottom:0;}

/* Main is normal block flow (NOT flex) so its cards paginate independently and
   fill each page rather than being one un-splittable flex box. */
.col-main{margin-left:calc(33% + 16px);}
.col-main > .card{margin-bottom:20px;}
.col-main > .card:last-child{margin-bottom:0;}

/* ---- Card (the site's project-card container: rounded-lg, muted/20 border,
   bg-background/70 + backdrop-blur so the contour shows through) ---- */
.card{
  border:1px solid color-mix(in srgb,var(--muted) 20%,transparent);
  border-radius:10px;
  background:transparent;
  padding:16px 18px;
  break-inside:avoid;
}
/* Right-column sections (summary, experience) drop the bounding box — plain
   text on the page, no border/fill/padding. */
.col-main > .card{
  border:none;
  background:none;
  padding:0;
}
/* The experience card is taller than a page, so it must be allowed to split
   across pages (its individual entries still avoid breaking). */
.card--flow{break-inside:auto;}
h2{
  font-weight:400;
  font-size:9px;
  text-transform:uppercase;
  letter-spacing:2px;
  color:var(--muted);
  margin-bottom:11px;
}
h2 .slash{color:var(--accent-start);margin-right:2px;}

.lede{max-width:none;color:var(--fg);}

.dot{color:var(--line);margin:0 8px;}

/* Stacked keyword list (certifications, languages) */
.stack-list{display:flex;flex-direction:column;gap:6px;}
.stack-list li{padding-left:16px;color:var(--fg);}

/* ---- Pills (the site's project-card skill chips) ---- */
.pills{display:flex;flex-wrap:wrap;gap:6px;}
.pill{
  border:1px solid color-mix(in srgb,var(--muted) 30%,transparent);
  border-radius:999px;
  padding:2px 9px;
  font-size:8.5px;
  color:var(--muted);
  line-height:1.5;
}

/* ---- Experience / Education entries ----
   Block flow (not flex) so entries can paginate inside a --flow card. */
.entry{break-inside:avoid;margin-bottom:15px;}
.entry:last-child{margin-bottom:0;}
.entry h3{font-weight:500;font-size:12.5px;color:var(--fg);}
.role-name{color:var(--fg);}
.at{color:var(--muted);}
.company{color:var(--accent-start);}
/* Dates · location sit on their own line under the title. */
.entry-meta{
  color:var(--muted);
  font-size:9px;
  margin-top:2px;
  margin-bottom:6px;
}
.entry-meta .dates{color:var(--accent-end);}
.entry-lines{color:var(--muted);margin-top:2px;}

ul{list-style:none;}
li{
  position:relative;
  padding-left:16px;
  margin-bottom:5px;
  color:var(--fg);
}
li:last-child{margin-bottom:0;}
li::before{
  content:'';
  position:absolute;
  left:2px;
  top:0.72em;
  width:4px;height:4px;
  border-radius:1px;
  background:var(--accent-start);
}
.lead{color:var(--accent-start);}
</style>
</head>
<body>
  <div class="bg"><div class="topo">${topoSvg}</div></div>
  <div class="page">
    <header>
      <p class="microcopy">// Ey up. I'm a ${esc(role)}</p>
      <h1 class="name">${svgText(doc.name, nameW, Math.round(NAME_SIZE * 1.05), NAME_SIZE, 'heather')}</h1>
      ${subhead ? `<p class="subhead">${esc(subhead)}</p>` : ''}
      <div class="contact">${contact}</div>
    </header>
    <div class="columns">
      <div class="col-side">${sidebar}</div>
      <div class="col-main">${main}</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Heather-gradient text as inline SVG. Chrome's PDF rasteriser mis-clips the
 * trailing glyph of CSS background-clip:text (leaving a solid block); an SVG
 * gradient fill vectorises cleanly and reproducibly.
 */
function svgText(text, width, height, fontSize, gradId) {
  const baseline = Math.round(fontSize * 0.82);
  return `<svg role="img" aria-label="${esc(text)}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="${gradId}-${width}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${T.gradFrom}"/>
        <stop offset="0.55" stop-color="${T.gradMid}"/>
        <stop offset="1" stop-color="${T.gradTo}"/>
      </linearGradient>
    </defs>
    <text x="0" y="${baseline}" fill="url(#${gradId}-${width})">${esc(text)}</text>
  </svg>`;
}

// --- Main ----------------------------------------------------------------

const md = readFileSync(join(ROOT, 'docs', 'resume.md'), 'utf8');
const doc = parseResume(md);

const fonts = {
  w400: readFileSync(join(HERE, 'jetbrains-mono-latin-400.woff2.b64'), 'utf8').trim(),
  w500: readFileSync(join(HERE, 'jetbrains-mono-latin-500.woff2.b64'), 'utf8').trim(),
};

// Inline the committed contour SVG (strip its XML/comment preamble, keep the
// <svg> element so it inherits currentColor from .topo).
const rawSvg = readFileSync(
  join(ROOT, 'public', 'topography-south-yorkshire.svg'),
  'utf8'
);
const topoSvg = rawSvg.slice(rawSvg.indexOf('<svg'));

const html = renderHtml(doc, fonts, topoSvg);

const work = mkdtempSync(join(tmpdir(), 'resume-'));
// DEBUG_HTML=<path> keeps a copy of the rendered HTML for visual inspection.
const htmlPath = process.env.DEBUG_HTML ?? join(work, 'resume.html');
const outPath = join(ROOT, 'public', 'resume.pdf');
writeFileSync(htmlPath, html);

try {
  execFileSync(
    CHROME,
    [
      '--headless',
      '--disable-gpu',
      '--no-pdf-header-footer',
      // Let layout + the embedded webfonts settle before printing; without this
      // Chrome can print mid-font-load and drop the last glyph of the clipped
      // gradient name.
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=3000',
      `--print-to-pdf=${outPath}`,
      `file://${htmlPath}`,
    ],
    { stdio: 'inherit' }
  );
  console.log(`Wrote ${outPath}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
