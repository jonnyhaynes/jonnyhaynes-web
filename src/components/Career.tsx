import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { CAREER_LEAD, CREDENTIALS, ROLES } from '../content/career';
import { WORK_PROJECTS } from '../content/projects';
import { useHydrated } from '../lib/useHydrated';
import { useInView } from '../lib/useInView';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useReducedMotion } from '../lib/useReducedMotion';
import { SectionHeading } from './SectionHeading';

const TAB_ID = (index: number) => `career-tab-${index}`;
const PANEL_ID = (index: number) => `career-panel-${index}`;

/** Milliseconds per character typed, and the gap between one title starting and the next. */
const TYPE_STEP = 75;
const TYPE_STAGGER = 220;

/** "May 2017 — present" → "2017", the index year a tab carries. */
function startYear(period: string): string {
  return period.split(' — ')[0].split(' ')[1];
}

/** The other end of the same period: "May 2017 — present" → "present". */
function endLabel(period: string): string {
  const end = period.split(' — ')[1];
  return end === 'present' ? 'present' : end.split(' ')[1];
}

/**
 * Career and credentials — the CV's own facts, in the page's own vocabulary.
 *
 * From `lg` the section is two columns: the roles stack in a single list on the left
 * and the selected role's detail fills the right. Below `lg` it is an accordion —
 * the detail opens under the title that was picked, and nothing is open on arrival,
 * so a phone is never handed six roles of prose at once.
 *
 * Both arrangements are one DOM: each role is a list item holding its title and its
 * panel, so the panel is always in the right place for an accordion, and from `lg`
 * the item's own box is dropped (`display: contents`) so its two children join the
 * column grid directly.
 *
 * Every role's detail is in the markup and visible by default; the tab behaviour is
 * added on top only once JavaScript is running (the `data-enhanced` attribute), so a
 * reader without it — or a crawler — gets the whole career history as a plain list.
 *
 * Each role title is typed out one character at a time, staggered down the list, once
 * when the section first comes into view. The string is sliced rather than clipped, so
 * the characters still to come reserve their space and the cursor rides the insertion
 * point — which a clip-path could not do across these wrapping titles, since a clip
 * sweeps a vertical line and reveals every line from the left at once.
 *
 * The typed title is decorative; the readable one is an sr-only copy beside it. Under
 * `prefers-reduced-motion` the titles are simply present.
 */
export function Career() {
  const sectionRef = useRef<HTMLElement>(null);
  const desktop = useMediaQuery('(min-width: 64rem)');

  const enhanced = useHydrated();
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  // The desktop layout always has a role on show, so reaching that layout counts as
  // opening the current one. Without this the two layouts disagree about the reader's
  // place: widening the window would keep the role they were reading, but narrowing
  // it would collapse the detail back into the list. Adjusted during render rather
  // than in an effect — the same pattern FlipWord uses.
  if (desktop && !open) setOpen(true);

  // The reveal latches: `useInView` stops observing once the section has been seen,
  // so `inView` never falls back to false.
  const inView = useInView(sectionRef);
  const reduced = useReducedMotion();

  // The reveal: one character per `TYPE_STEP`, each title starting `TYPE_STAGGER` after
  // the one above it. `frame` is the tick count, advanced only by the timer — async, so
  // it doesn't cascade a render — and the interval stops once the longest title is done.
  const [frame, setFrame] = useState(0);
  const animating = enhanced && inView && !reduced;

  useEffect(() => {
    if (!animating) return;
    const longest = ROLES.reduce((most, role) => Math.max(most, role.title.length), 0);
    const total = longest * TYPE_STEP + (ROLES.length - 1) * TYPE_STAGGER;
    let ticks = 0;
    const interval = setInterval(() => {
      ticks += 1;
      setFrame(ticks);
      if (ticks * TYPE_STEP >= total) clearInterval(interval);
    }, TYPE_STEP);
    return () => clearInterval(interval);
  }, [animating]);

  /**
   * How much of title `index` has been typed so far. With motion off — or before
   * JavaScript runs — the whole title is present, so nothing is ever hidden from a
   * reader who cannot run the reveal.
   */
  const typedChars = (index: number, length: number) => {
    if (!enhanced || reduced) return length;
    if (!inView) return 0;
    const chars = Math.floor((frame * TYPE_STEP - index * TYPE_STAGGER) / TYPE_STEP) + 1;
    return Math.min(length, Math.max(0, chars));
  };

  const awards = WORK_PROJECTS.reduce(
    (total, project) => total + project.awards.length,
    0,
  );

  // Whether the detail is on show. On a phone nothing is open until a title is
  // picked; from `lg` the layout itself keeps one open. Without JavaScript nothing is
  // hidden at all, which is what the served HTML renders.
  const shown = (index: number) => !enhanced || (index === active && open);

  const choose = (index: number) => {
    if (desktop) {
      setActive(index);
      return;
    }
    if (open && index === active) {
      setOpen(false);
      return;
    }
    setActive(index);
    setOpen(true);
  };

  return (
    <section
      id="career"
      ref={sectionRef}
      className="career-section section-screen scroll-mt-16"
    >
      <div className="mx-auto max-w-4xl px-6 py-16">
        <SectionHeading section="career" />

        <p className="career-lead">{CAREER_LEAD}</p>

        <div
          className="career-split"
          data-enhanced={enhanced ? '' : undefined}
        >
          <ul
            className="career-list"
            style={{ gridTemplateRows: `repeat(${ROLES.length}, auto)` } as CSSProperties}
          >
            {ROLES.map((role, index) => {
              const typed = typedChars(index, role.title.length);
              const isActive = index === active && open;
              return (
                <li key={`${role.company}-${role.period}`} className="career-item" data-active={isActive}>
                  <button
                    id={TAB_ID(index)}
                    type="button"
                    aria-expanded={shown(index)}
                    aria-controls={PANEL_ID(index)}
                    onClick={() => choose(index)}
                    className="career-tab"
                    data-active={isActive}
                  >
                    <span className="career-tab-body">
                      {/* Sliced rather than clipped: the part still to come keeps its
                          space, so the cursor sits at the insertion point and follows the
                          title onto a second line. */}
                      <span
                        className="career-tab-title"
                        aria-hidden={enhanced || undefined}
                      >
                        {enhanced ? (
                          <>
                            {role.title.slice(0, typed)}
                            <span className="career-caret animate-pulse motion-reduce:animate-none">
                              _
                            </span>
                            <span className="career-tab-rest">
                              {role.title.slice(typed)}
                            </span>
                          </>
                        ) : (
                          role.title
                        )}
                      </span>
                      {enhanced ? <span className="sr-only">{role.title}</span> : null}
                      <span className="career-tab-meta">
                        {role.company} · {startYear(role.period)} — {endLabel(role.period)}
                      </span>
                    </span>
                  </button>

                  {/* An accordion below `lg` — the detail opens under its own title.
                      From `lg` the item's box is dropped and its two children join the
                      grid directly, so the titles stack in one column and the open
                      panel fills the other.

                      No title or dates here: the tab beside it already names the role
                      and carries its period. The place is the one thing the tab does
                      not say, so it is the one thing this line says. */}
                  <div
                    id={PANEL_ID(index)}
                    className="career-panel"
                    data-active={shown(index)}
                  >
                    <p className="career-panel-meta">{role.place}</p>
                    <ul className="career-panel-list">
                      {role.detail.map((entry) => (
                        <li key={entry}>{entry}</li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <dl className="career-credentials">
          {CREDENTIALS.map((credential) => (
            <div
              key={credential.name}
              className="career-credential rounded-lg border border-muted/20 bg-background/70 p-3 backdrop-blur-sm"
            >
              <dt className="career-cred-name">
                {credential.url ? (
                  <a
                    href={credential.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
                  >
                    {credential.name}
                  </a>
                ) : (
                  credential.name
                )}
              </dt>
              <dd className="career-cred-from">
                {credential.from}
                {credential.year ? ` · ${credential.year}` : ''}
              </dd>
            </div>
          ))}
          <div className="career-credential rounded-lg border border-muted/20 bg-background/70 p-3 backdrop-blur-sm">
            <dt className="career-cred-name">
              {awards} industry award{awards === 1 ? '' : 's'}
            </dt>
            <dd className="career-cred-from">listed against the work above</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
