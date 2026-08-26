import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  ThemeContext,
  type Palette,
  type Theme,
  type ThemeContextValue,
} from './context';

const STORAGE_KEY = 'theme';
const PALETTE_STORAGE_KEY = 'palette';

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

/**
 * Resolve the initial palette: a stored choice wins, otherwise `default`. There
 * is no OS signal for this, so first visit is always the heather default. Kept
 * in sync with the pre-paint script in index.html.
 */
function initialPalette(): Palette {
  if (typeof window === 'undefined') return 'default';
  const stored = window.localStorage.getItem(PALETTE_STORAGE_KEY);
  return stored === 'yorkshire' ? 'yorkshire' : 'default';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [palette, setPalette] = useState<Palette>(initialPalette);

  // Reflect the theme onto <html data-theme> so CSS tokens + the dark: variant
  // switch. We do NOT persist here: writing on mount would freeze the
  // system-derived value, so an unset visitor would stop tracking their OS
  // preference after one render. Only an explicit toggle persists (see below).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Reflect the palette onto <html data-palette> so the Yorkshire token
  // overrides + theme-gated copy switch. Same discipline as theme.
  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette);
  }, [palette]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      // Persist only on an explicit user choice.
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const togglePalette = useCallback(() => {
    setPalette((p) => {
      const next = p === 'yorkshire' ? 'default' : 'yorkshire';
      window.localStorage.setItem(PALETTE_STORAGE_KEY, next);
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
      palette,
      togglePalette,
      paletteTitle:
        palette === 'yorkshire' ? 'Help, I’m lost' : 'Make it Yorkshire',
    }),
    [theme, toggle, palette, togglePalette],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
