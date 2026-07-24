import { useState } from 'react';
import {
  deriveTrackParams,
  useNowPlaying,
  usePlaybackPosition,
} from '../data/spotify';
import type { NowPlaying as NowPlayingData } from '../data/spotify';
import { Visualizer } from './visualizers';
import { type VisualizerKind } from './visualizers-meta';
import { KnobControl } from './KnobControl';

// Persist the chosen visualizer the same way the theme toggle persists: an
// explicit choice is written to localStorage; otherwise we default to spectrum.
const VISUALIZER_KEY = 'now-playing-visualizer';

function isVisualizerKind(v: string | null): v is VisualizerKind {
  return v === 'spectrum' || v === 'scope' || v === 'plasma';
}

function useVisualizer(): [VisualizerKind, (k: VisualizerKind) => void] {
  const [kind, setKind] = useState<VisualizerKind>(() => {
    try {
      const saved =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(VISUALIZER_KEY)
          : null;
      return isVisualizerKind(saved) ? saved : 'spectrum';
    } catch {
      // Private-mode/storage-disabled failures — fall back to the default.
      return 'spectrum';
    }
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

/**
 * A tiny analogue VU meter for the deck header — an output readout, not a
 * control (hence aria-hidden and no button). A quarter-arc face with a needle
 * that pivots from the bottom-centre: while a track plays the needle jitters
 * around the upper-mid of the scale like a real amp meter reacting to audio
 * (.vu-needle-active); when idle it rests pinned low-left. The bounce is paused
 * under prefers-reduced-motion (see .vu-needle in index.css), holding a steady
 * mid reading. Replaces the old status dot/power symbol so the LED metaphor
 * doesn't collide with the Gaming TV's pressable power button.
 */
function VuMeter({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 16"
      className="h-4 w-6 overflow-visible text-[var(--color-deck-panel-text)]"
      fill="none"
    >
      {/* Arc face — the scale the needle sweeps across. */}
      <path
        d="M3 14 A 9 9 0 0 1 21 14"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Needle — pivots about (12,14). Resting angle points low-left; the
          active class animates it swinging through the upper range. */}
      <line
        x1="12"
        y1="14"
        x2="12"
        y2="4"
        className={active ? 'vu-needle vu-needle-active' : 'vu-needle'}
        stroke={active ? 'var(--color-accent-start)' : 'currentColor'}
        strokeWidth="1.4"
        strokeLinecap="round"
        transform={active ? undefined : 'rotate(-55 12 14)'}
      />
      {/* Pivot cap. */}
      <circle cx="12" cy="14" r="1.2" fill="currentColor" fillOpacity="0.6" />
    </svg>
  );
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
 * Readout line under the screen: a marquee of the track (title + artist)
 * glowing in the accent. Always scrolls — the motion is part of the hi-fi
 * look, even when the text technically fits.
 */
function MarqueeReadout({ data }: { data: NowPlayingData }) {
  return (
    <div
      className="deck-readout mt-3 font-mono text-xs"
      style={{ paddingRight: 'var(--knob-clearance)' }}
    >
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
  );
}

/**
 * Standby deck — the same hi-fi chrome as the active player, but with a "no
 * signal" screen and a dim LED. This keeps the device metaphor consistent when
 * Spotify is idle or disconnected, instead of dropping into a generic message
 * box.
 */
function DeckStandby() {
  return (
    <div className="deck-panel flex w-full flex-col overflow-hidden rounded-2xl p-4">
      {/* Header strip: standby label + steady dim LED. */}
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-deck-panel-text)]">
          Standby
        </p>
        {/* Standby VU meter — the same meter as the active deck, needle resting
            pinned low (no audio to move it). */}
        <VuMeter active={false} />
      </div>

      <div className="deck-lcd-wrap relative">
        <div className="deck-lcd relative aspect-square w-full overflow-hidden rounded-sm">
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[var(--color-deck-panel-text)] opacity-90">
              No signal
            </span>
            <span aria-hidden="true" className="deck-standby-line" />
          </div>
        </div>

        {/* Knob is rendered for visual symmetry but disabled in standby. */}
        <KnobControl visualizer="scope" onChange={() => {}} disabled />
      </div>

      <div
        className="deck-readout mt-3 font-mono text-xs"
        style={{ paddingRight: 'var(--knob-clearance)' }}
      >
        <span className="deck-lcd-text marquee block">
          <span>▸ Currently enjoying the silence.</span>
        </span>
      </div>
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
        {/* VU meter — the deck's output readout. Needle jitters while the track
            plays and rests low when stopped. */}
        <VuMeter active={spinning} />
      </div>

      {/* Visualizer screen + knob. The LCD (deck-lcd) is a recessed display
          with scanlines; a concave notch is masked out of its bottom-right
          corner (see .deck-lcd in index.css) and the knob nests in it, on the
          chrome — the knob never overlaps the live visualizer. The relative
          wrapper is the knob's positioning context. The chosen visualizer
          persists to localStorage like the site theme (see useVisualizer). */}
      <div className="deck-lcd-wrap relative">
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

        {/* Rotary switcher — nests in the LCD's notched corner. */}
        <KnobControl visualizer={visualizer} onChange={onVisualizerChange} />
      </div>

      <MarqueeReadout data={data} />

      {/* Progress bar. While playing it tracks position; when the track stops
          it drains to empty over ~3.5s so it comes to rest with the visualizer
          rather than freezing at its last width. */}
      {duration != null && (
        <div className="mt-2" style={{ paddingRight: 'var(--knob-clearance)' }}>
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
    : data && hasTrack
      ? `${playing ? 'Now playing' : 'Last played'}: ${data.title ?? 'Unknown track'} by ${data.artist ?? 'unknown artist'}.`
      : 'Nothing playing on Spotify.';

  // Real audio-features when Spotify provides them; otherwise a deterministic
  // per-track derivation so every track still moves differently (the endpoint
  // is restricted for newer apps, so in practice this is the usual path).
  const derived = data?.trackId
    ? deriveTrackParams({ id: data.trackId, popularity: data.popularity })
    : null;

  const deckProps: DeckProps | null = data
    ? {
        data,
        spinning: timerRunning,
        position,
        duration,
        tempo: features?.tempo ?? derived?.tempo,
        energy: features?.energy ?? derived?.energy,
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
        <DeckStandby />
      )}

    </section>
  );
}
