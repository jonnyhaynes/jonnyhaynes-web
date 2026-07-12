import { useMemo } from 'react';

import { SITE } from '../content/site';

/** Subject line pre-filled in the reader's mail client. */
const SUBJECT = 'Hello from jonnyhaynes.co.uk';

/**
 * Contact section — the closing call to action. Target of the hero's "Get in
 * Touch" CTA (#contact). "Download Resume" links to the PDF in public/.
 *
 * The email is assembled from parts at runtime rather than written as a literal
 * string, so the full address never sits in the shipped source that spam
 * scrapers read.
 */
export function Contact() {
  const mailto = useMemo(() => {
    const [user, domain, tld] = SITE.emailParts;
    const addr = `${user}${String.fromCharCode(64)}${domain}.${tld}`;
    return `mailto:${addr}?subject=${encodeURIComponent(SUBJECT)}`;
  }, []);

  return (
    <section id="contact" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // Get in touch
      </h2>

      <p className="mt-4 max-w-xl text-lg text-muted">
        Got a project, a role, or just fancy a natter about React? Drop me a line.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <a
          href={mailto}
          className="rounded-md bg-accent-start px-5 py-2.5 font-medium text-background transition-colors hover:bg-accent-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
        >
          Email Me
        </a>
        <a
          href={SITE.resumeUrl}
          className="rounded-md border border-muted/40 bg-background/70 px-5 py-2.5 font-medium text-foreground backdrop-blur-sm transition-colors hover:border-accent-start hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
        >
          Download Resume
        </a>
      </div>
    </section>
  );
}
