import { createContext, useContext } from 'react';

export type ActiveSection = {
  /** The section occupying the reading line, or null above the first one. */
  active: string | null;
  /** True once scrolled past roughly the first screen — drives the back-to-top control. */
  scrolled: boolean;
};

/**
 * Carries the shell's scroll state to whoever needs it.
 *
 * It exists for the profile panel: `PanelShell` builds that element outside
 * `ShellFrame`, so props can't reach it, and calling `useActiveSection` again in
 * there would mean two observers of the same page disagreeing about where the
 * reader is. One call site, one answer, read from wherever it's needed.
 *
 * The provider is the raw `Context.Provider` in `ShellFrame` rather than a wrapper
 * component here: this file exports no components, so fast refresh stays working
 * — the repo's other hooks live in plain `.ts` files for the same reason.
 */
export const ActiveSectionContext = createContext<ActiveSection | null>(null);

/**
 * Throws rather than returning a default: a nav silently falling back to "nothing
 * is active" looks like a bug in the tracking, and would be chased in the wrong
 * place.
 */
export function useActiveSectionContext(): ActiveSection {
  const value = useContext(ActiveSectionContext);
  if (!value) {
    throw new Error('useActiveSectionContext used outside ActiveSectionContext');
  }
  return value;
}
