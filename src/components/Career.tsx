import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CAREER_LEAD, CREDENTIALS, ROLES, roleSpan } from '../content/career';
import { WORK_PROJECTS } from '../content/projects';
import { sampleHeight, useTopographyGrid } from '../lib/topography-grid';
import { SectionHeading } from './SectionHeading';

/**
 * Career and credentials: the profile rotated, so time runs down the page.
 *
 * Newest first, because that is the order the page reads in and the order a CV is
 * read in. On a horizontal axis time has to run left to right, which forces
 * oldest-first and sets the section against every other list on the page; down
 * the page the two orderings agree.
 *
 * The spine carries a real vertical cross-section of the same elevation field the
 * background draws — the same canvas the map samples, taken down a fixed northing
 * column — with a marker per role. The line draws itself as the section passes the
 * viewport, driven by a custom property written straight onto the element rather
 * than React state, so the reveal costs no render.
 *
 * Scrolling is what drives the section: the role nearest the reading line takes
 * the marker and opens. That is positional, not a fade, and it means the section
 * shows its information without anything having to be hovered for it.
 *
 * Every row reserves the height of its opened state. Without that reservation the
 * reveal would grow and shrink the page under the reader as they scrolled it.
 *
 * Each role is still a native `<details>`, so it opens by click as well, and the
 * first is open in the markup — which is why the no-JS and prerendered page shows
 * a role's detail rather than none.
 *
 * Rows are content-spaced rather than date-scaled. A true-to-scale vertical axis
 * needs around 2380px before 2009, 2010 and 2011 stop colliding — three roles a
 * year apart — so it is not viable at this width. The date scaling lives in the
 * horizontal prototype, where the axis is 735px wide and labels can be staggered.
 *
 * The awards are deliberately not listed. They are already attached to the projects
 * that won them, and a second copy would say the same thing twice; the credentials
 * block names the count and points at where they live.
 */
export function Career() {
  const grid = useTopographyGrid();
  const colsRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLOListElement>(null);
  const marksRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const awards = WORK_PROJECTS.reduce(
    (total, project) => total + project.awards.length,
    0,
  );

  // Authored newest-first already; the sort is what keeps that true if a role is
  // ever added out of order, and the ordering is the section's whole claim.
  const ordered = useMemo(
    () => [...ROLES].sort((a, b) => roleSpan(b.period)[0] - roleSpan(a.period)[0]),
    [],
  );

  const { line, area } = useMemo(() => {
    if (!grid) return { line: '', area: '' };
    const SAMPLES = 160;
    const W = 200;
    const H = 1400;
    const gx = Math.round(grid.cols * 0.35);
    const points: [number, number][] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const gy = (i / SAMPLES) * (grid.rows - 1);
      const height = sampleHeight(grid, gx, gy);
      points.push([14 + height * (W - 28), (i / SAMPLES) * H]);
    }
    const d = points
      .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ');
    return { line: d, area: `${d} L${W},${H} L${W},0 Z` };
  }, [grid]);

  /**
   * Each row reserves the height it has when open, measured rather than guessed.
   *
   * A single shared pitch cannot work here: the longest role's detail is five
   * bullets and the rest are one or two, so reserving the worst case would make the
   * section about 900px taller than it needs to be, and reserving anything less
   * would let the reveal push every row below it down as the scroll moved through —
   * which is a page that grows and shrinks under the reader.
   *
   * A layout effect, so the measuring happens before the first paint rather than as
   * a correction the reader can see. Re-run on resize and once the font has settled,
   * because both change how many lines a detail takes.
   */
  useLayoutEffect(() => {
    const rows = rowsRef.current;
    if (!rows) return;

    const measure = () => {
      rows.querySelectorAll<HTMLLIElement>('[data-row]').forEach((row, index) => {
        const details = row.querySelector('details');
        if (!details) return;

        // Cleared first: min-height counts towards the measurement, so leaving it
        // on would ratchet the reservation up on every pass.
        row.style.setProperty('--career-row-h', 'auto');
        const wasOpen = details.open;
        details.open = true;
        const height = Math.ceil(row.getBoundingClientRect().height);
        details.open = wasOpen;
        row.style.setProperty('--career-row-h', `${height}px`);

        // The marker on the spine has to keep the matching row's pitch or the two
        // columns drift apart down the section.
        const mark = marksRef.current?.children[index];
        if (mark instanceof HTMLElement) {
          mark.style.setProperty('--career-row-h', `${height}px`);
        }
      });
    };

    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const cols = colsRef.current;
    const rows = rowsRef.current;
    if (!cols || !rows) return;

    const onScroll = () => {
      // 0 as the top enters the viewport, 1 as the bottom comes level with the
      // bottom of it — so the line finishes exactly as the section is fully read.
      const rect = cols.getBoundingClientRect();
      const progress = Math.min(
        1,
        Math.max(0, (window.innerHeight - rect.top) / rect.height),
      );
      cols.style.setProperty('--career-p', progress.toFixed(4));

      const readingLine = window.innerHeight * 0.45;
      let nearest = 0;
      let nearestGap = Infinity;
      rows.querySelectorAll('[data-row]').forEach((row, index) => {
        const gap = Math.abs(row.getBoundingClientRect().top + 20 - readingLine);
        if (gap < nearestGap) {
          nearestGap = gap;
          nearest = index;
        }
      });
      setActive((previous) => (previous === nearest ? previous : nearest));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section id="career" className="scroll-mt-16 py-16">
      <SectionHeading section="career" />

      <p className="career-lead">{CAREER_LEAD}</p>

      <div className="career-cols" ref={colsRef}>
        <div className="career-spine" aria-hidden="true">
          <svg
            className="career-spine-svg"
            viewBox="0 0 200 1400"
            preserveAspectRatio="none"
          >
            <path className="career-spine-fill" d={area} />
            <path className="career-spine-line" d={line} pathLength={1} />
          </svg>

          <div className="career-marks" ref={marksRef}>
            {ordered.map((role, index) => (
              <span
                key={`${role.company}-${role.period}`}
                className="career-mark"
                data-active={index === active}
              />
            ))}
          </div>
        </div>

        <ol className="career-roles" ref={rowsRef}>
          {ordered.map((role, index) => (
            <li
              key={`${role.company}-${role.period}`}
              className="career-role"
              data-row
              data-active={index === active}
            >
              <details open={index === active}>
                <summary className="career-summary">
                  <span className="career-period">{role.period}</span>
                  <span className="career-title">
                    {role.current && <span className="sr-only">Current role: </span>}
                    {role.title}
                  </span>
                  <span className="career-where">
                    {role.company} · {role.place}
                  </span>
                  <span className="career-chevron" aria-hidden="true">
                    ▾
                  </span>
                </summary>

                <ul className="career-detail">
                  {role.detail.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ol>

        <div className="career-block">
          <p className="career-block-name">Credentials</p>
          <ul className="career-credentials">
            {CREDENTIALS.map((credential) => (
              <li key={credential.name}>
                {credential.url ? (
                  <a
                    href={credential.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="career-cred-name transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
                  >
                    {credential.name}
                  </a>
                ) : (
                  <span className="career-cred-name">{credential.name}</span>
                )}
                <span className="career-cred-from">
                  {credential.from}
                  {credential.year ? ` · ${credential.year}` : ''}
                </span>
              </li>
            ))}
            <li>
              <span className="career-cred-name">
                {awards} industry award{awards === 1 ? '' : 's'}
              </span>
              <span className="career-cred-from">listed against the work above</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
