import { useState } from 'react';
import { useNowPlaying, usePlaybackPosition } from '../data/spotify';
import type { NowPlaying as NowPlayingData } from '../data/spotify';
import { Visualizer, VisualizerIcon } from './visualizers';
import { VISUALIZERS, type VisualizerKind } from './visualizers-meta';

// Persist the chosen visualizer the same way the theme toggle persists: an
// explicit choice is written to localStorage; otherwise we default to spectrum.
const VISUALIZER_KEY = 'now-playing-visualizer';

function isVisualizerKind(v: string | null): v is VisualizerKind {
  return v === 'spectrum' || v === 'scope' || v === 'plasma';
}

function useVisualizer(): [VisualizerKind, (k: VisualizerKind) => void] {
  const [kind, setKind] = useState<VisualizerKind>(() => {
    const saved =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(VISUALIZER_KEY)
        : null;
    return isVisualizerKind(saved) ? saved : 'spectrum';
  });
  const set = (k: VisualizerKind) => {
    setKind(k);
    try {
      localStorage.setItem(VISUALIZER_KEY, k);
    } catch {
      // Private-mode/quota failures are non-fatal — the choice just won't stick.
    }
  };
  return [kind, set];
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type DeckProps = {
  data: NowPlayingData;
  spinning: boolean;
  position: number | null;
  duration: number | null;
  tempo?: number | null;
  energy?: number | null;
  progressPct: number | null;
  visualizer: VisualizerKind;
  onVisualizerChange: (k: VisualizerKind) => void;
};

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
 * The Now Playing card: a brushed-metal front panel with a switchable
 * visualizer screen as the hero (spectrum / oscilloscope / plasma), a marquee
 * readout of the track, and a progress bar.
 */
function Deck({
  data,
  spinning,
  position,
  duration,
  tempo,
  energy,
  progressPct,
  visualizer,
  onVisualizerChange,
}: DeckProps) {
  return (
    <div className="deck-panel flex w-full flex-col overflow-hidden rounded-2xl p-4">
      {/* Header strip: playing/last-played label + power light. */}
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-deck-panel-text)]">
          {data.isPlaying ? 'Now playing' : 'Last played'}
        </p>
        {/* Power LED — a glowing accent dot (as in the Gaming bezel). While the
            track plays it breathes; when it stops it eases down to a steady dot
            over the same duration as the visualizer collapse, rather than
            snapping off. Paused under reduced motion. */}
        <span
          aria-hidden="true"
          className={`size-2 rounded-full bg-accent-start shadow-[0_0_6px_1px_var(--color-accent-start)] ${
            spinning ? 'deck-led' : 'deck-led-resting'
          }`}
        />
      </div>

      {/* Visualizer screen — the hero. A recessed dark display (deck-lcd) with
          scanlines. Square, so the album art behind it reads as a proper cover.
          The chosen visualizer persists to localStorage like the site theme
          (see useVisualizer). */}
      <div className="deck-lcd relative aspect-square w-full overflow-hidden rounded-sm">
        {/* Album art sits behind the visualizer, dimmed under a scrim so the
            accent-coloured bars/wave/plasma stay legible over any cover. */}
        {data.albumArt && (
          <>
            <img
              src={data.albumArt}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-40"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[var(--color-lcd-scrim)]"
            />
          </>
        )}
        <div className="absolute inset-0 z-10">
          <Visualizer
            kind={visualizer}
            active={spinning}
            tempo={tempo}
            energy={energy}
          />
        </div>
      </div>

      {/* Readout line under the screen: a marquee of the track (title + artist)
          glowing in the accent. The single inner element is what scrolls. */}
      <div className="deck-readout mt-3 font-mono text-xs">
        <span className="deck-lcd-text marquee block">
          {data.url ? (
            <a
              href={data.url}
              target="_blank"
              rel="noreferrer noopener"
              className="transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start"
            >
              ▸ {data.title} — {data.artist}
              <span className="sr-only"> (opens on Spotify in a new tab)</span>
            </a>
          ) : (
            <span>
              ▸ {data.title} — {data.artist}
            </span>
          )}
        </span>
      </div>

      {/* Progress bar. While playing it tracks position; when the track stops
          it drains to empty over ~3.5s so it comes to rest with the visualizer
          rather than freezing at its last width. */}
      {duration != null && (
        <div className="mt-2">
          <Progress
            progressPct={spinning ? (progressPct ?? 0) : 0}
            position={position}
            duration={duration}
            className="h-1 overflow-hidden rounded-full bg-muted/25"
            fillClassName={`h-full rounded-full bg-accent-start ease-linear motion-reduce:transition-none ${
              spinning
                ? 'transition-[width] duration-1000'
                : 'transition-[width] duration-[3500ms]'
            }`}
          />
        </div>
      )}

      {/* Visualizer mode switcher — an icon-only segmented control. The active
          segment fills with the accent; each button carries its full name for
          assistive tech + a tooltip. */}
      <div
        className="mt-3 grid grid-cols-3 gap-1 rounded-md border border-muted/25 bg-[var(--color-control-recess)] p-1"
        role="group"
        aria-label="Visualizer style"
      >
        {VISUALIZERS.map((v) => {
          const selected = v.kind === visualizer;
          return (
            <button
              key={v.kind}
              type="button"
              onClick={() => onVisualizerChange(v.kind)}
              aria-pressed={selected}
              title={v.label}
              className={`flex items-center justify-center rounded py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start ${
                selected
                  ? 'bg-accent-start text-background'
                  : 'text-[var(--color-deck-panel-text)] hover:bg-[var(--color-control-hover)] hover:text-foreground'
              }`}
            >
              <VisualizerIcon kind={v.kind} active={selected} />
              <span className="sr-only">{v.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NowPlaying() {
  const data = useNowPlaying();
  const position = usePlaybackPosition(data);
  const [visualizer, setVisualizer] = useVisualizer();

  // The hook returns null while loading and on failure/rate-limit; any object
  // (even isPlaying:false) means the API answered → "Connected".
  const connected = data !== null;
  const playing = data?.isPlaying ?? false;
  const features = data?.audioFeatures ?? null;
  const duration = data?.durationMs ?? null;

  const hasTrack = Boolean(data && (playing || data.title));
  // Computed whenever we have a position + duration (not gated on `playing`), so
  // the bar stays mounted through the stop and can drain to empty instead of
  // vanishing. The drain itself is driven by `spinning` in the Deck.
  const progressPct =
    position != null && duration && duration > 0
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

  const deckProps: DeckProps | null = data
    ? {
        data,
        spinning: timerRunning,
        position,
        duration,
        tempo: features?.tempo,
        energy: features?.energy,
        progressPct,
        visualizer,
        onVisualizerChange: setVisualizer,
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

      {hasTrack && deckProps ? (
        <Deck {...deckProps} />
      ) : (
        <div className="rounded-lg border border-muted/20 bg-background/70 p-4 backdrop-blur-sm">
          <p className="font-mono text-sm text-muted">
            // Currently enjoying the silence.
          </p>
        </div>
      )}

    </section>
  );
}
