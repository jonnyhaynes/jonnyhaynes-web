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

/**
 * One game tile. `hero` renders the taller cover (filling its column's full
 * height on desktop, full width on mobile) used for the first, most-recent game.
 * Cover art is portrait (3:4); small tiles keep that ratio, the hero grows to
 * fill its taller cell via object-cover. Titles wrap in full — never truncated.
 */
function Tile({ game, hero = false }: { game: GameTile; hero?: boolean }) {
  const meta =
    game.platform === 'steam' ? 'Steam' : `Xbox · ${lastPlayedLabel(game.lastPlayed)}`;
  const coverClass = hero
    ? 'w-full flex-1 rounded-md object-cover shadow-sm transition-transform group-hover:scale-[1.02] md:min-h-0'
    : 'aspect-[3/4] w-full rounded-md object-cover shadow-sm transition-transform group-hover:scale-[1.02]';
  const fallbackClass = hero
    ? 'flex aspect-[3/4] w-full flex-1 items-center justify-center rounded-md bg-muted/20 font-mono text-4xl text-muted md:aspect-auto'
    : 'flex aspect-[3/4] w-full items-center justify-center rounded-md bg-muted/20 font-mono text-2xl text-muted';
  const inner = (
    <>
      {game.coverUrl ? (
        <img src={game.coverUrl} alt="" className={coverClass} />
      ) : (
        <span className={fallbackClass}>🎮</span>
      )}
      <div className="min-w-0">
        <p
          className={`font-medium text-foreground transition-colors group-hover:text-accent-start${
            hero ? ' text-lg' : ''
          }`}
        >
          {game.title}
        </p>
        <p className="mt-0.5 text-sm text-muted">{meta}</p>
      </div>
    </>
  );

  const wrapperClass = `group flex min-w-0 flex-col gap-3${hero ? ' h-full' : ''}`;
  const body = game.url ? (
    <a
      href={game.url}
      target="_blank"
      rel="noreferrer noopener"
      className={`${wrapperClass} rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start`}
    >
      {inner}
    </a>
  ) : (
    <div className={wrapperClass}>{inner}</div>
  );

  return <li className={hero ? 'min-w-0 md:h-full' : 'min-w-0'}>{body}</li>;
}

/**
 * Gaming section — recently-played games baked from Steam + Xbox. Renders
 * nothing until at least one game is present, so a missing/empty bake (or the
 * third-party Xbox service being down) simply hides the section.
 */
export function Gaming() {
  const games = recentGames(useGamingData());
  if (!games.length) return null;

  const [hero, ...rest] = games;

  return (
    <section id="gaming" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // What I’m playing
      </h2>

      {/* Desktop: an outer 3-column grid. The most-recent game is the hero,
          filling the left column; the right two columns hold a nested 3-wide
          grid where games 2–7 spread over two rows. Mobile: hero spans full
          width, the rest fall into two columns beneath. */}
      <ul className="mt-6 grid gap-4 md:grid-cols-3 md:items-stretch">
        <Tile key={`${hero.platform}-${hero.title}`} game={hero} hero />
        <li className="min-w-0 md:col-span-2">
          <ul className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3">
            {rest.map((g) => (
              <Tile key={`${g.platform}-${g.title}`} game={g} />
            ))}
          </ul>
        </li>
      </ul>
    </section>
  );
}
