import { useEffect, useRef } from 'react';

import './privacy.css';

const SECTIONS = [
  {
    title: 'Analytics',
    body: (
      <>
        The site uses{' '}
        <a
          href="https://vercel.com/docs/analytics/privacy-policy"
          className="privacy-link"
        >
          Vercel Web Analytics
        </a>{' '}
        to count page views. It is cookieless: it sets no cookies and stores
        nothing on your device. It records aggregate, anonymised data such as the
        page visited, approximate country, referrer, and device type. It does not
        track you across other sites or identify you personally. For this reason
        there is no cookie banner — there are no non-essential cookies to consent
        to.
      </>
    ),
  },
  {
    title: 'Fonts',
    body: (
      <>
        Type is served by{' '}
        <a href="https://fonts.bunny.net/" className="privacy-link">
          Bunny Fonts
        </a>
        , a privacy-first, GDPR-compliant font delivery service that sets no
        cookies and does not log personal data. The desk uses Inter Tight and
        JetBrains Mono.
      </>
    ),
  },
  {
    title: 'Hosting',
    body: (
      <>
        The site is hosted on{' '}
        <a href="https://vercel.com/" className="privacy-link">
          Vercel
        </a>
        , which processes standard server request logs (including IP addresses)
        to deliver the site and protect against abuse, in line with its own
        privacy policy.
      </>
    ),
  },
] as const;

/**
 * The privacy copy, shared by the desk's privacy window and the /privacy page.
 * `headingLevel` keeps the document outline right in both contexts: the page
 * has an h1, the dialog already has its h2 title.
 */
export function PrivacyContent({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const contactRef = useRef<HTMLSpanElement>(null);
  const Heading = (headingLevel === 2 ? 'h2' : 'h3') as 'h2' | 'h3';

  useEffect(() => {
    // The address is assembled at runtime so it never sits in the shipped HTML
    // for scrapers to read.
    const user = ['jonny.d.haynes'];
    const domain = ['gmail', 'com'];
    const address = user.join('') + String.fromCharCode(64) + domain.join('.');
    const subject = encodeURIComponent('Privacy question — www.jonnyhaynes.com');

    const link = document.createElement('a');
    link.href = `mailto:${address}?subject=${subject}`;
    link.textContent = address;
    link.className = 'privacy-link';

    const slot = contactRef.current;
    if (slot) {
      slot.textContent = '';
      slot.appendChild(link);
    }
  }, []);

  return (
    <>
      {SECTIONS.map((section, index) => (
        <section className="privacy-section" key={section.title}>
          <span className="privacy-no" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div>
            <Heading>{section.title}</Heading>
            <p>{section.body}</p>
          </div>
        </section>
      ))}

      <section className="privacy-section">
        <span className="privacy-no" aria-hidden="true">
          04
        </span>
        <div>
          <Heading>Your rights &amp; contact</Heading>
          <p>
            Because no personal profile is created and no identifying data is
            stored, there is nothing for you to access or erase here. If you have
            any privacy question, email{' '}
            <span ref={contactRef}>
              <noscript>jonny.d.haynes [at] gmail [dot] com</noscript>
            </span>
            .
          </p>
        </div>
      </section>
    </>
  );
}
