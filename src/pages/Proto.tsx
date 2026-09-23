/* Throwaway: three treatments of the career content, for choosing a direction. */
import { useMemo, useState } from 'react';

import { CAREER_LEAD, CAREER_NOW, CREDENTIALS, ROLES, roleSpan } from '../content/career';
import { sampleHeight, useTopographyGrid } from '../lib/topography-grid';
import '../proto/career-proto.css';

const VARIANTS = [
  {
    id: 'a',
    label: 'A — Profile',
    note: 'Time runs left to right along the real terrain, and each role is a tick on that line. Positions are derived from the dates, not laid out by hand, so the gaps between roles are the real gaps. One role is open at a time in the readout. The question this asks: does the map carry the career, or does it get in the way of reading it?',
  },
  {
    id: 'b',
    label: 'B — Ledger',
    note: 'No axis, no rules, no markers, no chevrons. A year gutter in tabular figures and type doing all the work. This is the reductionist end: it strips every piece of chrome the current version carries and lets hierarchy and space carry it instead. The question: is the section heavy because of the words, or because of the furniture around them?',
  },
  {
    id: 'c',
    label: 'C — Tiles',
    note: 'The same facts laid out in space rather than time. Span set large as the anchor, then title, place and a line of detail. This is the widest use of the pane and the most scannable, but it gives up the sense of a career being a sequence. The question: do you want a route, or a set of rooms?',
  },
] as const;

type VariantId = (typeof VARIANTS)[number]['id'];

/* ── shared ──────────────────────────────────────────────────────────────── */

/** "May 2017 — present" → "2017—". */
function spanYears(period: string): string {
  const [from, to] = period.split(' — ');
  const a = from.split(' ')[1];
  return to === 'present' ? `${a}—` : `${a}–${to.split(' ')[1].slice(2)}`;
}

/** "2004 — 2006" → "2004–06". Credentials carry bare years, not months. */
function credentialYears(year?: string): string {
  if (!year) return '';
  const [from, to] = year.split(' — ');
  return to ? `${from}–${to.slice(2)}` : from;
}

/* ── A — Profile ─────────────────────────────────────────────────────────── */

function Profile() {
  const grid = useTopographyGrid();
  const [active, setActive] = useState(ROLES.length - 1);

  // The whole career as one axis: first month to now.
  const [careerStart, careerEnd] = useMemo(() => {
    const starts = ROLES.map((role) => roleSpan(role.period)[0]);
    return [Math.min(...starts), CAREER_NOW];
  }, []);

  const pxOf = (t: number) => ((t - careerStart) / (careerEnd - careerStart)) * 1000;

  // A genuine cross-section of the same field the background draws.
  const { line, area } = useMemo(() => {
    if (!grid) return { line: '', area: '' };
    const SAMPLES = 220;
    const H = 160;
    const gy = Math.round(grid.rows * 0.45);
    const points: [number, number][] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const gx = (i / SAMPLES) * (grid.cols - 1);
      const h = sampleHeight(grid, gx, gy);
      points.push([(i / SAMPLES) * 1000, H - 12 - h * (H - 30)]);
    }
    const d = points
      .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ');
    return { line: d, area: `${d} L1000,${H} L0,${H} Z` };
  }, [grid]);

  const role = ROLES[active];
  const [start, end] = roleSpan(role.period);

  return (
    <div className="proto-a">
      <p className="proto-note">
        <strong>Profile.</strong> {VARIANTS[0].note}
      </p>

      <div className="proto-a-stage">
        <svg
          className="proto-a-profile"
          viewBox="0 0 1000 160"
          preserveAspectRatio="none"
          role="img"
          aria-label="A cross-section of the same elevation field the background draws"
        >
          <path className="proto-a-fill" d={area} />
          <path className="proto-a-line" d={line} />
        </svg>

        {/* Roles sit where their dates put them, drawn on the axis below the ridge. */}
        <div className="proto-a-ticks">
          {ROLES.map((r, i) => {
            const [s] = roleSpan(r.period);
            return (
              <button
                key={`${r.company}-${r.period}`}
                type="button"
                className="proto-a-tick"
                aria-pressed={i === active}
                style={{ left: `${(pxOf(s) / 1000) * 100}%` }}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
              >
                {spanYears(r.period)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="proto-a-readout">
        <p className="proto-a-readout-title">{role.title}</p>
        <p className="proto-a-readout-meta">
          {role.company.toUpperCase()} · {role.place.toUpperCase()} ·{' '}
          {Math.round((end - start) / 31557600000)} YRS
        </p>
        <ul className="proto-a-readout-body" style={{ paddingLeft: '1.1rem' }}>
          {role.detail.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <p className="proto-a-readout-meta" style={{ marginTop: '2.5rem' }}>
        {CREDENTIALS.length} CREDENTIALS
      </p>
    </div>
  );
}

/* ── B — Ledger ──────────────────────────────────────────────────────────── */

function Ledger() {
  return (
    <div className="proto-b">
      <p className="proto-note" style={{ gridColumn: '1 / -1' }}>
        <strong>Ledger.</strong> {VARIANTS[1].note}
      </p>
      <p className="proto-note" style={{ gridColumn: '1 / -1', marginTop: '-1.5rem' }}>
        {CAREER_LEAD}
      </p>

      {ROLES.map((role) => (
        <details key={`${role.company}-${role.period}`} className="proto-b-entry">
          <summary className="proto-b-summary">
            <span className="proto-b-year">{spanYears(role.period)}</span>
            <span>
              <span className="proto-b-title">
                {role.title}
                {role.current && <span className="proto-b-current">now</span>}
              </span>
              <span className="proto-b-where" style={{ display: 'block' }}>
                {role.company} · {role.place}
              </span>
            </span>
          </summary>
          <div />
          <ul className="proto-b-detail" style={{ paddingLeft: '1.1rem' }}>
            {role.detail.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      ))}

      <div className="proto-b-creds" style={{ gridColumn: '1 / -1', marginTop: '3rem' }}>
        <span className="proto-b-year" />
        <span className="proto-b-year" style={{ letterSpacing: '0.14em' }}>
          CREDENTIALS
        </span>
      </div>
      {CREDENTIALS.map((credential) => (
        <div key={credential.name} className="proto-b-entry" style={{ display: 'contents' }}>
          <span className="proto-b-year">{credentialYears(credential.year)}</span>
          <span>
            <span className="proto-b-where" style={{ color: 'var(--color-foreground)' }}>
              {credential.name}
            </span>
            <span className="proto-b-where" style={{ display: 'block' }}>
              {credential.from}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── C — Tiles ───────────────────────────────────────────────────────────── */

function Tiles() {
  return (
    <div>
      <p className="proto-note">
        <strong>Tiles.</strong> {VARIANTS[2].note}
      </p>

      <div className="proto-c">
        {[...ROLES].reverse().map((role) => (
          <div
            key={`${role.company}-${role.period}`}
            className={`proto-c-tile${role.current ? ' proto-c-tile--current' : ''}`}
          >
            <span className="proto-c-span">{spanYears(role.period)}</span>
            <p className="proto-c-title">{role.title}</p>
            <p className="proto-c-where">
              {role.company} · {role.place}
            </p>
            <p className="proto-c-body">{role.detail[0]}</p>
          </div>
        ))}
      </div>

      <p className="proto-c-span" style={{ marginTop: '3rem', fontSize: '1.125rem' }}>
        Credentials
      </p>
      <div className="proto-c" style={{ marginTop: '1rem' }}>
        {CREDENTIALS.map((credential) => (
          <div key={credential.name} className="proto-c-tile">
            <span className="proto-c-span" style={{ fontSize: '1.125rem' }}>
              {credentialYears(credential.year) || '—'}
            </span>
            <p className="proto-c-title">{credential.name}</p>
            <p className="proto-c-where">{credential.from}</p>
          </div>
        ))}
        <div className="proto-c-tile">
          <span className="proto-c-span" style={{ fontSize: '1.125rem' }}>
            4
          </span>
          <p className="proto-c-title">Industry awards</p>
          <p className="proto-c-where">listed against the work above</p>
        </div>
      </div>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export function Proto() {
  const [variant, setVariant] = useState<VariantId>('a');

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10">
      <p className="proto-note" style={{ marginBottom: '1rem' }}>
        Three ways to do the career section. Same content, same palette, three
        different mechanisms.
      </p>

      <div className="proto-bar" role="group" aria-label="Choose a variant">
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            className="proto-tab"
            aria-pressed={v.id === variant}
            onClick={() => setVariant(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {variant === 'a' && <Profile />}
      {variant === 'b' && <Ledger />}
      {variant === 'c' && <Tiles />}
    </div>
  );
}
