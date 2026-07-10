import { useSpotifyAudiobooks } from '../data/spotify';

/**
 * Reading section — saved audiobooks from Spotify (spec addition). Renders
 * nothing until the list is populated, so before the widened-scope re-auth it
 * simply doesn't appear (graceful degradation).
 */
export function Reading() {
  const data = useSpotifyAudiobooks();
  const books = data?.audiobooks ?? [];
  if (!books.length) return null;

  return (
    <section id="reading" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // What I&apos;m reading
      </h2>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((b) => (
          <li key={b.title}>
            <a
              href={b.url ?? '#'}
              target="_blank"
              rel="noreferrer noopener"
              className="flex gap-3 rounded-lg border border-muted/20 bg-background/70 p-3 backdrop-blur-sm transition-colors hover:border-accent-start/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
            >
              {b.cover && (
                <img
                  src={b.cover}
                  alt=""
                  className="size-16 shrink-0 rounded object-cover"
                  width={64}
                  height={64}
                />
              )}
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{b.title}</p>
                <p className="truncate text-sm text-muted">{b.authors}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
