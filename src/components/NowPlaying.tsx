import { useEffect, useRef, useState } from 'react';
import {
  useNowPlaying,
  usePlaybackPosition,
  type SpotifyAudioFeatures,
} from '../data/spotify';

/**
 * Three CSS equalizer bars; they bounce only when `playing` (spec §D). Bounce
 * speed tracks the track's tempo when available (faster song → faster bars),
 * falling back to the default 0.9s. Driven by the --eq-duration custom property.
 */
function Equalizer({ playing, tempo }: { playing: boolean; tempo?: number | null }) {
  // Map BPM → animation duration. ~60bpm → slow, ~180bpm → fast; clamp so the
  // motion always reads as an equalizer rather than a strobe or a crawl.
  const duration =
    tempo && tempo > 0
      ? `${Math.min(1.2, Math.max(0.4, 120 / tempo)).toFixed(2)}s`
      : undefined;

  return (
    <div
      className={`flex h-5 items-end gap-0.5 ${playing ? 'is-playing' : ''}`}
      style={duration ? ({ '--eq-duration': duration } as React.CSSProperties) : undefined}
      aria-hidden="true"
    >
      <span className="eq-bar w-1 rounded-sm bg-accent-start" style={{ height: '100%' }} />
      <span className="eq-bar w-1 rounded-sm bg-accent-start" style={{ height: '100%' }} />
      <span className="eq-bar w-1 rounded-sm bg-accent-start" style={{ height: '100%' }} />
    </div>
  );
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Thin progress bar + m:ss / m:ss, using the interpolated live position. */
function ProgressBar({ position, duration }: { position: number; duration: number }) {
  const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  return (
    <div className="mt-2 flex flex-col gap-1">
      <div className="h-1 overflow-hidden rounded-full bg-muted/25">
        <div
          className="h-full rounded-full bg-accent-start transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between font-mono text-[0.65rem] text-muted">
        <span>{formatTime(position)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

/** Three slim labelled meters for the track's musical character. Rendered only
 * when at least one feature is present; individual null meters are skipped. */
function FeatureMeters({ features }: { features: SpotifyAudioFeatures }) {
  const meters = [
    { label: 'Energy', value: features.energy },
    { label: 'Positivity', value: features.valence },
    { label: 'Dance', value: features.danceability },
  ].filter((m): m is { label: string; value: number } => typeof m.value === 'number');

  if (!meters.length) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {meters.map((m) => (
        <div key={m.label} className="flex items-center gap-3">
          <span className="w-16 shrink-0 font-mono text-[0.65rem] uppercase tracking-wider text-muted">
            {m.label}
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted/25">
            <div
              className="h-full rounded-full bg-accent-start/70"
              style={{ width: `${Math.round(m.value * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
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
  const containerRef = useRef<HTMLDivElement>(null);

  // The hook returns null while loading and on failure/rate-limit; any object
  // (even isPlaying:false) means the API answered → "Connected".
  const connected = data !== null;
  const playing = data?.isPlaying ?? false;
  const features = data?.audioFeatures ?? null;
  const duration = data?.durationMs ?? null;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col gap-3 overflow-hidden rounded-lg border border-muted/20 bg-background/70 p-4 backdrop-blur-sm"
      style={
        {
          '--glow': glow ?? 'var(--color-accent-start, currentColor)',
        } as React.CSSProperties
      }
    >
      {/* Album-art colour glow — soft radial wash keyed to the current track.
          Gated behind playing so a paused/last-played card stays calm. */}
      {playing && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px opacity-20 transition-colors duration-700"
          style={{
            background:
              'radial-gradient(120% 80% at 15% 0%, var(--glow), transparent 70%)',
          }}
        />
      )}

      {/* API health indicator */}
      <div className="relative flex items-center gap-2 font-mono text-xs">
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
        <div className="relative">
          <div className="flex min-w-0 items-center gap-3">
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
                    className="transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
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
            <Equalizer playing={playing} tempo={features?.tempo} />
          </div>

          {/* Live progress bar — only while playing with known duration. */}
          {playing && position != null && duration != null && (
            <ProgressBar position={position} duration={duration} />
          )}

          {/* Audio-features meters — omitted entirely when unavailable. */}
          {playing && features && <FeatureMeters features={features} />}
        </div>
      ) : (
        <p className="relative font-mono text-sm text-muted">
          // Currently enjoying the silence.
        </p>
      )}
    </div>
  );
}
