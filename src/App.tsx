import { CurrentlyBuildingChip } from './components/CurrentlyBuildingChip';
import { Hero } from './components/Hero';
import { Projects } from './components/Projects';
import { TopographicBackground } from './components/TopographicBackground';
import { ThemeToggle } from './theme/ThemeToggle';

function App() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TopographicBackground />

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
        {/* Skills, Spotify, Reading, Fitbit and Resume/Contact land in later
            phases. */}
      </main>

      <footer className="mx-auto max-w-4xl px-6 py-10 text-sm text-muted">
        <p>
          Forged in Yorkshire using{' '}
          <a
            href="https://react.dev/"
            className="text-foreground underline decoration-muted/40 underline-offset-4 transition-colors hover:text-accent-start"
          >
            React
          </a>{' '}
          &amp;{' '}
          <a
            href="https://vite.dev/"
            className="text-foreground underline decoration-muted/40 underline-offset-4 transition-colors hover:text-accent-start"
          >
            Vite
          </a>
          . &copy; 1985&ndash;{year}.
        </p>
      </footer>
    </div>
  );
}

export default App;
