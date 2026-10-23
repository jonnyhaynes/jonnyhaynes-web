import { createContext } from 'react';

export type Theme = 'dark' | 'light';

export type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  /** The Yorkshire easter-egg tooltip for the light/dark toggle button. */
  toggleTitle: string;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);
