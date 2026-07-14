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
 * Gaming section — recently-played games baked from Steam + Xbox. Renders
 * nothing until at least one game is present, so a missing/empty bake (or the
 * third-party Xbox service being down) simply hides the section.
 */
export function Gaming() {
  const games = recentGames(useGamingData());
  if (!games.length) return null;

  return (
    <section id="gaming" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // What I’m playing
      </h2>

      {/* Mirrors the reading grid: two wide on mobile, three from md up so six
          tiles land as a clean 2×3 / 3×2. Portrait cover, title + meta beneath. */}
      <ul className="mt-6 grid grid-cols-2 items-start gap-4 md:grid-cols-3">
        {games.map((g) => {
          const meta =
            g.platform === 'steam' ? 'Steam' : `Xbox · ${lastPlayedLabel(g.lastPlayed)}`;
          const inner = (
            <>
              {g.coverUrl ? (
                <img
                  src={g.coverUrl}
                  alt=""
                  className="aspect-[3/4] w-full rounded-md object-cover shadow-sm transition-transform group-hover:scale-[1.02]"
                />
              ) : (
                <span className="flex aspect-[3/4] w-full items-center justify-center rounded-md bg-muted/20 font-mono text-2xl text-muted">
                  🎮
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground transition-colors group-hover:text-accent-start">
                  {g.title}
                </p>
                <p className="mt-0.5 text-sm text-muted">{meta}</p>
              </div>
            </>
          );

          return (
            <li key={`${g.platform}-${g.title}`} className="min-w-0">
              {g.url ? (
                <a
                  href={g.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex min-w-0 flex-col gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
                >
                  {inner}
                </a>
              ) : (
                <div className="group flex min-w-0 flex-col gap-3">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
