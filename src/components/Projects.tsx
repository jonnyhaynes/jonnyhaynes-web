import { useEffect, useRef } from 'react';

import { useProjects } from '../data/projects';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useScrollProgress } from '../lib/useScrollProgress';
import { CurrentlyBuildingChip } from './CurrentlyBuildingChip';
import { ProjectCard } from './ProjectCard';
import { SectionHeading } from './SectionHeading';

/**
 * The work as a horizontal traverse: the section is made taller than the viewport
 * and its contents stick while the track slides sideways, so scrolling down moves
 * the cards across. The section is the work and nothing else — a figures band used
 * to close it, and was removed: see the note in git history for the reasoning.
 *
 * The travel is a pure function of scroll position — the track is translated by
 * (progress × (window − track) width) — so it runs backwards just as readily as
 * forwards, and nothing accumulates. There is no fade and no cross-fade anywhere.
 *
 * Two fallbacks, both of which drop the pinning entirely and leave the track as an
 * ordinary horizontal scroller that can be swiped:
 * - below `lg`, where a pinned traverse would fight the page on touch;
 * - under `prefers-reduced-motion`, where scroll-driven movement of a large
 *   surface is exactly what the setting is asking us not to do.
 *
 * Keyboard: a card's position on screen is a function of page scroll, so bringing
 * one into view means moving the page, not the track — see `reveal`.
 */
export function Projects() {
  const projects = useProjects();
  const reduced = useReducedMotion();

  const scrollerRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);

  const pinned = !reduced;
  useScrollProgress(scrollerRef, '--projects-p', pinned);

  /**
   * Extend the clipping window to the browser edges, so the cards travel the width
   * of the viewport rather than stopping at the content container.
   *
   * Measured rather than done with `100vw`, for two reasons. The pane sits beside
   * the rail, so the content column isn't centred in the viewport and its two
   * gutters differ — a single symmetric `50vw` offset would be wrong on both sides.
   * And `100vw` includes the scrollbar, so on any platform with classic scrollbars
   * it would widen the page and produce the horizontal overflow this site has
   * already been bitten by.
   *
   * The same two values pad the track, so the first card still lines up with the
   * section heading and the last one stops at the content's right edge — the cards
   * run edge to edge in between without either end losing its alignment.
   */
  useEffect(() => {
    const element = windowRef.current;
    const container = element?.parentElement;
    if (!element || !container) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = container.getBoundingClientRect();
      element.style.setProperty('--bleed-left', `${Math.max(0, rect.left)}px`);
      element.style.setProperty(
        '--bleed-right',
        `${Math.max(0, document.documentElement.clientWidth - rect.right)}px`,
      );
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    // The container's width changes with the breakpoint and as sections mount;
    // its position changes when the rail appears.
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    window.addEventListener('resize', schedule);
    schedule();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, []);

  /**
   * Scroll the page to the position that puts card `index` at the leading edge.
   *
   * The alternative — nudging the track on focus — would make the card's position
   * depend on something other than scroll, and the two would then disagree the
   * moment the reader scrolled again. Moving the page keeps one source of truth.
   */
  const reveal = (index: number) => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track || !pinned) return;

    const travel = scroller.getBoundingClientRect().height - window.innerHeight;
    if (travel <= 0) return;

    const card = track.children[index];
    if (!(card instanceof HTMLElement)) return;

    // Measured from the track so the current transform cancels out.
    const cardX = card.getBoundingClientRect().left - track.getBoundingClientRect().left;
    const viewport = track.parentElement?.clientWidth ?? window.innerWidth;
    const slides = Math.max(0, track.scrollWidth - viewport);
    if (slides <= 0) return;

    const progress = Math.min(1, Math.max(0, cardX / slides));
    const top = window.scrollY + scroller.getBoundingClientRect().top;

    window.scrollTo({
      top: top + progress * travel,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  return (
    <section id="projects" className="scroll-mt-16">
      <div className="projects-scroller" ref={scrollerRef}>
        <div className="projects-sticky">
          {/* The activity chip sits beside the title rather than pinned to the top
              of the page — it's a fact about the work, so it belongs with the work. */}
          <SectionHeading section="projects">
            <CurrentlyBuildingChip />
          </SectionHeading>

          <div className="projects-window" ref={windowRef}>
            {projects.length > 0 ? (
              <ul className="projects-track" ref={trackRef}>
                {projects.map((project, index) => (
                  <ProjectCard
                    key={project.name}
                    project={project}
                    onFocus={() => reveal(index)}
                  />
                ))}
              </ul>
            ) : (
              // Graceful degradation: nothing curated and the GitHub data absent.
              <p className="text-muted">Projects are loading…</p>
            )}
          </div>
        </div>
      </div>

    </section>
  );
}
