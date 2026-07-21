import type { GameTile } from '../data/gaming';
import { recentGames, useGamingData } from '../data/gaming';

/**
 * Relative "last played" for Xbox tiles (Steam carries no timestamp). Coarse by
 * design — the section is personality, not a precise activity log. Returns
 * "recently" as a safe fallback for anything under a day or unparseable.
 */
function lastPlayedLabel(iso: string | null): string {
  if (!iso) return 'recently';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'recently';
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'a week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  return 'a while ago';
}

/** Platform + relative-recency label shown as a game's caption. */
function metaFor(game: GameTile): string {
  return game.platform === 'steam'
    ? 'Steam'
    : `Xbox · ${lastPlayedLabel(game.lastPlayed)}`;
}

/**
 * Wraps children in a link to the game's store page when one exists, otherwise a
 * plain element — Steam tiles have a url, Xbox ones currently don't. `as` picks
 * the non-link element so the caller can keep correct list/box semantics.
 */
function GameLink({
  game,
  className,
  ariaLabel,
  children,
}: {
  game: GameTile;
  className: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  if (game.url) {
    return (
      <a
        href={game.url}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={ariaLabel}
        className={className}
      >
        {children}
      </a>
    );
  }
  return <div className={className}>{children}</div>;
}

/**
 * The hero game rendered as a CRT television. The cover art fills the "screen"
 * inside a dark bezel; faint scanlines and an accent glow (see .crt-* in
 * index.css) give it a living-tube feel. A power LED and two "dials" on the
 * bezel lip complete the set without tipping into kitsch. The title/platform
 * live in the link's aria-label only — the covers carry the section visually.
 */
function TvHero({ game }: { game: GameTile }) {
  const meta = metaFor(game);

  return (
    <div className="group">
      {/* Cabinet: rounded bezel with the screen inset inside it. Dark-plastic
          frame in dark mode; a lighter grey plastic in light mode so it reads
          as a TV without becoming a black slab on the chalk background. */}
      <GameLink
        game={game}
        ariaLabel={`${game.title} — ${meta}`}
        className="block rounded-2xl bg-gradient-to-b from-[#eceae4] to-[#d8d4cb] p-3 shadow-lg ring-1 ring-black/10 transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-start group-hover:scale-[1.01] md:p-4 dark:from-[#2a2b30] dark:to-[#141519] dark:ring-black/40"
      >
        {/* Screen: cover art behind scanline + glow overlays. Square so it
            lines up with the jewel-case grid beside it. */}
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
          {game.coverUrl ? (
            <img
              src={game.coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center font-mono text-5xl text-muted">
              🎮
            </span>
          )}
          {/* CRT overlays — decorative, never intercept clicks. */}
          <span
            aria-hidden="true"
            className="crt-scanlines pointer-events-none absolute inset-0"
          />
          <span
            aria-hidden="true"
            className="crt-glow pointer-events-none absolute inset-0 rounded-lg"
          />
        </div>

        {/* Bezel lip: power LED (accent) + two dials, echoing a TV's controls. */}
        <div className="mt-3 flex items-center gap-3 px-1">
          <span
            aria-hidden="true"
            className="deck-led h-2 w-2 rounded-full bg-accent-start shadow-[0_0_6px_1px_var(--color-accent-start)]"
          />
          <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[#4a5160] dark:text-muted">
            Now playing
          </span>
          <span aria-hidden="true" className="ml-auto flex gap-2">
            <span className="h-3 w-3 rounded-full bg-black/25 ring-1 ring-black/10 dark:bg-black/50 dark:ring-white/10" />
            <span className="h-3 w-3 rounded-full bg-black/25 ring-1 ring-black/10 dark:bg-black/50 dark:ring-white/10" />
          </span>
        </div>
      </GameLink>
    </div>
  );
}

/** Accent-palette fallback spine when a cover (and thus its tone) is absent. */
const FALLBACK_SPINE =
  'linear-gradient(to bottom, var(--color-accent-start), var(--color-accent-end))';

/**
 * A non-hero game as a PS1 jewel-case: square cover with a thin coloured spine
 * down the left edge and a subtle plastic-case sheen. The spine echoes the
 * Reading section's "spine bar" idiom for a consistent family look across the
 * page. The title/platform live in the link's aria-label only.
 */
function GameCase({ game }: { game: GameTile }) {
  const meta = metaFor(game);

  return (
    <li className="min-w-0">
      <GameLink
        game={game}
        ariaLabel={`${game.title} — ${meta}`}
        className="group/case block min-w-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
      >
        {/* Case: cover + left spine, wrapped so both sit under one sheen. The
            dark backdrop shows as letterbox bars behind non-square covers
            (contain), matching the TV screen's black field. */}
        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black shadow-sm ring-1 ring-black/20 transition-transform group-hover/case:scale-[1.02]">
          {game.coverUrl ? (
            <img
              src={game.coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center bg-muted/20 font-mono text-2xl text-muted">
              🎮
            </span>
          )}
          {/* Spine — a coloured strip pinned to the left edge, like a case
              spine. Accent gradient stands in for the disc's own colour. */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1.5 shadow-[inset_-1px_0_2px_rgba(0,0,0,0.35)]"
            style={{ background: FALLBACK_SPINE }}
          />
          {/* Plastic sheen — a soft diagonal highlight across the case face. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10"
          />
        </div>
      </GameLink>
    </li>
  );
}

/**
 * Gaming section — recently-played games baked from Steam + Xbox. The most-recent
 * game is the hero, shown as a CRT "TV screen"; the rest sit beside it as PS1
 * jewel-cases. Renders nothing until at least one game is present, so a
 * missing/empty bake (or the third-party Xbox service being down) simply hides
 * the section.
 */
export function Gaming() {
  // 1 hero TV + a 2×2 grid of jewel-cases beside it.
  const games = recentGames(useGamingData(), 5);
  if (!games.length) return null;

  const [hero, ...rest] = games;

  return (
    <section id="gaming" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // What I’m playing
      </h2>

      {/* Desktop: hero TV and the jewel-cases split the row 50/50. The four
          cases sit in a 2×2 grid in the right half. Mobile: the TV spans full
          width, the cases fall into two columns beneath. */}
      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
        <div className="min-w-0 md:w-1/2">
          <TvHero game={hero} />
        </div>
        {rest.length > 0 && (
          <ul className="grid grid-cols-2 items-start gap-6 md:w-1/2 md:gap-8">
            {rest.map((g) => (
              <GameCase key={`${g.platform}-${g.title}`} game={g} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
