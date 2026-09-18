import { SECTION_IDS } from './sections';
import { toGridRef } from '../lib/gridref';

/**
 * The traverse: an authored route across the real map, with one waypoint per
 * section.
 *
 * The route is a *choice* — it's the line you walk across the sheet, and picking
 * a line is legitimate. Everything the interface then claims about it is read
 * off the data and can't be fudged: the grid references come from the route's own
 * eastings and northings (so they're fixed, and present in the prerendered HTML),
 * and the spot heights along it are sampled from the baked elevation field (so
 * they're real numbers between 20 m and 513 m — see `useTraverse`).
 *
 * If the profile turns out to be dull, move the route. Never touch the heights.
 *
 * Runs east → west, from the low ground on the city side up onto the Dark Peak
 * edge, so the page rises as you scroll. Held clear of northing 400000, which is
 * the SK/SE square boundary — crossing it would change the grid reference's
 * letter pair partway down the page and read as a bug.
 */

export const ROUTE: readonly { easting: number; northing: number }[] = [
  { easting: 443000, northing: 396000 },
  { easting: 438000, northing: 392500 },
  { easting: 433000, northing: 389000 },
  { easting: 428000, northing: 385500 },
  { easting: 422500, northing: 381500 },
];

/** Cumulative distance to the start of each segment, in metres. */
const SEGMENT_START: number[] = [];

/** Total route length in metres. */
export const ROUTE_METRES = (() => {
  let total = 0;
  for (let i = 1; i < ROUTE.length; i++) {
    SEGMENT_START.push(total);
    total += Math.hypot(
      ROUTE[i].easting - ROUTE[i - 1].easting,
      ROUTE[i].northing - ROUTE[i - 1].northing,
    );
  }
  return total;
})();

/** The point at fraction `f` (0..1) along the route, measured by arc length so
 *  the waypoints are evenly spaced on the ground rather than per segment. */
export function routeAt(f: number): { easting: number; northing: number } {
  const target = Math.min(1, Math.max(0, f)) * ROUTE_METRES;

  let segment = SEGMENT_START.length - 1;
  for (let i = 0; i < SEGMENT_START.length; i++) {
    if (target < SEGMENT_START[i]) {
      segment = i - 1;
      break;
    }
  }
  segment = Math.max(0, segment);

  const start = SEGMENT_START[segment];
  const end = SEGMENT_START[segment + 1] ?? ROUTE_METRES;
  const span = end - start;
  const k = span ? (target - start) / span : 0;

  const a = ROUTE[segment];
  const b = ROUTE[Math.min(ROUTE.length - 1, segment + 1)];

  return {
    easting: a.easting + (b.easting - a.easting) * k,
    northing: a.northing + (b.northing - a.northing) * k,
  };
}

export type Waypoint = {
  id: string;
  /** Fraction along the route, 0..1. */
  f: number;
  easting: number;
  northing: number;
  /** Six-figure reference, e.g. `SK 235 828`. Static — pure arithmetic on the route. */
  ref: string;
};

/**
 * One waypoint per section, plus `start` for the hero.
 *
 * Derived from the section registry rather than a parallel list, so adding a
 * section (testimonials, later) re-spaces the traverse automatically instead of
 * leaving two lists to drift apart.
 */
export const WAYPOINTS: readonly Waypoint[] = ['start', ...SECTION_IDS].map(
  (id, index, all) => {
    const f = index / (all.length - 1);
    const { easting, northing } = routeAt(f);
    return { id, f, easting, northing, ref: toGridRef(easting, northing) };
  },
);

/** The waypoint for a section id, or undefined if it isn't on the route. */
export function waypointFor(id: string): Waypoint | undefined {
  return WAYPOINTS.find((waypoint) => waypoint.id === id);
}

/* ── Sampling a profile along the route ───────────────────────────────────── */

/** Elevation in metres at fraction `f`, given a sampler for the baked field. */
export type AltitudeAt = (f: number) => number;

/**
 * Cumulative ascent to fraction `f`, in metres.
 *
 * Walks the route once at a fixed resolution and sums the positive deltas, so
 * the figure the chrome reports is measured off the terrain rather than
 * estimated. Monotonic in `f` by construction.
 */
export function ascentProfile(altitudeAt: AltitudeAt, steps = 160): number[] {
  const totals: number[] = [0];
  let running = 0;
  let previous = altitudeAt(0);
  for (let i = 1; i <= steps; i++) {
    const h = altitudeAt(i / steps);
    if (h > previous) running += h - previous;
    previous = h;
    totals.push(running);
  }
  return totals;
}

/** Cumulative ascent at fraction `f`, read off a profile built by `ascentProfile`. */
export function ascentAt(profile: readonly number[], f: number): number {
  if (profile.length < 2) return 0;
  const pos = Math.min(1, Math.max(0, f)) * (profile.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.min(profile.length - 1, lo + 1);
  const k = pos - lo;
  return profile[lo] + (profile[hi] - profile[lo]) * k;
}
