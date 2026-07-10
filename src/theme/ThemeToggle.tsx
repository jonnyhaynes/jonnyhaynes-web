import { useTheme } from './useTheme';

/** Sun icon — shown in dark mode (click to bring the light on). */
function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

/** Moon icon — shown in light mode (click to turn the light off). */
function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggle, toggleTitle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={toggleTitle}
      className="group inline-flex items-center gap-2 rounded-full border border-muted/30 py-1 pr-1 pl-3 text-foreground transition-colors hover:border-accent-start hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
    >
      {/* Yorkshire prompt — collapsed by default, reveals on hover/focus.
          aria-hidden because the button already carries the label via
          aria-label; motion-safe so reduced-motion users get an instant swap. */}
      <span
        aria-hidden="true"
        className="max-w-0 overflow-hidden whitespace-nowrap font-mono text-sm opacity-0 transition-all duration-300 group-hover:max-w-40 group-hover:opacity-100 group-focus-visible:max-w-40 group-focus-visible:opacity-100 motion-reduce:transition-none"
      >
        {toggleTitle}
      </span>
      <span className="inline-flex size-8 items-center justify-center">
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}
