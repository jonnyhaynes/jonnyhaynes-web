import { useEffect } from 'react';

/**
 * Sets the document title for the route that is showing.
 *
 * The home title lives in index.html, which is right for the first paint — but a
 * client-side route change never touches it, so /privacy would keep the home
 * title in the tab, in history, and in anything that reads the page title. This
 * keeps the one piece of metadata that answers "where am I" in step with the
 * route.
 *
 * Focus is deliberately left alone. Moving it is the other half of the usual
 * client-side-navigation recipe, but only for navigations — a direct load of a
 * route should keep the browser's own focus behaviour — and distinguishing the
 * two is a larger change than the problem warrants on a two-route site whose
 * heading is immediately at the top.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
