import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { SITE } from '../content/site';
import { sectionHref } from '../content/sections';
import { usePointerParallax } from '../lib/pointer';
import { copy } from '../theme/copy';
import { useTheme } from '../theme/useTheme';
import { FlipWord } from './FlipWord';
import { PortraitFigure } from './PortraitFigure';
import { GitHubIcon, LinkedInIcon } from './icons';

const SOCIAL =
  'text-muted transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

const [WORDS_1, WORDS_2] = SITE.hero.roleWords;
const ARTICLES = SITE.hero.articles;
const HOLD_MS = 5000;

/**
 * The article has to agree with whatever word 1 is showing, and word 1 cycles —
 * so "a" and "an" are their own flapper on the headline's first line. Only the
 * first sound matters: "an AI Enthusiast", "a Software Developer".
 *
 * Deliberately a first-letter test rather than a full a/an rule. Every word in
 * the list is phonetically plain, so it's exact for what the site can actually
 * show; a word like "hour" or "university" would need the real rule, and this
 * comment is the note to write one if the list ever grows one.
 */
function articleIndexFor(word: string): number {
  return /^[aeiou]/i.test(word) ? 1 : 0;
}

/**
 * The first screen, as a two-column composition: the portrait in the leading
 * column, the copy and its destinations in the trailing one. It fills exactly the
 * visible pane — `.hero-screen` subtracts the chrome's height, so the hero lands
 * flush to the fold and the first content section starts on the next screen.
 *
 * The portrait belongs to the hero rather than to the shell. It used to be a
 * pinned column of its own — `position: sticky; height: 100dvh` — which held it
 * beside the *whole page* and left an empty third behind once the first screen had
 * gone. Here it scrolls away with the screen it belongs to, so nothing is
 * reserved for it below the fold.
 *
 * Three split-flap boards make up the headline: the article, word 1 and word 2.
 * They're decorative and aria-hidden, with the readable sentence carried in one
 * sr-only span, so screen readers and crawlers get a single clean name rather
 * than the churn of rolling glyphs.
 *
 * The copy and the portrait both travel *with* the cursor, the portrait further
 * than the copy — that difference is what reads as depth. (Measured against the
 * reference: both follow, the image moves about twice as far vertically as the
 * copy, and the two are close to equal horizontally.) It shares the page's single
 * pointer listener, and touch and reduced-motion readers get a still hero.
 */
export function Hero() {
  const [i1, setI1] = useState(0);
  const [i2, setI2] = useState(0);
  const { palette } = useTheme();
  const c = copy(palette).hero;

  const copyRef = useRef<HTMLDivElement>(null);
  usePointerParallax(copyRef, {
    x: 18,
    y: 9,
    varX: '--hero-x',
    varY: '--hero-y',
  });

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
  const articleIndex = articleIndexFor(WORDS_1[i1]);

  return (
    <section className="hero-screen" aria-labelledby="hero-heading">
      {/* The leading column. Below lg it stacks above the copy, which is why the
          gap lives on this wrapper rather than on the copy itself. */}
      <div className="hero-portrait">
        <PortraitFigure />
      </div>

      <div className="hero-body">
        {/* The drifting group. The eyebrow, headline and subheadline move together
            — they read as one block of copy, so splitting them would break the
            paragraph apart as the cursor crossed it. */}
        <div className="hero-copy" ref={copyRef}>
          <p className="font-mono text-2xl text-accent-start lg:text-4xl">
            {SITE.hero.microcopy}
          </p>

          <h1
            id="hero-heading"
            className="hero-headline mt-4 text-masthead lg:mt-8"
          >
            <span className="text-foreground">I’m </span>
            <span className="sr-only">{`${ARTICLES[articleIndex]} ${currentRole}`}</span>

            {/* The article, and the one board that is not in the gradient: it
                reads as part of the sentence rather than as the thing being
                announced, so it keeps the headline's own ink. */}
            <span className="text-foreground" aria-hidden="true">
              <FlipWord
                words={ARTICLES}
                index={articleIndex}
                uppercase={false}
                gradient={false}
              />
            </span>

            <span className="flip-role" aria-hidden="true">
              <FlipWord words={WORDS_1} index={i1} />
              <FlipWord words={WORDS_2} index={i2} delayMs={150} />
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg text-muted">{c.subheadline}</p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to={sectionHref('projects')}
            className="bg-accent-start px-5 py-2.5 font-medium text-background transition-colors hover:bg-accent-end focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
          >
            {c.viewWork}
          </Link>
          <Link
            to={sectionHref('contact')}
            className="border border-muted/40 bg-background/70 px-5 py-2.5 font-medium text-foreground backdrop-blur-sm transition-colors hover:border-accent-start hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
          >
            {c.getInTouch}
          </Link>

          {/* Plain icons, no button chrome. On a phone they take their own line
              under the buttons; from sm they join the same row, sitting alongside
              the two buttons rather than being pushed out to the far edge — the
              row is one group of destinations, so the gap between them is the
              group's own gap and nothing more. */}
          <div className="flex w-full items-center gap-4 sm:w-auto">
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
      </div>

      {/* Decorative — the section navs already carry the real destinations. Only
          from lg, where this screenful is a plateau worth signposting. On a phone
          the content flows straight on, so a cue there would point at something
          already visible. */}
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
