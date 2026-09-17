import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { SITE } from '../content/site';
import { sectionHref } from '../content/sections';
import { copy } from '../theme/copy';
import { useTheme } from '../theme/useTheme';
import { FlipWord } from './FlipWord';
import { PortraitFigure } from './PortraitFigure';
import { GitHubIcon, LinkedInIcon } from './icons';

const SOCIAL =
  'text-muted transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

const [WORDS_1, WORDS_2] = SITE.hero.roleWords;
const HOLD_MS = 5000;

/**
 * The first screen. Fills exactly the visible pane — `.hero-screen` subtracts the
 * pane bar's height, so the hero lands flush to the fold at every tier and
 * Projects starts on the next screen.
 *
 * The role is a split-flap board: decorative and aria-hidden, with the readable
 * role carried in a single sr-only span so screen readers and crawlers get one
 * clean sentence rather than the churn of rolling glyphs.
 */
export function Hero() {
  const [i1, setI1] = useState(0);
  const [i2, setI2] = useState(0);
  const { palette } = useTheme();
  const c = copy(palette).hero;

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      if (timer || mediaQuery?.matches) return;
      timer = setInterval(() => {
        setI1((index) => (index + 1) % WORDS_1.length);
        setI2((index) => (index + 1) % WORDS_2.length);
      }, HOLD_MS);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = undefined;
    };
    const handleVisibility = () => (document.hidden ? stop() : start());
    const handleMotion = () => (mediaQuery?.matches ? stop() : start());

    start();
    document.addEventListener('visibilitychange', handleVisibility);
    mediaQuery?.addEventListener('change', handleMotion);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
      mediaQuery?.removeEventListener('change', handleMotion);
    };
  }, []);

  const currentRole = `${WORDS_1[i1]} ${WORDS_2[i2]}`;

  return (
    <section className="hero-screen" aria-labelledby="hero-heading">
      {/* Below lg the portrait belongs to this block rather than to the shell's
          panel, so the first screen is one centred screenful instead of a portrait
          plus a screenful. From lg the panel column carries it. */}
      <div className="lg:hidden">
        <PortraitFigure />
      </div>

      <p className="font-mono text-accent-start">{SITE.hero.microcopy}</p>

      <h1
        id="hero-heading"
        className="hero-headline mt-4 font-extrabold text-display"
      >
        <span className="text-foreground">I’m a </span>
        <span className="sr-only">{currentRole}</span>
        <span className="flip-role" aria-hidden="true">
          <FlipWord words={WORDS_1} index={i1} />
          <FlipWord words={WORDS_2} index={i2} delayMs={150} />
        </span>
      </h1>

      <p className="mt-6 max-w-xl text-lg text-muted">{c.subheadline}</p>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          to={sectionHref('projects')}
          className="rounded-md bg-accent-start px-5 py-2.5 font-medium text-background transition-colors hover:bg-accent-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
        >
          {c.viewWork}
        </Link>
        <Link
          to={sectionHref('contact')}
          className="rounded-md border border-muted/40 bg-background/70 px-5 py-2.5 font-medium text-foreground backdrop-blur-sm transition-colors hover:border-accent-start hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
        >
          {c.getInTouch}
        </Link>

        {/* Plain icons, no button chrome. They take their own line under the
            buttons on a phone and sit to the right of them once there's room. */}
        <div className="flex w-full items-center gap-4 sm:ml-auto sm:w-auto">
          <a
            href={SITE.githubUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub"
            className={SOCIAL}
          >
            <GitHubIcon className="size-6" />
          </a>
          <a
            href={SITE.linkedinUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="LinkedIn"
            className={SOCIAL}
          >
            <LinkedInIcon className="size-6" />
          </a>
        </div>
      </div>

      {/* Decorative — the section navs already carry the real destinations. Only
          from lg, where the panel is a column beside the hero and this screenful
          is a plateau worth signposting. On a phone the portrait sits directly
          above and the content flows straight on, so a scroll cue there would be
          pointing at something already visible. */}
      <p
        aria-hidden="true"
        className="absolute bottom-6 left-0 hidden font-mono text-xs text-muted lg:block"
      >
        scroll
        <span className="ml-2 inline-block animate-bounce motion-reduce:animate-none">
          ↓
        </span>
      </p>
    </section>
  );
}
