import { Link } from 'react-router';

import { copy } from '../theme/copy';
import { useTheme } from '../theme/useTheme';
import { AssetReadout } from './AssetReadout';
import { BuildStamp } from './BuildStamp';
import { FooterNav } from './FooterNav';
import { MapLegend } from './MapLegend';
import { YorkshireRose } from './YorkshireRose';

const LINK =
  'text-foreground underline decoration-muted/40 underline-offset-4 transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start';

/**
 * Decodes to "Ey up. Tha's found t'easter egg." — the same trick typesafe.ai runs
 * with its base64 blocks, and it costs nothing: no bytes, no request, no layout.
 *
 * Decorative and aria-hidden. A screen reader gains nothing from hearing a blob
 * read aloud, and the decoded line lives in the title attribute for anyone who
 * hovers it. Kept out of the visible text content deliberately, so a crawler
 * indexing the page reads prose rather than encoded noise.
 */
const EGG = {
  blob: 'RXkgdXAuIFRoYSdzIGZvdW5kIHQnZWFzdGVyIGVnZy4=',
  decoded: "Ey up. Tha's found t'easter egg.",
};

/** Site-wide footer. Shared by every page so it stays a single source of truth. */
export function Footer() {
  const year = new Date().getFullYear();
  const { palette } = useTheme();
  const c = copy(palette).footer;

  return (
    <footer className="mx-auto w-full max-w-6xl px-6 py-10 text-sm text-muted">
      <FooterNav />

      <p className="mt-6">
        Forged in Yorkshire
        <YorkshireRose className="mx-1 inline-block size-4 -translate-y-px align-middle" />
        {c.using}{' '}
        <a href="https://react.dev/" className={LINK}>
          React
        </a>
        ,{' '}
        <a href="https://vite.dev/" className={LINK}>
          Vite
        </a>{' '}
        {c.andAi}. &copy; 1985&ndash;{year}.{' '}
        <Link to="/privacy" className={LINK}>
          Privacy
        </Link>
        .
      </p>

      {/* Colophon: where the background data comes from, and which build you're
          looking at. Left-aligned all the way to xl, then the build/egg/asset
          block moves to the right-hand end. */}
      <div className="mt-10 flex flex-wrap items-start justify-start gap-8 border-t border-muted/15 pt-8 xl:justify-between">
        <MapLegend />

        <div className="flex flex-col items-start gap-3 xl:items-end">
          <BuildStamp />
          <p
            aria-hidden="true"
            title={EGG.decoded}
            className="font-mono text-[0.6rem] text-muted/50 select-none"
          >
            [b.64] {EGG.blob}
          </p>
          {/* What the page actually fetched, with timings. Sits in the colophon
              because it's build/plumbing detail rather than something a visitor
              needs in front of them while reading. */}
          <AssetReadout />
        </div>
      </div>
    </footer>
  );
}
