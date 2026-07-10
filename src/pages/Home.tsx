import { CurrentlyBuildingChip } from '../components/CurrentlyBuildingChip';
import { Footer } from '../components/Footer';
import { Hero } from '../components/Hero';
import { Listening } from '../components/Listening';
import { Projects } from '../components/Projects';
import { Reading } from '../components/Reading';
import { Skills } from '../components/Skills';
import { ThemeToggle } from '../theme/ThemeToggle';

export function Home() {
  return (
    <>
      {/* The // Jonny Haynes line is gone — the hero carries the name now.
          The live "currently building" chip takes its place opposite the
          toggle. */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <CurrentlyBuildingChip />
        <ThemeToggle />
      </header>

      <main>
        {/* Hero and prose sections stay at the narrower reading width; the
            Projects grid manages its own wider container. */}
        <div className="mx-auto max-w-4xl px-6">
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
        {/* Fitbit and Resume/Contact land in later phases. */}
      </main>

      <Footer />
    </>
  );
}
