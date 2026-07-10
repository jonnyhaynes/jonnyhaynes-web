import { useNowPlaying } from '../data/spotify';

/** Three CSS equalizer bars; they bounce only when `playing` (spec §D). */
function Equalizer({ playing }: { playing: boolean }) {
  return (
    <div
      className={`flex h-5 items-end gap-0.5 ${playing ? 'is-playing' : ''}`}
      aria-hidden="true"
    >
      <span className="eq-bar w-1 rounded-sm bg-accent-start" style={{ height: '100%' }} />
      <span className="eq-bar w-1 rounded-sm bg-accent-start" style={{ height: '100%' }} />
      <span className="eq-bar w-1 rounded-sm bg-accent-start" style={{ height: '100%' }} />
    </div>
  );
}

export function NowPlaying() {
  const data = useNowPlaying();

  // The hook returns null while loading and on failure/rate-limit; any object
  // (even isPlaying:false) means the API answered → "Connected".
  const connected = data !== null;
  const playing = data?.isPlaying ?? false;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-muted/20 bg-background/70 p-4 backdrop-blur-sm">
      {/* API health indicator */}
      <div className="flex items-center gap-2 font-mono text-xs">
        <span
          className={`inline-block size-2 rounded-full ${
            connected ? 'bg-accent-start' : 'bg-muted'
          } ${connected ? 'animate-pulse motion-reduce:animate-none' : ''}`}
          aria-hidden="true"
        />
        <span className="text-muted">
          Spotify API: {connected ? 'Connected' : 'Offline'}
        </span>
      </div>

      {/* Track, or the "enjoying the silence" fallback */}
      {data && (playing || data.title) ? (
        <div className="flex items-center gap-3">
          {data.albumArt && (
            <img
              src={data.albumArt}
              alt=""
              className="size-14 rounded"
              width={56}
              height={56}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">
              {data.url ? (
                <a
                  href={data.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="transition-colors hover:text-accent-start"
                >
                  {data.title}
                </a>
              ) : (
                data.title
              )}
            </p>
            <p className="truncate text-sm text-muted">{data.artist}</p>
            <p className="mt-0.5 font-mono text-xs text-muted">
              {playing ? 'Now playing' : 'Last played'}
            </p>
          </div>
          <Equalizer playing={playing} />
        </div>
      ) : (
        <p className="font-mono text-sm text-muted">
          // Currently enjoying the silence.
        </p>
      )}
    </div>
  );
}
