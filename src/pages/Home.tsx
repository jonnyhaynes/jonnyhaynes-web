import { useEffect, useRef } from 'react';

import { Contact } from '../components/Contact';
import { Career } from '../components/Career';
import { CurrentlyBuildingChip } from '../components/CurrentlyBuildingChip';
import { Footer } from '../components/Footer';
import { Gaming } from '../components/Gaming';
import { Health } from '../components/Health';
import { Hero } from '../components/Hero';
import { Listening } from '../components/Listening';
import { Projects } from '../components/Projects';
import { Reading } from '../components/Reading';
import { PaletteToggle } from '../theme/PaletteToggle';
import { ThemeToggle } from '../theme/ThemeToggle';

export function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // The hero wash reaches up over the top bar, so it needs the bar's real height.
  // Written straight to a custom property (no re-render) and kept honest by a
  // ResizeObserver, since the chip's copy can change the bar's height.
  useEffect(() => {
    const root = rootRef.current;
    const header = headerRef.current;
    if (!root || !header) return;

    const sync = () => root.style.setProperty('--topbar-h', `${header.offsetHeight}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {/* The // Jonny Haynes line is gone — the hero carries the name now. The
          live "currently building" chip takes its place opposite the toggles.
          relative z-10 keeps the bar above the hero wash, which paints later in
          the flow (the wash is a sibling inside <main>). */}
      <header
        ref={headerRef}
        className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6"
      >
        <CurrentlyBuildingChip />
        <div className="flex items-center gap-2">
          <PaletteToggle />
          <ThemeToggle />
        </div>
      </header>

      <main id="main">
        {/* Prose sections stay at the reading width; the hero's gradient wash
            and the Projects traverse bleed past it to the browser edges, each
            holding its own content measure. */}
        <Hero />
        <div className="mx-auto max-w-6xl px-6">
          <Projects />
        </div>
        {/* The career band bleeds its blurred surface to the browser edges, so it
            sits outside the content wrapper and holds its own reading measure. */}
        <Career />
        <div className="mx-auto max-w-4xl px-6">
          <Listening />
        </div>
        <div className="mx-auto max-w-4xl px-6">
          <Reading />
        </div>
        <div className="mx-auto max-w-4xl px-6">
          <Gaming />
        </div>
        <div className="mx-auto max-w-4xl px-6">
          <Health />
        </div>

        <div className="mx-auto max-w-4xl px-6">
          <Contact />
        </div>
      </main>

      <Footer />
    </div>
  );
}
