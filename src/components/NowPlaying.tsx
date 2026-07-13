import { useNowPlaying, usePlaybackPosition } from '../data/spotify';

const BAR_COUNT = 32;

/**
 * A row of equalizer bars anchored to the bottom edge of the card, overlaid on
 * the album art within the scrim. Bounce speed tracks the track's tempo (faster
 * song → faster bars) and overall amplitude scales with energy; both fall back
 * to sensible defaults. The per-bar height loop is honest, non-audio motion —
 * we have no live audio stream to react to (see plan). Hidden when not playing.
 */
function Visualiser({
  playing,
  tempo,
  energy,
}: {
  playing: boolean;
  tempo?: number | null;
  energy?: number | null;
}) {
  // Map BPM → animation duration. ~60bpm slow, ~180bpm fast; clamp so the motion
  // always reads as an equalizer rather than a strobe or a crawl.
  const duration =
    tempo && tempo > 0
      ? `${Math.min(1.2, Math.max(0.4, 120 / tempo)).toFixed(2)}s`
      : undefined;

  // Energy (0–1) scales how tall the bars get; default to a lively 0.7.
  const amplitude = typeof energy === 'number' ? 0.4 + energy * 0.6 : 0.75;

  const style: React.CSSProperties = {
    '--eq-amplitude': amplitude.toFixed(2),
    ...(duration ? { '--eq-duration': duration } : {}),
  } as React.CSSProperties;

  return (
    <div
      className={`eq-row flex h-14 items-end gap-[2px] ${playing ? 'is-playing' : ''}`}
      style={style}
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          className="eq-bar flex-1 rounded-full"
          style={
            {
              // Position each bar's slice of the shared gradient by its place in
              // the row; seed a varied start so bars don't animate in lockstep.
              '--eq-pos': `${(i / (BAR_COUNT - 1)) * 100}%`,
              animationDelay: `${(i % 7) * -0.13}s`,
              height: '100%',
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function NowPlaying() {
  const data = useNowPlaying();
  const position = usePlaybackPosition(data);

  // The hook returns null while loading and on failure/rate-limit; any object
  // (even isPlaying:false) means the API answered → "Connected".
  const connected = data !== null;
  const playing = data?.isPlaying ?? false;
  const features = data?.audioFeatures ?? null;
  const duration = data?.durationMs ?? null;

  const hasTrack = Boolean(data && (playing || data.title));
  const hasArt = hasTrack && Boolean(data?.albumArt);
  const progressPct =
    playing && position != null && duration && duration > 0
      ? Math.min(100, (position / duration) * 100)
      : null;

  return (
    <div className="flex flex-col gap-3">
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

      {hasArt ? (
        // Square, full-bleed art card with everything overlaid.
        <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-muted/20">
          <img
            src={data!.albumArt!}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />

          {/* Gradient scrim — keeps overlaid text/bars legible on any cover. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/50 to-transparent"
          />

          {/* Overlaid content: label, title/artist, then bars along the bottom. */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4">
            <p className="font-mono text-xs text-white/70">
              {playing ? 'Now playing' : 'Last played'}
            </p>
            <p className="truncate font-medium text-white">
              {data!.url ? (
                <a
                  href={data!.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
                >
                  {data!.title}
                </a>
              ) : (
                data!.title
              )}
            </p>
            <p className="truncate text-sm text-white/80">{data!.artist}</p>
            {playing && (
              <Visualiser playing={playing} tempo={features?.tempo} energy={features?.energy} />
            )}
          </div>

          {/* Progress bar pinned to the very bottom edge of the card. */}
          {progressPct != null && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
              <div
                className="h-full bg-accent-start transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
      ) : hasTrack ? (
        // Track known but no art — simple text card (rare fallback).
        <div className="rounded-lg border border-muted/20 bg-background/70 p-4 backdrop-blur-sm">
          <p className="font-mono text-xs text-muted">
            {playing ? 'Now playing' : 'Last played'}
          </p>
          <p className="truncate font-medium text-foreground">
            {data!.url ? (
              <a
                href={data!.url}
                target="_blank"
                rel="noreferrer noopener"
                className="transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
              >
                {data!.title}
              </a>
            ) : (
              data!.title
            )}
          </p>
          <p className="truncate text-sm text-muted">{data!.artist}</p>
          {progressPct != null && (
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted/25">
              <div
                className="h-full rounded-full bg-accent-start transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-muted/20 bg-background/70 p-4 backdrop-blur-sm">
          <p className="font-mono text-sm text-muted">
            // Currently enjoying the silence.
          </p>
        </div>
      )}

      {/* Time readout under the card while playing. */}
      {playing && position != null && duration != null && (
        <div className="flex justify-between font-mono text-[0.65rem] text-muted">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
    </div>
  );
}
