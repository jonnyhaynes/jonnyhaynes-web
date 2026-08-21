import { useEffect, useRef, useState } from 'react';
import { SITE } from '../content/site';
import { FlipWord } from './FlipWord';
import { PortraitFigure } from './PortraitFigure';
import { GitHubIcon, LinkedInIcon } from './icons';

const [WORDS_1, WORDS_2] = SITE.hero.roleWords;
const HOLD_MS = 5000;

export function Hero() {
  const [i1, setI1] = useState(0);
  const [i2, setI2] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const pointerQuery = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const section = sectionRef.current;
    if (!pointerQuery?.matches || motionQuery?.matches || !section) return;

    let frame = 0;
    const reset = () => {
      section.style.setProperty('--portrait-x', '0px');
      section.style.setProperty('--portrait-y', '0px');
    };
    const track = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        section.style.setProperty('--portrait-x', `${x * 12}px`);
        section.style.setProperty('--portrait-y', `${y * 9}px`);
      });
    };

    window.addEventListener('pointermove', track);
    window.addEventListener('pointerleave', reset);
    document.documentElement.addEventListener('mouseleave', reset);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', track);
      window.removeEventListener('pointerleave', reset);
      document.documentElement.removeEventListener('mouseleave', reset);
      reset();
    };
  }, []);

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
    <section ref={sectionRef} className="hero-with-portrait" aria-labelledby="hero-heading">
      <PortraitFigure />
      <div className="min-w-0">
        <p className="font-mono text-accent-start">{SITE.hero.microcopy}</p>
        <h1 id="hero-heading" className="mt-4 text-4xl font-medium tracking-tight sm:text-6xl">
          <span className="text-foreground">I’m a </span>
          <span className="sr-only">{currentRole}</span>
          <span className="flip-role" aria-hidden="true">
            <FlipWord words={WORDS_1} index={i1} />
            <FlipWord words={WORDS_2} index={i2} delayMs={150} />
          </span>
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
      </div>
    </section>
  );
}
