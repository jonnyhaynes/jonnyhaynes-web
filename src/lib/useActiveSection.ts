import { useEffect, useState } from 'react';

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

      let found: string | null = null;
      let lowest = -Infinity;
      for (const id of ids) {
        const section = main.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
        if (!section) continue;
        const sectionTop = section.getBoundingClientRect().top;
        if (sectionTop <= line && sectionTop > lowest) {
          lowest = sectionTop;
          found = id;
        }
      }

      setActive(found);
      setScrolled(window.scrollY > height / 2);
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
    };
  }, [ids]);

  return { active, scrolled };
}
