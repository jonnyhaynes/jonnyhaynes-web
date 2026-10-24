import { Link } from 'react-router';

import { CursorArrow, MoonIcon, SunIcon } from '../desk/bits';
import { PrivacyContent } from '../desk/PrivacyContent';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useTheme } from '../theme/useTheme';
import '../desk/desk.css';
import '../desk/privacy.css';

/**
 * Direct-link fallback for the privacy policy. In the site itself privacy opens
 * as a desk window; this page keeps /privacy working for external links, app
 * store listings and anyone who bookmarks it.
 */
export function Privacy() {
  useDocumentTitle('Privacy — Jonny Haynes');

  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  const year = new Date().getFullYear();

  return (
    <div className={`desk privacy${dark ? ' dark' : ''}`}>
      <header className="privacy-bar">
        <Link to="/" className="privacy-back">
          <span aria-hidden="true">←</span> Back to the desk
        </Link>
        <button
          type="button"
          className="ctl ctl-ico"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggle}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      <main className="privacy-main">
        <div className="privacy-hero">
          <p className="privacy-kicker mono">THE SMALL PRINT</p>

          <div className="privacy-sel">
            <span className="h h1" aria-hidden="true" />
            <span className="h h2" aria-hidden="true" />
            <span className="h h3" aria-hidden="true" />

            <span className="clabel lb privacy-cursor" aria-hidden="true">
              <span className="cur">
                <CursorArrow ink="#1D3FD1" />
              </span>
              <span className="ltxt">Privacy, but readable</span>
            </span>

            <h1 className="privacy-title">Privacy.</h1>
          </div>

          <p className="privacy-lede">
            This is a small personal website. It doesn’t sell anything, run
            advertising, or build a profile of you. Here is exactly what happens
            when you visit.
          </p>
        </div>

        <article className="privacy-card">
          <PrivacyContent headingLevel={2} />
        </article>

        <footer className="privacy-foot">
          <span>© 1985–{year} Jonny Haynes</span>
          <span className="privacy-sep" aria-hidden="true">
            ·
          </span>
          <Link to="/">Back to the desk</Link>
        </footer>
      </main>
    </div>
  );
}
