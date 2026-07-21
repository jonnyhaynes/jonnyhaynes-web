import { Link } from 'react-router';
import { YorkshireRose } from './YorkshireRose';

const LINK =
  'text-foreground underline decoration-muted/40 underline-offset-4 transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

/** Site-wide footer. Shared by every page so it stays a single source of truth. */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto max-w-4xl px-6 py-10 text-sm text-muted">
      <p>
        Forged in Yorkshire
        <YorkshireRose className="mx-1 inline-block size-4 -translate-y-px align-middle" />
        using{' '}
        <a href="https://react.dev/" className={LINK}>
          React
        </a>
        ,{' '}
        <a href="https://vite.dev/" className={LINK}>
          Vite
        </a>{' '}
        &amp;{' '}
        <a href="https://claude.com/claude-code" className={LINK}>
          AI
        </a>
        . &copy; 1985&ndash;{year}.{' '}
        <Link to="/privacy" className={LINK}>
          Privacy
        </Link>
        .
      </p>
    </footer>
  );
}
