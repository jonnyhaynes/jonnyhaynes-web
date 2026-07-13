import { useSpotifyAudiobooks } from '../data/spotify';

/**
 * Reading section — saved audiobooks from Spotify (spec addition). Renders
 * nothing until the list is populated, so before the widened-scope re-auth it
 * simply doesn't appear (graceful degradation).
 */
export function Reading() {
  const data = useSpotifyAudiobooks();
  // Cap at the 4 latest. Spotify has no reading-progress API, so "latest" =
  // most-recently-saved order the API returns.
  const books = (data?.audiobooks ?? []).slice(0, 4);
  if (!books.length) return null;

  return (
    <section id="reading" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // What I’m reading
      </h2>

      {/* Two wide on mobile, four wide from md up. Portrait cover on top with
          the full title (wrapping freely) and author beneath. items-start so
          rows align to the top when titles differ in length. */}
      <ul className="mt-6 grid grid-cols-2 items-start gap-4 md:grid-cols-4">
        {books.map((b) => (
          <li key={b.title} className="min-w-0">
            <a
              href={b.url ?? '#'}
              target="_blank"
              rel="noreferrer noopener"
              className="group flex min-w-0 flex-col gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
            >
              {b.cover ? (
                <img
                  src={b.cover}
                  alt=""
                  className="aspect-[2/3] w-full rounded-md object-cover shadow-sm transition-transform group-hover:scale-[1.02]"
                />
              ) : (
                <span className="flex aspect-[2/3] w-full items-center justify-center rounded-md bg-muted/20 font-mono text-2xl text-muted">
                  📖
                </span>
              )}
              <div className="min-w-0">
                <p className="font-medium text-foreground transition-colors group-hover:text-accent-start">
                  {b.title}
                </p>
                <p className="mt-0.5 text-sm text-muted">{b.authors}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
