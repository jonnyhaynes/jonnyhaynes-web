import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';

import App from '../App';
import { ThemeProvider } from '../theme/ThemeContext';

/**
 * Render entry for the SSR probe (`npm run probe:ssr`).
 *
 * Exists because the site is heading for prerendering, and both of its
 * prerequisites are invisible until something renders without a DOM: that no
 * component touches `window` during render, and that the markup a crawler would
 * get actually contains the content. Neither can be checked in a browser.
 *
 * Not part of the app bundle — only `scripts/ssr-probe.mjs` imports it.
 */
export function render(path: string) {
  return renderToStaticMarkup(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}
