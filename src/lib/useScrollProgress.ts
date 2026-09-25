import { useEffect, type RefObject } from 'react';

/**
 * Writes an element's scroll progress into a CSS custom property.
 *
 * Progress is 0 when the element's top reaches the top of the viewport and 1 when
 * its bottom reaches the bottom — the fraction of the element's sticky travel
 * that has been scrolled through. It is a pure function of scroll position, which
 * is what makes the motion reversible: scrolling back up runs it backwards, and
 * there is no accumulated state that could get stuck part-way.
 *
 * The value goes into a custom property rather than React state so a
 * scroll-driven transform costs no re-renders — the same approach the background
 * traverse uses.
 *
 * Geometry is read only inside the effect, so this stays safe to prerender.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  property: string,
  enabled = true,
) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = element.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const progress = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
      element.style.setProperty(property, progress.toFixed(4));
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
      element.style.removeProperty(property);
    };
  }, [ref, property, enabled]);
}

/**
 * Writes the *document's* scroll progress into a CSS custom property: 0 at the
 * top of the page, 1 at the bottom.
 *
 * A sibling of `useScrollProgress` rather than a special case of it, because that
 * one measures an element's own sticky travel and this one measures the whole
 * page. Same contract otherwise — rAF-throttled, no re-renders, geometry read only
 * inside the effect so it stays safe to prerender.
 */
export function useDocumentProgress(
  ref: RefObject<HTMLElement | null>,
  property: string,
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const progress =
        scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      element.style.setProperty(property, progress.toFixed(4));
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
      element.style.removeProperty(property);
    };
  }, [ref, property]);
}
