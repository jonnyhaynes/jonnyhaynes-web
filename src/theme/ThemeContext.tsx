import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ThemeContext, type Theme, type ThemeContextValue } from './context';

const STORAGE_KEY = 'theme';

/** Read the persisted theme, falling back to dark (the site default). */
function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  // Reflect the theme onto <html data-theme> so CSS tokens + the dark: variant
  // switch, and persist the choice.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggle,
      // In dark mode the button turns the light ON; in light mode it turns it OFF.
      toggleTitle:
        theme === 'dark' ? 'Put the big light on' : 'Turn the big light off',
    }),
    [theme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
