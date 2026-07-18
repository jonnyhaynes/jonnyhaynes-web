import { useSpotifyAudiobooks } from '../data/spotify';
import type { SpotifyAudiobook } from '../data/spotify';

/**
 * Reading section — saved audiobooks from Spotify. The most recent book is shown
 * face-out as a large square cover; the rest sit beside it as a stack of
 * horizontal spine "bars" showing their full title and author. Every item links
 * to its Spotify page.
 *
 * Layout: two halves side by side on desktop (cover left, bars right); stacked
 * on mobile (cover on top, bars below).
 *
 * Renders nothing until the list is populated, so before the widened-scope
 * re-auth it simply doesn't appear (graceful degradation).
 */
export function Reading() {
  const data = useSpotifyAudiobooks();
  // Cap at the 7 latest. Spotify has no reading-progress API, so "latest" =
  // most-recently-saved order the API returns.
  const books = (data?.audiobooks ?? []).slice(0, 7);
  if (!books.length) return null;

  const [feature, ...rest] = books;

  return (
    <section id="reading" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // What I’m reading
      </h2>

      <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        {/* Featured cover — full width on mobile, half on desktop. */}
        <div className="md:w-1/2">
          <a
            href={feature.url ?? '#'}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${feature.title} by ${feature.authors} — open on Spotify`}
            className="group block w-full rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-start"
          >
            {feature.cover ? (
              <img
                src={feature.cover}
                alt=""
                className="aspect-square w-full rounded-md object-cover shadow-md transition-transform group-hover:scale-[1.01]"
              />
            ) : (
              <span className="flex aspect-square w-full items-center justify-center rounded-md bg-muted/20 font-mono text-4xl text-muted">
                📖
              </span>
            )}
            <span className="sr-only">
              {feature.title} by {feature.authors}
            </span>
          </a>
        </div>

        {/* The rest — a stack of horizontal spine bars filling the other half. */}
        {rest.length > 0 && (
          <ul className="flex flex-col gap-2 md:w-1/2" role="list">
            {rest.map((b) => (
              <SpineBar key={b.title} book={b} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Accent-palette fallback spine when the baked dominant colour is absent. */
const FALLBACK_SPINE = {
  bg: 'linear-gradient(90deg, var(--color-accent-start), var(--color-accent-end))',
  ink: '#e8ddcb',
};

/**
 * A horizontal book "spine" bar linking to Spotify: a coloured strip (the
 * cover's baked dominant colour) with the full title and author reading
 * left-to-right.
 */
function SpineBar({ book }: { book: SpotifyAudiobook }) {
  const spine = book.spine ?? FALLBACK_SPINE;

  return (
    <li>
      <a
        href={book.url ?? '#'}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={`${book.title} by ${book.authors} — open on Spotify`}
        className="flex min-h-14 flex-col justify-center gap-0.5 rounded-sm px-4 py-2 shadow-[inset_0_2px_3px_rgba(0,0,0,0.25),inset_0_-1px_2px_rgba(255,255,255,0.15)] transition-transform hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
        style={{ background: spine.bg, color: spine.ink }}
      >
        <span className="text-sm font-medium leading-tight tracking-tight">
          {book.title}
        </span>
        <span className="text-xs leading-tight opacity-70">{book.authors}</span>
      </a>
    </li>
  );
}
