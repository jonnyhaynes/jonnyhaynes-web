import { useEffect, useState } from 'react';
import { useNowPlaying, usePlaybackPosition } from '../data/spotify';

const BAR_COUNT = 12;

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
      className={`flex h-16 items-end gap-1 ${playing ? 'is-playing' : ''}`}
      style={style}
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          // Stagger each bar so the row ripples rather than pulsing in unison.
          key={i}
          className="eq-bar flex-1 rounded-sm bg-white/80"
          style={{ animationDelay: `${(i % 6) * -0.15}s`, height: '100%' }}
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

/**
 * Samples the average colour of an album-art image via a tiny offscreen canvas
 * (no dependency). Returns an rgb() string, or null while loading / on failure
 * (e.g. a tainted cross-origin canvas) so the glow falls back to the accent.
 */
function useDominantColour(src: string | null | undefined): string | null {
  // Store the colour alongside the src it was sampled from, so a stale colour
  // from the previous track is never shown while the new one loads. setState is
  // only ever called from the async onload callback (not synchronously in the
  // effect body), keeping the react-hooks linter happy.
  const [sampled, setSampled] = useState<{ src: string; colour: string } | null>(null);

  useEffect(() => {
    if (!src) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      if (cancelled) return;
      try {
        const size = 16; // downscale — we only want an average, not detail.
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let r = 0;
        let g = 0;
        let b = 0;
        const px = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        setSampled({
          src,
          colour: `rgb(${Math.round(r / px)}, ${Math.round(g / px)}, ${Math.round(b / px)})`,
        });
      } catch {
        // Tainted canvas or similar — keep the accent fallback.
      }
    };

    return () => {
      cancelled = true;
    };
  }, [src]);

  // Only surface the colour if it belongs to the current src.
  return sampled && sampled.src === src ? sampled.colour : null;
}

export function NowPlaying() {
  const data = useNowPlaying();
  const position = usePlaybackPosition(data);
  const glow = useDominantColour(data?.albumArt);

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
        <div
          className="relative aspect-square w-full overflow-hidden rounded-lg border border-muted/20"
          style={{ boxShadow: glow ? `0 8px 40px -12px ${glow}` : undefined }}
        >
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
