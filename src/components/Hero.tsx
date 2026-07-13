import { SITE } from '../content/site';
import { GitHubIcon, LinkedInIcon } from './icons';

export function Hero() {
  return (
    <section className="flex min-h-[70vh] flex-col justify-center py-16">
      <p className="font-mono text-accent-start">{SITE.hero.microcopy}</p>

      <h1 className="mt-4 text-4xl font-medium tracking-tight sm:text-6xl">
        <span className="text-foreground">I’m a </span>
        <span className="animate-gradient">{SITE.hero.headline}</span>
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
