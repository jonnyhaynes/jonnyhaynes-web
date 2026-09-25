import { Contact } from '../components/Contact';
import { Footer } from '../components/Footer';
import { Gaming } from '../components/Gaming';
import { Health } from '../components/Health';
import { Hero } from '../components/Hero';
import { Listening } from '../components/Listening';
import { Projects } from '../components/Projects';
import { Reading } from '../components/Reading';
import { Skills } from '../components/Skills';
import { PaletteToggle } from '../theme/PaletteToggle';
import { ThemeToggle } from '../theme/ThemeToggle';

export function Home() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {/* The // Jonny Haynes line is gone — the hero carries the name now.
          The toggles keep the right edge; the live "currently building" chip has
          moved into the Projects heading, where the work it describes is. */}
      <header className="mx-auto flex max-w-6xl items-center justify-end px-6 py-6">
        <div className="flex items-center gap-2">
          <PaletteToggle />
          <ThemeToggle />
        </div>
      </header>

      <main id="main">
        {/* Hero and prose sections stay at the narrower reading width; the
            Projects traverse measures its own bleed out to the browser edges. */}
        <div className="mx-auto max-w-6xl px-6">
          <Hero />
        </div>
        <div className="mx-auto max-w-6xl px-6">
          <Projects />
        </div>
        <div className="mx-auto max-w-4xl px-6">
          <Skills />
        </div>
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
    </>
  );
}
