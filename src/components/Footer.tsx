import { Link } from 'react-router';

const LINK =
  'text-foreground underline decoration-muted/40 underline-offset-4 transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

/**
 * The Yorkshire white rose — a small heraldic rose sitting inline after
 * "Yorkshire": five pointed petals radiating from a seeded centre, drawn white
 * (the canonical colour) with a hairline outline so it stays visible on the
 * light theme too. Decorative (aria-hidden); the sentence reads fine without it.
 * Sits on the text baseline via align-middle + a small negative nudge. Inline
 * SVG keeps to the site's no-external-assets convention.
 */
function YorkshireRose() {
  // Five broad, rounded petals at 72° apart (top first, then clockwise). Each
  // petal fans out from the centre with rounded shoulders and a soft point at
  // the rim, wide enough that neighbouring petals nearly meet — a filled rose,
  // not a spiky star. Same path rotated about the 12,12 centre; a darker seeded
  // centre finishes it.
  const petal =
    'M12 12 C8.4 10.4 6.1 7.9 6.2 5 C6.3 3 8.9 2 12 2 C15.1 2 17.7 3 17.8 5 C17.9 7.9 15.6 10.4 12 12 Z';
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="mx-1 inline-block size-4 -translate-y-px align-middle text-white"
    >
      <g
        fill="currentColor"
        stroke="var(--color-accent-end)"
        strokeWidth="0.75"
        strokeLinejoin="round"
      >
        {[0, 72, 144, 216, 288].map((deg) => (
          <path key={deg} d={petal} transform={`rotate(${deg} 12 12)`} />
        ))}
        {/* Seeded centre — a small accent disc so the rose reads as heraldic
            rather than a plain flower. */}
        <circle
          cx="12"
          cy="12"
          r="2.4"
          fill="var(--color-accent-start)"
          stroke="none"
        />
      </g>
    </svg>
  );
}

/** Site-wide footer. Shared by every page so it stays a single source of truth. */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto max-w-4xl px-6 py-10 text-sm text-muted">
      <p>
        Forged in Yorkshire
        <YorkshireRose />
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
          Claude
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
