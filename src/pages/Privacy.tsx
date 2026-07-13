import { useEffect, useRef } from 'react';
import { Link } from 'react-router';

import { Footer } from '../components/Footer';
import { ThemeToggle } from '../theme/ThemeToggle';

const LINK =
  'text-foreground underline decoration-muted/40 underline-offset-4 transition-colors hover:text-accent-start';

/**
 * Privacy page. Static content, served by the /privacy route so the whole
 * site shares one footer and stylesheet. Restyled for V2 (Tailwind); no
 * animated gradient.
 */
export function Privacy() {
  const contactRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Email assembled at runtime so the address never appears in the raw HTML
    // source that spam scrapers read.
    const user = ['jonny.d.haynes'];
    const domain = ['gmail', 'com'];
    const addr = user.join('') + String.fromCharCode(64) + domain.join('.');

    const subject = encodeURIComponent('Privacy question — www.jonnyhaynes.com');
    const link = document.createElement('a');
    link.href = `mailto:${addr}?subject=${subject}`;
    link.textContent = addr;
    link.className = LINK;

    const slot = contactRef.current;
    if (slot) {
      slot.textContent = '';
      slot.appendChild(link);
    }
  }, []);

  return (
    <>
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link to="/" className="font-mono text-sm text-muted transition-colors hover:text-accent-start">
          &larr; Back to home
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <article className="flex flex-col gap-6">
          <h1 className="text-4xl font-medium tracking-tight">Privacy</h1>

          <p className="text-muted">
            This is a small personal website. It does not sell anything, run
            advertising, or build a profile of you. Here is exactly what happens
            when you visit.
          </p>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-medium text-foreground">Analytics</h2>
            <p className="text-muted">
              The site uses{' '}
              <a href="https://vercel.com/docs/analytics/privacy-policy" className={LINK}>
                Vercel Web Analytics
              </a>{' '}
              to count page views. It is cookieless: it sets no cookies and
              stores nothing on your device. It records aggregate, anonymised
              data such as the page visited, approximate country, referrer, and
              device type. It does not track you across other sites or identify
              you personally. For this reason there is no cookie banner — there
              are no non-essential cookies to consent to.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-medium text-foreground">Fonts</h2>
            <p className="text-muted">
              Type is served by{' '}
              <a href="https://fonts.bunny.net/" className={LINK}>
                Bunny Fonts
              </a>
              , a privacy-first, GDPR-compliant font delivery service that sets
              no cookies and does not log personal data.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-medium text-foreground">Hosting</h2>
            <p className="text-muted">
              The site is hosted on{' '}
              <a href="https://vercel.com/" className={LINK}>
                Vercel
              </a>
              , which processes standard server request logs (including IP
              addresses) to deliver the site and protect against abuse, in line
              with its own privacy policy.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-medium text-foreground">Map data</h2>
            <p className="text-muted">
              The background contours are real South Yorkshire relief, derived
              from Ordnance Survey OS Terrain&nbsp;50. Contains OS data &copy;
              Crown copyright and database right 2026, used under the{' '}
              <a
                href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
                className={LINK}
              >
                Open Government Licence v3.0
              </a>
              .
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-medium text-foreground">
              Your rights &amp; contact
            </h2>
            <p className="text-muted">
              Because no personal profile is created and no identifying data is
              stored, there is nothing for you to access or erase here. If you
              have any privacy question, email{' '}
              <span ref={contactRef}>
                <noscript>jonny.d.haynes [at] gmail [dot] com</noscript>
              </span>
              .
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </>
  );
}
