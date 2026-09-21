import { useEffect, useMemo, useRef, useState } from 'react';

import { TOPOGRAPHY } from '../content/topography';
import {
  ROUTE_METRES,
  WAYPOINTS,
  ascentAt,
  ascentProfile,
  routeAt,
  type Waypoint,
} from '../content/waypoints';
import { formatLatLon, toGridRef, toLatLon } from './gridref';
import {
  eastingToCell,
  northingToCell,
  sampleHeight,
  toMetres,
  useTopographyGrid,
} from './topography-grid';
import { useReducedMotion } from './useReducedMotion';

/**
 * How the background is being driven.
 *
 * `drift` is the original behaviour — a slow time-based diagonal with no meaning.
 * `pan` is the traverse: the offset is a pure function of scroll, so the map is
 * always showing the ground the chrome is claiming. `waypoints` parks the field
 * at each section's waypoint and eases between them. `static` holds one frame.
 */
export type BackgroundMode = 'pan' | 'waypoints' | 'drift' | 'static';

type BackgroundState = {
  mode: BackgroundMode;
  /** Sampling offset, in grid cells. */
  panX: number;
  panY: number;
  /** Draw the cursor reticle and its sampled elevation. */
  reticle: boolean;
};

/**
 * Deliberately a mutable module-level object rather than React state.
 *
 * The canvas reads it once per animation frame. Routing this through state would
 * re-render the tree on every scroll event and re-run the background's setup
 * effect — which owns a full-viewport canvas, its listeners and its RAF loop.
 *
 * The defaults are what the site now ships: the traverse drives the pan and the
 * reticle is on. `ShellFrame` writes the pan on every route, so the field is never
 * left parked at the grid origin.
 */
const background: BackgroundState = {
  mode: 'pan',
  panX: 0,
  panY: 0,
  reticle: true,
};

/** Read by the canvas each frame. Same object every time — no allocation. */
export function getBackground(): BackgroundState {
  return background;
}

export function setBackground(patch: Partial<BackgroundState>): void {
  Object.assign(background, patch);
}

/** Live position along the traverse, for the chrome. */
export type Traverse = {
  /** 0..1 through the document. */
  progress: number;
  /** Where the traverse is right now. */
  easting: number;
  northing: number;
  ref: string;
  coord: string;
  /** Sampled from the baked field; null until it loads. */
  elevationM: number | null;
  km: number;
  ascentM: number;
  /** The waypoint at or most recently passed. */
  waypoint: Waypoint;
};

/** Above this the traverse point is inside the window and its ref is meaningful. */
const START = WAYPOINTS[0];

type Options = {
  /** Walk the route in reverse, so the page descends into the city instead. */
  reverse?: boolean;
  /**
   * Hold the field still regardless of the OS setting, for a caller that needs to
   * simulate reduced motion without touching a system preference. The real OS
   * setting still wins on its own.
   */
  frozen?: boolean;
};

/**
 * Maps document scroll onto the route, and reports where that is.
 *
 * One owner, like `useActiveSection` — two independent observers measuring the
 * same page would be two sources of truth. Writes the sampling offset straight
 * into the background store (no re-render) and the progress fraction to a CSS
 * custom property (no re-render); only the text the chrome actually displays is
 * held in state, and only when it changes.
 */
export function useTraverse({ reverse = false, frozen: forceFrozen = false }: Options = {}): Traverse {
  const reduced = useReducedMotion();
  const frozen = reduced || forceFrozen;
  const grid = useTopographyGrid();

  const [display, setDisplay] = useState<Traverse>(() => ({
    progress: 0,
    easting: START.easting,
    northing: START.northing,
    ref: START.ref,
    coord: formatLatLon(toLatLon(START.easting, START.northing)),
    elevationM: null,
    km: 0,
    ascentM: 0,
    waypoint: START,
  }));

  // Sampler for the baked field, in metres.
  const altitudeAt = useMemo(() => {
    if (!grid) return null;
    return (f: number) => {
      const { easting, northing } = routeAt(f);
      return toMetres(
        sampleHeight(grid, eastingToCell(easting), northingToCell(northing)),
      );
    };
  }, [grid]);

  // Cumulative ascent along the whole route, measured once.
  const ascent = useMemo(
    () => (altitudeAt ? ascentProfile(altitudeAt) : null),
    [altitudeAt],
  );

  // The signature of the last value pushed into state, so an unchanged readout
  // doesn't re-render. Everything the chrome prints is in here.
  const signature = useRef('');

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;

      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;

      // Direction is a presentation choice: reversing walks the same route the
      // other way, which turns a climb into a descent.
      const f = reverse ? 1 - progress : progress;
      const { easting, northing } = routeAt(f);

      const elevationM = altitudeAt ? altitudeAt(f) : null;
      const km = (f * ROUTE_METRES) / 1000;
      const ascentM = ascent ? ascentAt(ascent, f) : 0;

      // The waypoint at or most recently passed, measured by route distance.
      let waypoint = WAYPOINTS[0];
      for (const candidate of WAYPOINTS) if (f >= candidate.f) waypoint = candidate;

      // Move the map. Skipped under reduced motion, which leaves the field
      // parked rather than sweeping it as the page scrolls.
      if (!frozen) {
        const panX = eastingToCell(easting) - TOPOGRAPHY.cols / 2;
        const panY = northingToCell(northing) - TOPOGRAPHY.rows / 2;
        setBackground({ panX, panY });
        doc.style.setProperty('--traverse', progress.toFixed(4));
      }

      const ref = toGridRef(easting, northing);
      const elevRounded = elevationM === null ? null : Math.round(elevationM);
      const kmRounded = Number(km.toFixed(1));
      const ascentRounded = Math.round(ascentM);

      const next =
        `${ref}|${elevRounded}|${kmRounded}|${ascentRounded}|${waypoint.id}|` +
        `${easting.toFixed(0)}|${northing.toFixed(0)}|${frozen}`;
      if (next === signature.current) return;
      signature.current = next;

      setDisplay({
        progress,
        easting,
        northing,
        ref,
        coord: formatLatLon(toLatLon(easting, northing)),
        elevationM: elevRounded,
        km: kmRounded,
        ascentM: ascentRounded,
        waypoint,
      });
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    // Sections render nothing until their data lands, so the page height changes
    // after mount and the fraction has to be recomputed.
    const mutation = new MutationObserver(schedule);
    mutation.observe(document.body, { childList: true, subtree: true });

    schedule();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      mutation.disconnect();
      document.documentElement.style.removeProperty('--traverse');
    };
  }, [altitudeAt, ascent, frozen, reverse]);

  return display;
}
