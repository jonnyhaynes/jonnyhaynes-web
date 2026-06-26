import { useEffect, useRef } from 'react';
import { Link } from 'react-router';

import Footer from '../components/Footer';

/**
 * Privacy page. Static content (no data fetching) — folded in from the old
 * standalone public/privacy.html so the whole site shares one footer and one
 * stylesheet. Uses the same font as the rest of the site; no animated gradient.
 */
function Privacy() {
  const contactRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Email assembled at runtime so the address never appears in the raw
    // HTML source that spam scrapers read.
    const user = ['jonny'];
    const domain = ['colouringcode', 'com'];
    const addr = user.join('') + String.fromCharCode(64) + domain.join('.');

    const link = document.createElement('a');
    link.href = `mailto:${addr}`;
    link.textContent = addr;

    const slot = contactRef.current;
    if (slot) {
      slot.textContent = '';
      slot.appendChild(link);
    }
  }, []);

  return (
    <div className="layout-flow">
      <main>
        <article>
          <p className="back">
            <Link to="/">&larr; Back to home</Link>
          </p>

          <h1>Privacy</h1>

          <p>
            This is a small personal website. It does not sell anything, run
            advertising, or build a profile of you. Here is exactly what happens
            when you visit.
          </p>

          <h2>Analytics</h2>
          <p>
            The site uses{' '}
            <a href="https://vercel.com/docs/analytics/privacy-policy">
              Vercel Web Analytics
            </a>{' '}
            to count page views. It is cookieless: it sets no cookies and stores
            nothing on your device. It records aggregate, anonymised data such as
            the page visited, approximate country, referrer, and device type. It
            does not track you across other sites or identify you personally. For
            this reason there is no cookie banner — there are no non-essential
            cookies to consent to.
          </p>

          <h2>Fonts</h2>
          <p>
            Type is served by <a href="https://fonts.bunny.net/">Bunny Fonts</a>,
            a privacy-first, GDPR-compliant font delivery service that sets no
            cookies and does not log personal data.
          </p>

          <h2>Hosting</h2>
          <p>
            The site is hosted on <a href="https://vercel.com/">Vercel</a>, which
            processes standard server request logs (including IP addresses) to
            deliver the site and protect against abuse, in line with its own
            privacy policy.
          </p>

          <h2>Your rights &amp; contact</h2>
          <p>
            Because no personal profile is created and no identifying data is
            stored, there is nothing for you to access or erase here. If you have
            any privacy question, email{' '}
            <span ref={contactRef}>
              <noscript>jonny [at] colouringcode [dot] com</noscript>
            </span>
            .
          </p>
        </article>
      </main>

      <Footer />
    </div>
  );
}

export default Privacy;
