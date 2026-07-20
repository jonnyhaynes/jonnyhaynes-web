import type { CSSProperties } from 'react';
import { useSpotifyAudiobooks } from '../data/spotify';
import type { SpotifyAudiobook } from '../data/spotify';

/**
 * Reading section — saved audiobooks from Spotify, rendered as a bookshelf.
 *
 * Desktop: the most-recent book stands face-out in the centre as a large square
 * cover (the "display copy"); the other six stand on their ends as tall vertical
 * spines — two on the left leaning right into the cover, four on the right
 * leaning left into it. Title + author run up each spine (rotated 90°) and every
 * item links to its Spotify page.
 *
 * Mobile: falls back to a simple stacked flow — the cover on top, horizontal
 * spine bars below — since the leaning shelf illusion needs the horizontal room.
 *
 * Renders nothing until the list is populated, so before the widened-scope
 * re-auth it simply doesn't appear (graceful degradation). See index.css
 * ".bookshelf" for the shelf/lean styling.
 */
export function Reading() {
  const data = useSpotifyAudiobooks();
  // Cap at the 7 latest. Spotify has no reading-progress API, so "latest" =
  // most-recently-saved order the API returns.
  const books = (data?.audiobooks ?? []).slice(0, 7);
  if (!books.length) return null;

  const [feature, ...rest] = books;
  // Split the remaining six: two lean against the left of the cover, four the
  // right. If fewer than seven came back, the left side takes up to two and the
  // rest go right, so short lists still look intentional.
  const left = rest.slice(0, 2);
  const right = rest.slice(2);

  return (
    <section id="reading" className="scroll-mt-16 py-16">
      {/* Title constrained to the narrower "What I'm playing" width. That
          section is `max-w-4xl px-6`, so its content is 4xl minus the px-6
          padding — we match both the max-width and the padding here (and on the
          shelf line) so the edges line up exactly, not just the outer box. */}
      <h2 className="mx-auto max-w-4xl px-6 font-mono text-sm uppercase tracking-wider text-muted">
        // What I’m reading
      </h2>

      {/* Mobile / small screens: stacked cover + horizontal bars. */}
      <div className="mt-8 flex flex-col gap-4 md:hidden">
        <FeatureCover book={feature} className="w-full max-w-xs" />
        {rest.length > 0 && (
          <ul className="flex flex-col gap-2" role="list">
            {rest.map((b) => (
              <SpineBar key={b.title} book={b} horizontal />
            ))}
          </ul>
        )}
      </div>

      {/* Desktop: the leaning bookshelf — one row of spines standing on their
          ends, with the face-out cover in the centre. The books span the full
          6xl row; the shelf line beneath them is a separate element pulled in to
          4xl (see below), so the line matches "What I'm playing" width while the
          books stay wide. */}
      <ul
        className="bookshelf mt-10 hidden items-end justify-center gap-3 md:flex"
        role="list"
      >
        {/* Left pair — lean right, into the cover. Outermost (i=0) leans most.
            `pos` indexes into the size table so no two neighbours match. */}
        {left.map((b, i) => (
          <SpineBar
            key={b.title}
            book={b}
            lean={left.length === 2 ? [8, 4][i] : 5}
            heightFrac={SPINE_FRACTIONS[i % SPINE_FRACTIONS.length]}
          />
        ))}

        {/* Centre display copy — upright, face-out, up to a third of the row. */}
        <li className="mx-3 w-1/3 shrink-0 self-end">
          <FeatureCover book={feature} className="w-full" />
        </li>

        {/* Right four — lean left, into the cover. Grows outward: -4…-10deg. */}
        {right.map((b, i) => (
          <SpineBar
            key={b.title}
            book={b}
            lean={-(4 + i * 2)}
            heightFrac={
              SPINE_FRACTIONS[(i + left.length) % SPINE_FRACTIONS.length]
            }
          />
        ))}
      </ul>

      {/* The shelf line — centered and constrained to the same 4xl + px-6 as the
          title (and "What I'm playing") so its edges line up with that section,
          narrower than the row of books above it. The border lives on an inner
          element so the px-6 padding actually insets the visible line (a border
          on the padded box would still span the full width). Desktop only. */}
      <div className="mx-auto hidden max-w-4xl px-6 md:block">
        <div className="book-shelf-line" />
      </div>
    </section>
  );
}

/** The face-out cover for the featured book. */
function FeatureCover({
  book,
  className = '',
}: {
  book: SpotifyAudiobook;
  className?: string;
}) {
  return (
    <a
      href={book.url ?? '#'}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`${book.title} by ${book.authors} — open on Spotify`}
      className={`book-feature group block self-end rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-start ${className}`}
    >
      {book.cover ? (
        <img
          src={book.cover}
          alt=""
          className="aspect-square w-full rounded-md object-cover transition-transform group-hover:scale-[1.01]"
        />
      ) : (
        <span className="flex aspect-square w-full items-center justify-center rounded-md bg-muted/20 font-mono text-4xl text-muted">
          📖
        </span>
      )}
      <span className="sr-only">
        {book.title} by {book.authors}
      </span>
    </a>
  );
}

/** Accent-palette fallback spine when the baked dominant colour is absent. */
const FALLBACK_SPINE = {
  bg: 'linear-gradient(90deg, var(--color-accent-start), var(--color-accent-end))',
  ink: '#e8ddcb',
};

/**
 * Spine heights as a fraction of the centre cover's height — each book stands
 * roughly four-fifths to nearly the full height of the display copy, varied so
 * the shelf reads as a real mix of book sizes rather than six identical bars.
 * Width isn't fixed: each
 * spine grows as thick as its title needs to wrap into (see .book-spine in
 * index.css), so a long title makes a fatter book. Assigned by shelf position
 * (not book identity) so the shape stays stable across data refreshes.
 */
const SPINE_FRACTIONS = [0.92, 0.8, 0.98, 0.85, 0.94, 0.78];

/**
 * A book "spine" linking to Spotify: a coloured strip in the cover's baked
 * dominant colour showing the full title and author.
 *
 * On the desktop shelf (default) it's a tall vertical spine standing on its end,
 * with the text rotated to read up the spine and a `lean` angle (deg) tilting it
 * against the display copy. With `horizontal` (mobile) it's a wide bar with the
 * text reading left-to-right, matching the stacked fallback layout.
 */
function SpineBar({
  book,
  lean,
  heightFrac,
  horizontal = false,
}: {
  book: SpotifyAudiobook;
  lean?: number;
  heightFrac?: number;
  horizontal?: boolean;
}) {
  const spine = book.spine ?? FALLBACK_SPINE;

  if (horizontal) {
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
          <span className="text-xs leading-tight opacity-70">
            {book.authors}
          </span>
        </a>
      </li>
    );
  }

  return (
    <li>
      <a
        href={book.url ?? '#'}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={`${book.title} by ${book.authors} — open on Spotify`}
        className="book-spine flex items-center justify-center rounded-sm px-2 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
        style={
          {
            background: spine.bg,
            color: spine.ink,
            ...(lean != null
              ? {
                  '--lean': `${lean}deg`,
                  // Pivot on the bottom corner the book leans onto (its lower
                  // resting corner): leaning right (positive) rests on its
                  // bottom-right corner, leaning left on bottom-left. Pivoting
                  // there keeps that corner nailed to the baseline so the base
                  // sits flush instead of the far corner dipping below the shelf.
                  '--pivot-x': lean > 0 ? 'right' : 'left',
                }
              : {}),
            ...(heightFrac != null ? { '--spine-frac': `${heightFrac}` } : {}),
          } as CSSProperties
        }
      >
        <span className="book-spine-text flex items-baseline gap-1.5">
          <span className="text-sm font-medium leading-tight tracking-tight">
            {book.title}
          </span>
          <span className="shrink-0 text-xs leading-tight opacity-70">
            {book.authors}
          </span>
        </span>
      </a>
    </li>
  );
}
