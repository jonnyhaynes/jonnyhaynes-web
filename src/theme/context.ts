import { createContext } from 'react';

export type Theme = 'dark' | 'light';

/**
 * The colour flavour, independent of light/dark. `default` is the Modern
 * Yorkshire heather palette; `yorkshire` is the blue/gold flag palette. Reflected
 * onto <html data-palette> so CSS token overrides + copy can switch on it.
 */
export type Palette = 'default' | 'yorkshire';

export type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  /** The Yorkshire easter-egg tooltip for the light/dark toggle button. */
  toggleTitle: string;

  palette: Palette;
  togglePalette: () => void;
  /** Hover/aria label for the palette (rose) button. */
  paletteTitle: string;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);
