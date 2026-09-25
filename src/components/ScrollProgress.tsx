import { useRef } from 'react';

import { useDocumentProgress } from '../lib/useScrollProgress';

/**
 * Where the page is, as a hairline across the top of the window.
 *
 * Fixed rather than in the flow, so it reads as chrome — a report on the page
 * rather than part of it — and full width, because what it shows is the
 * *document's* progress, not any one section's. The ink is the theme's accent, so
 * it is the heather purple in the default palette and blue under Yorkshire.
 *
 * The value goes into a custom property rather than React state, so a
 * scroll-driven transform costs no re-renders — the same approach the hero's
 * boards and the projects traverse use. Geometry is read only inside the effect,
 * so this stays safe to prerender.
 *
 * Decorative: it restates the scroll position the reader (and their browser) can
 * already perceive, so it carries no role and no label.
 */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useDocumentProgress(ref, '--page-progress');

  return (
    <div aria-hidden="true" className="scroll-progress" ref={ref}>
      <span />
    </div>
  );
}
