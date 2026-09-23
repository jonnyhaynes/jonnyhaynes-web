import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CAREER_LEAD, CREDENTIALS, ROLES, roleSpan } from '../content/career';
import { WORK_PROJECTS } from '../content/projects';
import { useReducedMotion } from '../lib/useReducedMotion';
import { sampleHeight, useTopographyGrid } from '../lib/topography-grid';
import { SectionHeading } from './SectionHeading';

/**
 * Career and credentials: the profile rotated, so time runs down the page.
 *
 * Newest first, because that is the order the page reads in and the order a CV is
 * read in. On a horizontal axis time has to run left to right, which forces
 * oldest-first and sets the section against every other list on the page; down the
 * page the two orderings agree.
 *
 * The spine carries a real vertical cross-section of the same elevation field the
 * background draws — the same canvas the map samples, taken down a fixed northing
 * column. It starts as an outline and fills with colour from the top as the reader
 * moves through the roles, so the section draws its own progress rather than
 * reporting it.
 *
 * The section is about one screen tall and stays there: the wrapper is taller than
 * the viewport and the contents stick inside it, so scrolling moves *through* the
 * roles rather than past them. Which detail is shown is always one role's, in a
 * readout sized once to the tallest — so nothing moves as the active role changes,
 * which is what made the previous version grow and shrink the page.
 *
 * The reveal is a function of scroll position alone, so it runs backwards as
 * readily as forwards and nothing accumulates. There is no fade anywhere.
 *
 * Two fallbacks, both dropping the pinning and the stepping entirely and leaving a
 * plain list with every role's detail open:
 * - below `lg`, where a pinned section fights the page on touch;
 * - under `prefers-reduced-motion`.
 *
 * The awards are deliberately not listed. They are already attached to the projects
 * that won them, and a second copy would say the same thing twice; the credentials
 * block names the count and points at where they live.
 */
export function Career() {
  const grid = useTopographyGrid();
  const reduced = useReducedMotion();
  const pinned = !reduced;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
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
   * Scroll progress through the pin, which drives two things: the fill on the
   * profile, written straight to the element because a scroll-driven paint should
   * not cost a render, and which role is active, which has to be React state
   * because the readout renders from it — so only a change re-renders.
   *
   * Measured from the wrapper's travel rather than the section's own height: the
   * pinned element is shorter than the space it sticks in, so dividing by its own
   * height would run the whole reveal out in the first third of the scroll.
   */
  useEffect(() => {
    const scroller = scrollerRef.current;
    const pin = pinRef.current;
    if (!scroller || !pin || !pinned) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = scroller.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const progress = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      pin.style.setProperty('--career-p', progress.toFixed(4));

      const next = Math.min(
        ordered.length - 1,
        Math.floor(progress * ordered.length),
      );
      setActive((previous) => (previous === next ? previous : next));
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [pinned, ordered.length]);

  /**
   * One readout, sized to the tallest detail so switching roles cannot resize it.
   *
   * Measured from the details themselves rather than guessed: the longest is five
   * bullets and the shortest is one, so any fixed height is either wrong for the
   * longest or wasteful for the rest. A layout effect, so it lands before the first
   * paint, re-run on resize and once the font settles, both of which change how many
   * lines a bullet takes.
   */
  useLayoutEffect(() => {
    const readout = readoutRef.current;
    if (!readout) return;

    const measure = () => {
      let tallest = 0;
      readout.querySelectorAll('.career-detail').forEach((detail) => {
        tallest = Math.max(tallest, Math.ceil(detail.getBoundingClientRect().height));
      });
      if (tallest) readout.style.setProperty('--career-readout-h', `${tallest}px`);
    };

    measure();
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return (
    <section id="career" className="scroll-mt-16">
      <div
        className="career-scroller"
        ref={scrollerRef}
        style={{ '--career-steps': ordered.length } as CSSProperties}
      >
        <div className="career-pin" ref={pinRef}>
          <SectionHeading section="career" />

          <p className="career-lead">{CAREER_LEAD}</p>

          <div className="career-cols" data-pinned={pinned}>
            <div className="career-spine" aria-hidden="true">
              <svg
                className="career-spine-svg"
                viewBox="0 0 200 1400"
                preserveAspectRatio="none"
              >
                <path className="career-terrain-ghost" d={line} />
              </svg>
              {/* Clipped rather than redrawn: the same geometry, revealed from the
                  top by the scroll. */}
              <div className="career-terrain-fill">
                <svg
                  className="career-spine-svg"
                  viewBox="0 0 200 1400"
                  preserveAspectRatio="none"
                >
                  <path className="career-terrain-area" d={area} />
                  <path className="career-terrain-line" d={line} />
                </svg>
              </div>
            </div>

            <ol className="career-roles">
              {ordered.map((role, index) => (
                <li
                  key={`${role.company}-${role.period}`}
                  className="career-role"
                  data-active={index === active}
                >
                  <span className="career-period">{role.period}</span>
                  <span className="career-title">
                    {role.current && <span className="sr-only">Current role: </span>}
                    {role.title}
                  </span>
                  <span className="career-where">
                    {role.company} · {role.place}
                  </span>
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

            {/* Every role's detail is in the markup. The pin only decides which one
                is shown; without JavaScript, or without the pin, they all are. */}
            <div className="career-readout" ref={readoutRef}>
              {ordered.map((role, index) => (
                <ul
                  key={`${role.company}-${role.period}`}
                  className="career-detail"
                  data-active={index === active}
                >
                  {role.detail.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
