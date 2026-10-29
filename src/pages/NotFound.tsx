import { Link } from 'react-router';

import { CursorArrow, MoonIcon, SunIcon } from '../desk/bits';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useTheme } from '../theme/useTheme';
import '../desk/desk.css';
import '../desk/privacy.css';
import '../desk/notfound.css';

/**
 * 404. Reuses the standalone-page shell from the privacy route so an unknown
 * URL still lands on the desk — grid paper, selection chrome and all — rather
 * than a blank screen. Only the missing-object bits live in notfound.css.
 */
export function NotFound() {
  useDocumentTitle('Page not found — Jonny Haynes');

  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  const year = new Date().getFullYear();

  return (
    <div className={`desk privacy notfound${dark ? ' dark' : ''}`}>
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
          <p className="privacy-kicker mono">404 · NOTHING ON THE DESK</p>

          <div className="privacy-sel">
            <span className="h h1" aria-hidden="true" />
            <span className="h h2" aria-hidden="true" />
            <span className="h h3" aria-hidden="true" />

            <span className="clabel lb privacy-cursor" aria-hidden="true">
              <span className="cur">
                <CursorArrow ink="#1D3FD1" />
              </span>
              <span className="ltxt">This bit’s gone walkabout</span>
            </span>

            <h1 className="privacy-title">404.</h1>
          </div>

          <div className="nf-ghost" aria-hidden="true">
            <span>MISSING OBJECT</span>
            <span className="nf-ghost-size">0 × 0</span>
          </div>

          <p className="privacy-lede">
            That page isn’t here. Either the link’s gone stale or I’ve been
            having a tidy-up — but nowt’s broken, and everything worth seeing is
            a click away.
          </p>
        </div>

        <article className="privacy-card">
          <Link className="privacy-section nf-row" to="/">
            <span className="privacy-no">01</span>
            <div className="nf-body">
              <h2>The desk</h2>
              <p>
                Back to the full setup — the work, the turntable, the lot.
              </p>
            </div>
            <span className="nf-arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <Link className="privacy-section nf-row" to="/privacy">
            <span className="privacy-no">02</span>
            <div className="nf-body">
              <h2>The small print</h2>
              <p>What this site does — and doesn’t — do with your visit.</p>
            </div>
            <span className="nf-arrow" aria-hidden="true">
              →
            </span>
          </Link>

          <a className="privacy-section nf-row" href="/jonnyhaynes-cv.pdf">
            <span className="privacy-no">03</span>
            <div className="nf-body">
              <h2>The CV</h2>
              <p>The PDF version, if you’re here for the short version.</p>
            </div>
            <span className="nf-arrow" aria-hidden="true">
              →
            </span>
          </a>
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
