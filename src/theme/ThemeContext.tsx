import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ThemeContext, type Theme, type ThemeContextValue } from './context';

const STORAGE_KEY = 'theme';

/**
 * Resolve the initial theme: an explicit stored choice always wins; otherwise
 * fall back to the OS `prefers-color-scheme` on first visit, and dark if that's
 * unavailable/unset. Kept in sync with the pre-paint script in index.html.
 */
function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  // Reflect the theme onto <html data-theme> so CSS tokens + the dark: variant
  // switch. We do NOT persist here: writing on mount would freeze the
  // system-derived value, so an unset visitor would stop tracking their OS
  // preference after one render. Only an explicit toggle persists (see below).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      // Persist only on an explicit user choice.
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggle,
      // In dark mode the button turns the light ON; in light mode it turns it OFF.
      // Light Yorkshire twang (drop "the").
      toggleTitle:
        theme === 'dark' ? 'Put big light on' : 'Turn big light off',
    }),
    [theme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
