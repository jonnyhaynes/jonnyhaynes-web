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

/** One themed Spotify playlist embed. */
function PlaylistEmbed({ label, playlistId }: { label: string; playlistId: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-muted/20 bg-background/70 backdrop-blur-sm">
      <p className="border-b border-muted/20 px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted">
        {label}
      </p>
      <iframe
        title={`Spotify playlist: ${label}`}
        src={`https://open.spotify.com/embed/playlist/${playlistId}?theme=0`}
        width="100%"
        height="152"
        loading="lazy"
        allow="encrypted-media"
        style={{ border: 0, display: 'block' }}
      />
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

        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            Coding fuel
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {CODING_PLAYLISTS.map((p) => (
              <PlaylistEmbed key={p.playlistId} {...p} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
