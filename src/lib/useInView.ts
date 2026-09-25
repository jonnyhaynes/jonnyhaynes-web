import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

type InViewOptions = {
  /** Stop observing once the element has been seen — the default for a one-shot reveal. */
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
};

/**
 * Whether an element has entered the viewport, observed rather than measured from
 * scroll position. The server render and the first hydrated render both report
 * `false` — nothing reads `window` during render — so the prerendered markup agrees
 * with hydration, and the reveal it drives is an enhancement over content that is
 * already present.
 */
export function useInView(
  ref: RefObject<Element | null>,
  { once = true, rootMargin = '0px 0px -12% 0px', threshold = 0 }: InViewOptions = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, once, rootMargin, threshold]);

  return inView;
}
