import { TILE, PILL } from '../components/tile';
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

/**
 * The big-light toggle, drawn as a plain rail tile to sit with the section links
 * and the palette toggle at equal weight.
 *
 * It carries no on/off styling: it's a mode switch, not a selection, and the icon
 * already says which mode you're in. The label reveals on hover and focus; the
 * accessible name comes from `aria-label`.
 */
export function ThemeToggle() {
  const { theme, toggle, toggleTitle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={toggleTitle}
      className={`${TILE} group`}
    >
      <span aria-hidden="true" className={PILL}>
        {toggleTitle}
      </span>
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
