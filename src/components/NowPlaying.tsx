import { useState } from 'react';
import { useNowPlaying, usePlaybackPosition } from '../data/spotify';
import type { NowPlaying as NowPlayingData } from '../data/spotify';

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

// Map BPM → reel-spin duration (seconds per revolution). Faster song → faster
// reel; clamped so it always reads as turning rather than a strobe or a crawl.
function reelDuration(tempo?: number | null): string | undefined {
  if (!tempo || tempo <= 0) return undefined;
  return `${Math.min(2, Math.max(0.6, 150 / tempo)).toFixed(2)}s`;
}

/**
 * A single cassette reel: a spinning hub sized to the window. `spinning` gates
 * the animation so it freezes when the playback timer stops.
 */
function Reel({
  spinning,
  tempo,
  className = '',
}: {
  spinning: boolean;
  tempo?: number | null;
  className?: string;
}) {
  const dur = reelDuration(tempo);
  return (
    <span
      aria-hidden="true"
      className={`${spinning ? 'is-spinning' : ''} ${className}`}
      style={dur ? ({ '--reel-duration': dur } as React.CSSProperties) : undefined}
    >
      <span className="reel block size-full" />
    </span>
  );
}

type VariantProps = {
  data: NowPlayingData;
  playing: boolean;
  spinning: boolean;
  position: number | null;
  duration: number | null;
  tempo?: number | null;
  energy?: number | null;
  progressPct: number | null;
};

/** Shared track title (linked when a url is present) + artist block. */
function TrackText({
  data,
  variant,
}: {
  data: NowPlayingData;
  variant: 'light' | 'dark';
}) {
  const titleColor = variant === 'dark' ? 'text-white' : 'text-foreground';
  const artistColor = variant === 'dark' ? 'text-white/90' : 'text-muted';
  return (
    <>
      <p className={`line-clamp-2 font-medium ${titleColor}`}>
        {data.url ? (
          <a
            href={data.url}
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
          >
            {data.title}
            <span className="sr-only"> (opens on Spotify in a new tab)</span>
          </a>
        ) : (
          data.title
        )}
      </p>
      <p className={`text-sm ${artistColor}`}>{data.artist}</p>
    </>
  );
}

/** Progressbar element shared across variants. */
function Progress({
  progressPct,
  position,
  duration,
  className,
  fillClassName,
}: {
  progressPct: number;
  position: number | null;
  duration: number | null;
  className: string;
  fillClassName: string;
}) {
  return (
    <div
      className={className}
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
      <div className={fillClassName} style={{ width: `${progressPct}%` }} />
    </div>
  );
}

/**
 * Variant A — Cassette shell. The card is a cassette: album art shows through a
 * window flanked by two spinning reels, with the track/artist on a paper label
 * and a tape-style progress bar along the bottom.
 */
function CassetteA({ data, spinning, position, duration, tempo, progressPct }: VariantProps) {
  return (
    <div className="cassette-shell relative aspect-square w-full overflow-hidden rounded-lg border border-muted/20 p-4">
      {/* Screw dots in the corners for cassette flavour. */}
      <span
        aria-hidden="true"
        className="absolute left-2 top-2 size-2 rounded-full bg-black/40"
      />
      <span
        aria-hidden="true"
        className="absolute right-2 top-2 size-2 rounded-full bg-black/40"
      />
      <span
        aria-hidden="true"
        className="absolute bottom-2 left-2 size-2 rounded-full bg-black/40"
      />
      <span
        aria-hidden="true"
        className="absolute bottom-2 right-2 size-2 rounded-full bg-black/40"
      />

      {/* Window: album art with the two reels riding over it. */}
      <div className="cassette-window relative mx-auto flex aspect-[2/1] w-full items-center justify-around overflow-hidden rounded-md">
        {data.albumArt && (
          <img
            src={data.albumArt}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-70"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black/30"
        />
        <Reel spinning={spinning} tempo={tempo} className="relative z-10 block size-[38%]" />
        <Reel spinning={spinning} tempo={tempo} className="relative z-10 block size-[38%]" />
      </div>

      {/* Paper label with the track info. */}
      <div className="mt-3 rounded-sm bg-background/85 p-3 backdrop-blur-sm">
        <p className="font-mono text-xs uppercase tracking-wider text-accent-start">
          {data.isPlaying ? 'Now playing' : 'Last played'}
        </p>
        <TrackText data={data} variant="light" />
      </div>

      {/* Tape-style progress along the bottom. */}
      {progressPct != null && (
        <div className="absolute inset-x-0 bottom-0">
          <Progress
            progressPct={progressPct}
            position={position}
            duration={duration}
            className="h-1 bg-white/20"
            fillClassName="h-full bg-accent-start transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Variant B — Full deck unit. A brushed-metal front panel wraps the cassette
 * window, with decorative transport controls and VU-style meters (the
 * equaliser restyled) below.
 */
function DeckB({
  data,
  playing,
  spinning,
  position,
  duration,
  tempo,
  energy,
  progressPct,
}: VariantProps) {
  return (
    <div className="deck-panel w-full overflow-hidden rounded-lg border border-muted/20 p-4">
      {/* Header strip: brand + power light. */}
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          Stereo Cassette Deck
        </p>
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${data.isPlaying ? 'bg-accent-start' : 'bg-muted'}`}
        />
      </div>

      {/* Cassette window embedded in the panel. */}
      <div className="cassette-window relative flex aspect-[5/2] w-full items-center justify-around overflow-hidden rounded-md border border-black/40">
        {data.albumArt && (
          <img
            src={data.albumArt}
            alt=""
            className="absolute inset-0 size-full object-cover opacity-60"
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-black/40" />
        <Reel spinning={spinning} tempo={tempo} className="relative z-10 block size-[32%]" />
        {/* Centre label over the tape. */}
        <div className="relative z-10 max-w-[45%] text-center">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-white/80">
            {data.isPlaying ? 'Playing' : 'Last'}
          </p>
          <p className="line-clamp-2 text-xs font-medium text-white">{data.title}</p>
        </div>
        <Reel spinning={spinning} tempo={tempo} className="relative z-10 block size-[32%]" />
      </div>

      {/* Track/artist below the window. */}
      <div className="mt-3">
        <TrackText data={data} variant="light" />
      </div>

      {/* Transport controls (decorative) + VU meters. */}
      <div className="mt-3 flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex gap-1 font-mono text-xs text-muted"
        >
          <span className="rounded border border-muted/30 px-1.5 py-0.5">⏮</span>
          <span className="rounded border border-muted/30 px-1.5 py-0.5">
            {playing ? '⏸' : '▶'}
          </span>
          <span className="rounded border border-muted/30 px-1.5 py-0.5">⏭</span>
        </div>
        <div className="min-w-0 flex-1">
          <Visualiser playing={spinning} tempo={tempo} energy={energy} />
        </div>
      </div>

      {progressPct != null && (
        <div className="mt-3">
          <Progress
            progressPct={progressPct}
            position={position}
            duration={duration}
            className="h-1 overflow-hidden rounded-full bg-muted/25"
            fillClassName="h-full rounded-full bg-accent-start transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
          />
        </div>
      )}
    </div>
  );
}

// TODO: remove after the A/B tape-deck decision — temporary variant switch.
type Variant = 'a' | 'b';
const VARIANT_KEY = 'tapedeck-variant';

function useVariant(): [Variant, (v: Variant) => void] {
  const [variant, setVariant] = useState<Variant>(() => {
    const saved =
      typeof localStorage !== 'undefined' ? localStorage.getItem(VARIANT_KEY) : null;
    return saved === 'a' || saved === 'b' ? saved : 'a';
  });
  const set = (v: Variant) => {
    setVariant(v);
    localStorage.setItem(VARIANT_KEY, v);
  };
  return [variant, set];
}

export function NowPlaying() {
  const data = useNowPlaying();
  const position = usePlaybackPosition(data);
  const [variant, setVariant] = useVariant(); // TODO: remove after A/B decision

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

  // The interpolated position clamps to duration and stops advancing once the
  // track ends, but the next poll (and fresh track) can lag a couple of seconds
  // behind. Freeze the equaliser/reels once the timer has stopped so nothing
  // keeps moving over a finished track — motion resumes when the next track
  // loads with a fresh position.
  const timerRunning =
    playing && position != null && duration != null && position < duration;

  // Single spoken summary of the current state, announced politely when it
  // changes (track change, play→pause, connect/disconnect) so screen-reader
  // users hear updates without the visual bars/scrim.
  const announcement = !connected
    ? 'Spotify not connected.'
    : hasTrack
      ? `${playing ? 'Now playing' : 'Last played'}: ${data!.title} by ${data!.artist}.`
      : 'Nothing playing on Spotify.';

  const variantProps: VariantProps | null = data
    ? {
        data,
        playing,
        spinning: timerRunning,
        position,
        duration,
        tempo: features?.tempo,
        energy: features?.energy,
        progressPct,
      }
    : null;

  return (
    <section
      className="flex w-full flex-col gap-3"
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

      {/* TODO: remove after the A/B tape-deck decision — variant switch. */}
      <div className="flex gap-1 font-mono text-xs" role="group" aria-label="Tape-deck variant">
        {(['a', 'b'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVariant(v)}
            aria-pressed={variant === v}
            className={`rounded border px-2 py-0.5 uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start ${
              variant === v
                ? 'border-accent-start text-accent-start'
                : 'border-muted/30 text-muted hover:border-accent-start/50'
            }`}
          >
            {v === 'a' ? 'Cassette' : 'Deck'}
          </button>
        ))}
      </div>

      {hasTrack && variantProps ? (
        hasArt || variant === 'b' ? (
          variant === 'a' ? (
            <CassetteA {...variantProps} />
          ) : (
            <DeckB {...variantProps} />
          )
        ) : (
          // Track known but no art — simple text card (rare fallback).
          <div className="rounded-lg border border-muted/20 bg-background/70 p-4 backdrop-blur-sm">
            <p className="font-mono text-xs text-muted">
              {playing ? 'Now playing' : 'Last played'}
            </p>
            <TrackText data={data!} variant="light" />
            {progressPct != null && (
              <div className="mt-3">
                <Progress
                  progressPct={progressPct}
                  position={position}
                  duration={duration}
                  className="h-1 overflow-hidden rounded-full bg-muted/25"
                  fillClassName="h-full rounded-full bg-accent-start transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                />
              </div>
            )}
          </div>
        )
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
