import { useEffect, useState } from 'react';

/**
 * Where the panel's title strip sits, in slots: a whole number when a section is
 * current, fractional during the handover between two. Written on the document
 * element as a CSS custom property — see the note in `measure` — and read by
 * `.strip` in index.css. The name has to appear in both places.
 */
export const STRIP_PROGRESS = '--strip-progress';

/**
 * How much of the viewport a handover occupies, as a fraction of its height. The
 * next section's approach is mapped across this distance before it reaches the
 * reading line, so the strip is still for the whole body of a section and only
 * moves in the run-up to the next one — that stillness is the pause.
 */
const RAMP = 0.4;

type ScrollSpy = {
  /** The section currently occupying the reading line, or null above the first one. */
  active: string | null;
  /** True once scrolled past roughly the first screen — drives the back-to-top control. */
  scrolled: boolean;
};

/**
 * Tracks which section the reader is on, for the nav's active indicator.
 *
 * The winner is the last section whose top edge has crossed the middle of the
 * viewport. One rule covers every case: nothing is marked while the hero fills the
 * first screen, the previous section stays lit while scrolling through a gap, and
 * the final (short) section takes over at the bottom without needing a special
 * case.
 *
 * The document is the only scroll container at every width — the shell doesn't
 * scroll an inner pane — so this measures the viewport and listens on `window`.
 * That used to branch on a breakpoint, because the pane owned the scroll from md
 * up; when the pane became plain content the branch went with it.
 *
 * Geometry is read only inside the effect, never during render, so this stays safe
 * to prerender.
 */
export function useActiveSection(ids: readonly string[]): ScrollSpy {
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const main = document.getElementById('main');
    if (!main) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const height = window.innerHeight;
      // Client coordinates: the viewport's top edge is 0, so the reading line is
      // simply the middle of the window.
      const line = height / 2;
      const ramp = height * RAMP;

      let found: string | null = null;
      let foundIndex = -1;
      let lowest = -Infinity;
      // The nearest section still below the line, for the handover.
      let nextTop = Infinity;

      for (const [index, id] of ids.entries()) {
        const section = main.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        if (!section) continue;
        const sectionTop = section.getBoundingClientRect().top;
        if (sectionTop <= line) {
          if (sectionTop > lowest) {
            lowest = sectionTop;
            found = id;
            foundIndex = index;
          }
        } else if (sectionTop < nextTop) {
          nextTop = sectionTop;
        }
      }

      setActive(found);
      setScrolled(window.scrollY > height / 2);

      // Straight to the DOM rather than into state: this changes on every frame of
      // a scroll, and re-rendering for a transform is exactly what the portrait's
      // parallax avoids. React still re-renders from here, but only when `active`
      // or `scrolled` actually change — at section boundaries, not per frame.
      //
      // The section's index, not how many have been passed: a section whose
      // snapshot hasn't landed renders nothing, and counting the present ones would
      // shift every later slot and name the wrong section. Index + 1 because the
      // portrait is slot 0, and no section found leaves the strip on the portrait.
      const handover =
        nextTop === Infinity ? 0 : Math.min(1, Math.max(0, 1 - (nextTop - line) / ramp));
      document.documentElement.style.setProperty(
        STRIP_PROGRESS,
        String(foundIndex + 1 + handover),
      );
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    // Several sections render nothing until their data resolves, so re-measure
    // when the subtree changes rather than only on mount.
    const mutation = new MutationObserver(schedule);
    mutation.observe(main, { childList: true, subtree: true });

    schedule();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      mutation.disconnect();
      document.documentElement.style.removeProperty(STRIP_PROGRESS);
    };
  }, [ids]);

  return { active, scrolled };
}
