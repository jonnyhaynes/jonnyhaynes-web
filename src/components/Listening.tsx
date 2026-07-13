import { useSpotifyTop } from '../data/spotify';
import { CODING_PLAYLISTS } from '../content/spotify';
import { NowPlaying } from './NowPlaying';

/** Top 3 artists (circular avatars) + the "Current Vibe" genre string. */
function HeavyRotation() {
  const top = useSpotifyTop();
  const artists = top?.artists?.slice(0, 3) ?? [];
  if (!artists.length) return null;

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-wider text-muted">
        Heavy rotation
      </p>
      <div className="mt-3 flex items-center gap-4">
        <ul className="flex -space-x-3">
          {artists.map((a) => (
            <li key={a.name}>
              <a
                href={a.url ?? '#'}
                target="_blank"
                rel="noreferrer noopener"
                title={a.name}
                className="block rounded-full ring-2 ring-background transition-transform hover:z-10 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
              >
                {a.image ? (
                  <img
                    src={a.image}
                    alt={a.name}
                    className="size-12 rounded-full"
                    width={48}
                    height={48}
                  />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded-full bg-muted/30 text-xs text-muted">
                    {a.name.slice(0, 2)}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          {artists.map((a) => a.name).join(', ')}
        </p>
      </div>
      {top?.topGenre && (
        <p className="mt-3 font-mono text-sm text-accent-start">
          Current vibe: {top.topGenre}
        </p>
      )}
    </div>
  );
}

/**
 * Themed "Coding Fuel" playlists — a custom on-brand card per playlist (cover,
 * name, track count) that links out to Spotify. Uses baked playlist metadata
 * where available, falling back to the static label/id (link-only) so it still
 * renders before the metadata-enabled bake has run.
 */
function CodingFuel() {
  const top = useSpotifyTop();
  const baked = top?.playlists ?? [];

  // Merge: prefer baked metadata, fall back to the static config per id.
  const cards = CODING_PLAYLISTS.map((cfg) => {
    const meta = baked.find((p) => p.id === cfg.playlistId);
    return {
      label: cfg.label,
      url: meta?.url ?? `https://open.spotify.com/playlist/${cfg.playlistId}`,
      name: meta?.name ?? cfg.label,
      cover: meta?.cover ?? null,
    };
  });

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-wider text-muted">
        Coding fuel
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <a
            key={c.label}
            href={c.url}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex min-w-0 items-center gap-4 rounded-lg border border-muted/20 bg-background/70 p-4 backdrop-blur-sm transition-colors hover:border-accent-start/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
          >
            {c.cover ? (
              <img
                src={c.cover}
                alt=""
                className="size-16 shrink-0 rounded object-cover"
                width={64}
                height={64}
              />
            ) : (
              <span className="flex size-16 shrink-0 items-center justify-center rounded bg-accent-start/15 font-mono text-xs text-accent-start">
                ♪
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs uppercase tracking-wider text-accent-start">
                {c.label}
              </p>
              <p className="truncate font-medium text-foreground">{c.name}</p>
            </div>
            <span
              aria-hidden="true"
              className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-start"
            >
              ↗
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function Listening() {
  return (
    <section id="listening" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // What I listen to
      </h2>

      <div className="mt-6 flex flex-col gap-8">
        <NowPlaying />
        <HeavyRotation />
        <CodingFuel />
      </div>
    </section>
  );
}
