import { useEffect, useState } from 'react';
import { SITE } from '../content/site';
import { FlipWord } from './FlipWord';
import { GitHubIcon, LinkedInIcon } from './icons';

const [WORDS_1, WORDS_2] = SITE.hero.roleWords;
// How long each state holds before the board flips.
const HOLD_MS = 3000;

export function Hero() {
  const [i1, setI1] = useState(0);
  const [i2, setI2] = useState(0);

  useEffect(() => {
    // Respect reduced motion: don't cycle at all, leave the first role showing.
    // Same matchMedia API used in ThemeContext; re-evaluate if the OS setting
    // changes mid-session.
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (timer || mq?.matches) return;
      timer = setInterval(() => {
        // Each flapper advances through its own list, independently.
        setI1((i) => (i + 1) % WORDS_1.length);
        setI2((i) => (i + 1) % WORDS_2.length);
      }, HOLD_MS);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    // Pause when the tab is hidden — no point flipping offscreen.
    const onVisibility = () => (document.hidden ? stop() : start());
    // Respond live to the OS reduced-motion toggle.
    const onMotionChange = () => (mq?.matches ? stop() : start());

    start();
    document.addEventListener('visibilitychange', onVisibility);
    mq?.addEventListener('change', onMotionChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      mq?.removeEventListener('change', onMotionChange);
    };
  }, []);

  const currentRole = `${WORDS_1[i1]} ${WORDS_2[i2]}`;

  return (
    <section className="flex min-h-[70vh] flex-col justify-center py-16">
      <p className="font-mono text-accent-start">{SITE.hero.microcopy}</p>

      <h1 className="mt-4 text-4xl font-medium tracking-tight sm:text-6xl">
        <span className="text-foreground">I’m a </span>
        {/* Single accessible name for the whole role — the flappers are
            decorative motion (aria-hidden inside FlipWord). No live region:
            this must not re-announce on every flip. */}
        <span className="sr-only">{currentRole}</span>
        <FlipWord words={WORDS_1} index={i1} />
        <span className="text-foreground"> </span>
        {/* Stagger the second word so the board flips like a mechanical
            sequence rather than snapping both words at once. */}
        <FlipWord words={WORDS_2} index={i2} delayMs={150} />
      </h1>

      <p className="mt-6 max-w-xl text-lg text-muted">{SITE.hero.subheadline}</p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <a
          href="#projects"
          className="rounded-md bg-accent-start px-5 py-2.5 font-medium text-background transition-colors hover:bg-accent-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
        >
          View My Work
        </a>
        <a
          href="#contact"
          className="rounded-md border border-muted/40 bg-background/70 px-5 py-2.5 font-medium text-foreground backdrop-blur-sm transition-colors hover:border-accent-start hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
        >
          Get in Touch
        </a>

        {/* Mobile: full width forces the icons onto their own row beneath the
            buttons. From sm up: auto width, pushed right on the same row. */}
        <div className="flex w-full items-center gap-3 sm:ml-auto sm:w-auto">
          <a
            href={SITE.githubUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub"
            className="text-muted transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
          >
            <GitHubIcon className="size-6" />
          </a>
          <a
            href={SITE.linkedinUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="LinkedIn"
            className="text-muted transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
          >
            <LinkedInIcon className="size-6" />
          </a>
        </div>
      </div>
    </section>
  );
}
