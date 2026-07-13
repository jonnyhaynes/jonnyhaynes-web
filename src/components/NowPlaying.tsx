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

  // Single spoken summary of the current state, announced politely when it
  // changes (track change, play→pause, connect/disconnect) so screen-reader
  // users hear updates without the visual bars/scrim.
  const announcement = !connected
    ? 'Spotify not connected.'
    : hasTrack
      ? `${playing ? 'Now playing' : 'Last played'}: ${data!.title} by ${data!.artist}.`
      : 'Nothing playing on Spotify.';

  return (
    <section
      className="flex flex-col gap-3"
      aria-label="Now playing on Spotify"
    >
      {/* Politely announce state changes to assistive tech. */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {/* API health indicator (decorative dot + text). */}
      <p className="flex items-center gap-2 font-mono text-xs">
        <span
          className={`inline-block size-2 rounded-full ${
            connected ? 'bg-accent-start' : 'bg-muted'
          } ${connected ? 'animate-pulse motion-reduce:animate-none' : ''}`}
          aria-hidden="true"
        />
        <span className="text-muted">
          Spotify API: {connected ? 'Connected' : 'Offline'}
        </span>
      </p>

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

          {/* Overlaid content: a solid-backed text block for guaranteed
              contrast over any cover, then the bars along the bottom. */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4">
            <div className="flex flex-col gap-0.5 rounded-md bg-black/80 p-3">
              <p className="font-mono text-xs text-white/90">
                {playing ? 'Now playing' : 'Last played'}
              </p>
              <p className="line-clamp-2 font-medium text-white">
                {data!.url ? (
                  <a
                    href={data!.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
                  >
                    {data!.title}
                    <span className="sr-only"> (opens on Spotify in a new tab)</span>
                  </a>
                ) : (
                  data!.title
                )}
              </p>
              <p className="text-sm text-white/90">{data!.artist}</p>
            </div>
            {playing && (
              <Visualiser playing={playing} tempo={features?.tempo} energy={features?.energy} />
            )}
          </div>

          {/* Progress bar pinned to the very bottom edge of the card. */}
          {progressPct != null && (
            <div
              className="absolute inset-x-0 bottom-0 h-1 bg-white/20"
              role="progressbar"
              aria-label="Track progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPct)}
              aria-valuetext={
                position != null && duration != null
                  ? `${formatTime(position)} of ${formatTime(duration)}`
                  : undefined
              }
            >
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
          <p className="line-clamp-2 font-medium text-foreground">
            {data!.url ? (
              <a
                href={data!.url}
                target="_blank"
                rel="noreferrer noopener"
                className="transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
              >
                {data!.title}
                <span className="sr-only"> (opens on Spotify in a new tab)</span>
              </a>
            ) : (
              data!.title
            )}
          </p>
          <p className="text-sm text-muted">{data!.artist}</p>
          {progressPct != null && (
            <div
              className="mt-3 h-1 overflow-hidden rounded-full bg-muted/25"
              role="progressbar"
              aria-label="Track progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progressPct)}
              aria-valuetext={
                position != null && duration != null
                  ? `${formatTime(position)} of ${formatTime(duration)}`
                  : undefined
              }
            >
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

      {/* Time readout under the card while playing. Visual only — the progress
          bar's aria-valuetext already conveys elapsed/total to assistive tech,
          so bare numbers here would just be noise. */}
      {playing && position != null && duration != null && (
        <div
          className="flex justify-between font-mono text-xs text-muted"
          aria-hidden="true"
        >
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      )}
    </section>
  );
}
