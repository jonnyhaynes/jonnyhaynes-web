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
      className="group relative inline-flex items-center rounded-full border border-muted/30 bg-background/70 p-1 text-foreground backdrop-blur-sm transition-colors hover:border-accent-start hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
    >
      {/* Yorkshire prompt — reveals on hover/focus. Positioned ABSOLUTELY to the
          left of the icon (right-full) so it floats OVER whatever sits beside the
          button (the palette rose) instead of pushing it sideways. Its own pill
          bg + blur keeps it legible over the rose. Slides in from the right +
          fades. aria-hidden: the button already carries the label via aria-label.
          motion-reduce: instant swap. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-full mr-1 whitespace-nowrap rounded-full border border-muted/30 bg-background/90 px-3 py-1 font-mono text-sm opacity-0 backdrop-blur-sm transition-all duration-300 translate-x-1 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
      >
        {toggleTitle}
      </span>
      <span className="inline-flex size-8 shrink-0 items-center justify-center">
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}
