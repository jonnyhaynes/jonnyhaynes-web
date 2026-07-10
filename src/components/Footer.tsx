import { Link } from 'react-router';

/** Site-wide footer. Shared by every page so it stays a single source of truth. */
export function Footer() {
  const year = new Date().getFullYear();

  return (
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
        . &copy; 1985&ndash;{year}.{' '}
        <Link
          to="/privacy"
          className="text-foreground underline decoration-muted/40 underline-offset-4 transition-colors hover:text-accent-start"
        >
          Privacy
        </Link>
        .
      </p>
    </footer>
  );
}
