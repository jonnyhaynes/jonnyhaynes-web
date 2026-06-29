// Parses a LinkedIn data export into public/data/cv.json.
//
// Run (point it at the unzipped export folder, or leave the default):
//   node scripts/parse-cv.mjs ~/Downloads
//
// Reads whichever of these it finds in the given directory:
//   Profile.csv    → headline, summary, location, name
//   Positions.csv  → work history (title, company, dates, description)
//   Skills.csv     → skill tags
//
// Profile.csv alone is enough to produce a useful cv.json; Positions/Skills
// just enrich it when present. Re-run whenever you refresh the export.
//
// No runtime auth — this is a local, one-off (re-runnable) build step. The
// resulting cv.json is committed and read by the About page.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

const SRC_DIR = (process.argv[2] || join(homedir(), 'Downloads')).replace(
  /^~(?=$|\/)/,
  homedir(),
);
const OUT = 'public/data/cv.json';

// --- CSV parsing (RFC 4180: quoted fields, escaped "" quotes, embedded ,\n) -

/** Parse CSV text into an array of row objects keyed by the header row. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1; // skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      // End the row on \n; swallow \r and \r\n.
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  // Trailing field/row with no newline.
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((v) => v !== '')) rows.push(row);
  }

  if (!rows.length) return [];
  const header = rows[0];
  return rows.slice(1).map((r) =>
    Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])),
  );
}

async function readRows(file) {
  const path = join(SRC_DIR, file);
  if (!existsSync(path)) return null;
  return parseCSV(await readFile(path, 'utf8'));
}

// --- Text cleanup ----------------------------------------------------------

/** Decode the handful of HTML entities LinkedIn emits in free text. */
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** Collapse runs of whitespace; trim. */
function tidy(s) {
  return decodeEntities(s).replace(/\s+/g, ' ').trim();
}

/** Split a LinkedIn "Skill1, Skill2 | Pipe-or-comma list" into clean tags. */
function splitList(s) {
  return tidy(s)
    .split(/[,|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

// --- LinkedIn date parsing -------------------------------------------------

/** "Jan 2020" / "2020" / "" → display string, or null for an empty/ongoing. */
function fmtDate(s) {
  const t = tidy(s);
  return t || null;
}

// --- Summary structuring ---------------------------------------------------
//
// LinkedIn's export strips the line breaks from the Summary, gluing the
// "Core Technical Stack" block into one unparseable run (e.g. "CSSBackend &
// CMS:", "Agile methodologies When I am not..."). Rather than fight that
// corrupted text, we extract only what parses reliably — the narrative prose
// and the notable-clients sentence — and drop the stack block from the
// narrative. Skills are supplied as a curated list (see CURATED_SKILLS),
// which is robust and reads better than scraping the mangled blob.

/**
 * Split the summary into { narrative, clients[] }.
 * - narrative: the prose with the mangled "Core Technical Stack" block
 *   removed — the intro plus the personality tail, read as clean sentences.
 * - clients: names from the "major names, including X, Y, and Z" sentence.
 */
function structureSummary(summaryRaw) {
  const full = tidy(summaryRaw);

  // The export runs three blocks together with no line breaks:
  //   <narrative-intro>  Core Technical Stack: <mangled stack>  <personality-tail>
  // Slice OUT the stack block: keep the intro (before "Core Technical Stack:")
  // and the tail (from "When I am not writing code"), which are clean prose.
  const stackIdx = full.search(/Core Technical Stack:/i);
  const tailIdx = full.search(/When I am not writing code/i);

  const introEnd = stackIdx >= 0 ? stackIdx : full.length;
  const intro = full.slice(0, introEnd).trim();
  const tail = tailIdx >= 0 ? full.slice(tailIdx).trim() : '';
  const narrative = [intro, tail].filter(Boolean).join(' ');

  // Notable clients: "...including A, B, C, and D." — pulled from the intro.
  let clients = [];
  const clientMatch = intro.match(/including ([^.]+)\./i);
  if (clientMatch) {
    clients = clientMatch[1]
      .replace(/,?\s+and\s+/i, ', ')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
  }

  return { narrative, clients };
}

// Curated skills, used when Skills.csv isn't in the export. Reflects the real
// stack from the LinkedIn headline + summary (which the export mangles, so we
// don't scrape it). If you export Skills.csv, that takes precedence.
const CURATED_SKILLS = [
  'React Native',
  'Expo',
  'TypeScript',
  'JavaScript',
  'React',
  'Next.js',
  'HTML',
  'CSS',
  'Node.js',
  'Laravel',
  'PHP',
  'WordPress',
  'Filament',
  'RESTful APIs',
  'Redux',
  'AI-Assisted Development',
];

// --- Build -----------------------------------------------------------------

async function main() {
  const profileRows = await readRows('Profile.csv');
  if (!profileRows?.length) {
    console.error(
      `No Profile.csv found in ${SRC_DIR}. Pass the export folder as the first arg.`,
    );
    process.exit(1);
  }
  const p = profileRows[0];

  const positionsRows = (await readRows('Positions.csv')) ?? [];
  const skillsRows = (await readRows('Skills.csv')) ?? [];

  const positions = positionsRows
    .map((r) => ({
      title: tidy(r['Title'] ?? ''),
      company: tidy(r['Company Name'] ?? ''),
      start: fmtDate(r['Started On'] ?? ''),
      end: fmtDate(r['Finished On'] ?? ''),
      description: tidy(r['Description'] ?? ''),
    }))
    .filter((x) => x.title || x.company);

  // Prefer Skills.csv (a "Name" column) when present; otherwise fall back to
  // the curated list — the export mangles the in-summary skills block.
  const exportedSkills = skillsRows
    .map((r) => tidy(r['Name'] ?? Object.values(r)[0] ?? ''))
    .filter(Boolean)
    .slice(0, 24);
  const skills = exportedSkills.length ? exportedSkills : CURATED_SKILLS;

  const { narrative, clients } = structureSummary(p['Summary'] ?? '');

  const payload = {
    generatedAt: new Date().toISOString(),
    name: `${tidy(p['First Name'] ?? '')} ${tidy(p['Last Name'] ?? '')}`.trim(),
    headline: tidy(p['Headline'] ?? ''),
    location: tidy(p['Geo Location'] ?? ''),
    summary: narrative,
    clients,
    positions,
    skills,
    skillsSource: exportedSkills.length ? 'export' : 'curated',
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Wrote ${OUT}: summary (${narrative.length} chars), ${clients.length} clients, ` +
      `${positions.length} positions, ${skills.length} skills (${payload.skillsSource}).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
