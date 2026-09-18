import type { CSSProperties } from 'react';
import { useSpotifyAudiobooks } from '../data/spotify';
import type { SpotifyAudiobook } from '../data/spotify';
import { SectionHeading } from './SectionHeading';

/**
 * Reading section — saved audiobooks from Spotify, rendered as a bookshelf.
 *
 * Desktop: the most-recent book stands face-out in the centre as a large square
 * cover (the "display copy"); the other six stand on their ends as tall vertical
 * spines — two on the left leaning right into the cover, four on the right
 * leaning left into it. Title + author run up each spine (rotated 90°) and every
 * item links to its Spotify page.
 *
 * Five books show below `xl` and seven above it. That isn't about crowding: a
 * spine's type has a legible minimum, and with seven books at `lg` there is only
 * room for 21 characters of it — no title at all. Five narrows the row enough that
 * every spine holds 64+, which is a real title and author.
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
  // Split the rest: two lean against the left of the cover, four the right. If
  // fewer than seven came back, the left side takes up to two and the rest go
  // right, so short lists still look intentional.
  const left = rest.slice(0, 2);
  const right = rest.slice(2);

  return (
    <section id="reading" className="scroll-mt-16 py-16">
      {/* Title and shelf line both sit in the section's own box, which now fills
          the shell's single content container — so they share a width and left
          edge with every other section at every screen size, with no classes. */}
      <SectionHeading section="reading" />

      {/* Mobile only: stacked cover + horizontal bars. The leaning shelf takes
          over at `md` (tablet and up). */}
      <div className="mt-8 flex flex-col gap-4 md:hidden">
        <FeatureCover book={feature} className="w-full" />
        {rest.length > 0 && (
          <ul className="flex flex-col gap-2" role="list">
            {rest.map((b) => (
              <SpineBar key={b.title} book={b} horizontal />
            ))}
          </ul>
        )}
      </div>

      {/* Desktop: the leaning bookshelf — one row of spines standing on their
          ends, with the face-out cover in the centre. Every section now shares
          the shell's single content container, so the row fills it directly: the
          old max-w-4xl → max-w-6xl breakout this used to need is gone. */}
      <ul
        className="bookshelf mt-10 hidden w-full items-end justify-center gap-4 md:flex"
        role="list"
        // How many books share the row, so the spine type can work out the width
        // it has as well as the height it has.
        style={{ '--spines': String(books.length - 1) } as CSSProperties}
      >
        {/* Left pair — lean right, into the cover. Outermost (i=0) leans most.
            `pos` indexes into the size table so no two neighbours match. */}
        {left.map((b, i) => (
          <SpineBar
            key={b.title}
            book={b}
            side="left"
            lean={left.length === 2 ? [8, 4][i] : 5}
            heightFrac={SPINE_FRACTIONS[i % SPINE_FRACTIONS.length]}
          />
        ))}

        {/* Centre display copy — upright, face-out, up to a third of the row. */}
        <li className="mx-4 w-1/3 shrink-0 self-end">
          <FeatureCover book={feature} className="w-full" />
        </li>

        {/* Right four — lean left, into the cover. Grows outward: -4…-10deg. The
            last two are held back below `xl`, where a spine can't hold a real
            title at the minimum type size. */}
        {right.map((b, i) => (
          <SpineBar
            key={b.title}
            book={b}
            side="right"
            lean={-(4 + i * 2)}
            heightFrac={
              SPINE_FRACTIONS[(i + left.length) % SPINE_FRACTIONS.length]
            }
            wideOnly={i >= 2}
          />
        ))}
      </ul>

      {/* The shelf line spans the section's content width — the same width as
          the books row above it and as the title. No max-width/padding of its
          own, so it can't drift from either. Shown with the leaning shelf (`md`)
          only. */}
      <div className="book-shelf-line hidden md:block" />
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
      className={`book-feature group block self-end focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-start ${className}`}
    >
      {book.cover ? (
        <img
          src={book.cover}
          alt=""
          className="aspect-square w-full object-cover transition-transform group-hover:scale-[1.01]"
        />
      ) : (
        <span className="flex aspect-square w-full items-center justify-center bg-muted/20 font-mono text-4xl text-muted">
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
 * The most characters a spine can carry and still hold the minimum type size on
 * the tightest shelf: five books below `xl`, where each gets ~75px by ~142px of
 * usable height, which is three columns at 0.6875rem — 64 characters.
 *
 * Derived from the floor rather than chosen; change both together. The reason the
 * shelf drops to five books below `xl` is this number: at seven books and `lg` a
 * spine holds only 21 characters, which is no title at all.
 */
const SPINE_CHARS = 64;

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
  side,
  wideOnly = false,
  horizontal = false,
}: {
  book: SpotifyAudiobook;
  lean?: number;
  heightFrac?: number;
  /** Which half of the shelf this sits on. Hover straightens a whole side at once. */
  side?: 'left' | 'right';
  /** Held back below `xl`, where the spine can't hold a real title legibly. */
  wideOnly?: boolean;
  horizontal?: boolean;
}) {
  const spine = book.spine ?? FALLBACK_SPINE;
  // The spine's text, in the longest form that fits the tightest shelf at the
  // minimum type size: title and author if they fit, else the title alone, else
  // the title trimmed.
  //
  // The tightest shelf is seven books at `lg` — ~47px per spine, ~142px of usable
  // height — where 43 characters is what two columns hold at the 0.6875rem
  // minimum. Keeping every spine to that length is what lets the type hold its
  // minimum; the two numbers are derived from each other.
  const withAuthor = `${book.title} · ${book.authors}`;
  const spineText =
    book.authors.length > 0 && withAuthor.length <= SPINE_CHARS
      ? withAuthor
      : book.title.length <= SPINE_CHARS
        ? book.title
        : `${book.title.slice(0, SPINE_CHARS - 1).trimEnd()}…`;
  const showsAuthor = spineText === withAuthor;
  const trimmed = !showsAuthor && spineText !== book.title;

  if (horizontal) {
    return (
      <li>
        <a
          href={book.url ?? '#'}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`${book.title} by ${book.authors} — open on Spotify`}
          className="flex min-h-14 flex-col justify-center gap-0.5 px-4 py-2 shadow-[inset_0_2px_3px_rgba(0,0,0,0.25),inset_0_-1px_2px_rgba(255,255,255,0.15)] transition-transform hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
          style={{ background: spine.bg, color: spine.ink }}
        >
          <span className="text-sm font-medium leading-tight tracking-tight">
            {book.title}
          </span>
          <span className="text-xs leading-tight">
            {book.authors}
          </span>
        </a>
      </li>
    );
  }

  return (
    <li data-side={side} className={wideOnly ? 'hidden xl:block' : undefined}>
      <a
        href={book.url ?? '#'}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={`${book.title} by ${book.authors} — open on Spotify`}
        className="book-spine flex items-center justify-center px-2 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
        style={
          {
            background: spine.bg,
            color: spine.ink,
            // JetBrains Mono is monospace, so CSS can size the type to fit the
            // spine exactly if it knows how many characters it has to hold.
            '--chars': `${spineText.length}`,
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
        {/* One text run, not a flex row: the spaces around the separator are
            literal, so the length really is characters × advance. The separator
            keeps the title and author from reading as one string, and it's
            aria-hidden because the link's label already says "by" — including the
            full title when this has had to trim it. */}
        <span className="book-spine-text">
          {trimmed ? (
            <span className="font-medium">{spineText}</span>
          ) : (
            <>
              <span className="font-medium">{book.title}</span>
              {showsAuthor && (
                <>
                  <span aria-hidden="true">{' · '}</span>
                  <span>{book.authors}</span>
                </>
              )}
            </>
          )}
        </span>
      </a>
    </li>
  );
}
