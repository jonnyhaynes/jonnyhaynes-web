import { useMemo } from 'react';

import { TOPOGRAPHY } from '../content/topography';
import { useAsset } from './assets';

/**
 * The baked elevation field, shared.
 *
 * `TopographicBackground` used to fetch and decode this itself, which was fine
 * while it was the only consumer. The chrome now needs the same grid — the
 * section rules quote a real elevation profile and the cursor reticle samples
 * the terrain under the pointer — so the fetch moves here and goes through the
 * shared asset cache in `lib/assets`. One request on the wire, one row in the
 * footer's readout, and both consumers guaranteed to be looking at the same
 * terrain.
 */

export const GRID_URL = '/topography-grid.json';

/** The canvas's own low→high glyph ramp, quoted back wherever terrain is drawn. */
export const RAMP = ' ·:-=+*#%@';

/** Pixels per glyph cell. */
export const CELL = 12;

/** Radius of the cursor spotlight, in CSS pixels. */
export const SPOTLIGHT_RADIUS = 300;

export type Grid = { cols: number; rows: number; data: Uint8Array };

type GridJson = { cols: number; rows: number; data: string };

/**
 * Mirror (ping-pong) an index into [0, n-1] so the field tiles seamlessly:
 * ...0 1 2 3 3 2 1 0 0 1 2 3... Reflecting at each edge means no hard seam where
 * the grid wraps, however far the traverse pushes the sample.
 */
export function mirror(i: number, n: number): number {
  const period = 2 * n;
  let m = ((i % period) + period) % period;
  if (m >= n) m = period - 1 - m;
  return m;
}

function decodeGrid(json: GridJson): Grid {
  const bin = atob(json.data);
  const data = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i);
  return { cols: json.cols, rows: json.rows, data };
}

/**
 * Bilinearly sample the height field at continuous grid coords, returning 0..1.
 * Interpolating between the four surrounding cells rather than snapping to the
 * nearest is what makes a moving field flow as a gradient instead of stepping
 * cell by cell. Out-of-range coords mirror in.
 */
export function sampleHeight(grid: Grid, gx: number, gy: number): number {
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const cx0 = mirror(x0, grid.cols);
  const cx1 = mirror(x0 + 1, grid.cols);
  const cy0 = mirror(y0, grid.rows);
  const cy1 = mirror(y0 + 1, grid.rows);
  const h00 = grid.data[cy0 * grid.cols + cx0];
  const h10 = grid.data[cy0 * grid.cols + cx1];
  const h01 = grid.data[cy1 * grid.cols + cx0];
  const h11 = grid.data[cy1 * grid.cols + cx1];
  const top = h00 + (h10 - h00) * fx;
  const bottom = h01 + (h11 - h01) * fx;
  return (top + (bottom - top) * fy) / 255;
}

/** The baked field, or null while it's in flight or if it failed to load. */
export function useTopographyGrid(): Grid | null {
  const json = useAsset<GridJson>('topography-grid.json', GRID_URL);
  return useMemo(() => (json ? decodeGrid(json) : null), [json]);
}

/* ── The window, as grid coordinates ────────────────────────────────────────
   The grid's own dimensions describe the window, and its bytes span the
   window's observed relief. So screen ↔ grid ↔ easting/northing ↔ elevation are
   all invertible, which is what lets the chrome report a position the map is
   genuinely showing rather than a decorative number.
   ------------------------------------------------------------------------- */

const { window: WIN, widthKm, heightKm } = TOPOGRAPHY;

/** Grid cell (0..cols) → BNG easting, in metres. */
export function cellToEasting(gx: number): number {
  return WIN.minX + (gx / TOPOGRAPHY.cols) * widthKm * 1000;
}

/** Grid cell (0..rows, row 0 = north) → BNG northing, in metres. */
export function cellToNorthing(gy: number): number {
  return WIN.maxY - (gy / TOPOGRAPHY.rows) * heightKm * 1000;
}

/** BNG easting → grid cell. */
export function eastingToCell(easting: number): number {
  return ((easting - WIN.minX) / (widthKm * 1000)) * TOPOGRAPHY.cols;
}

/** BNG northing → grid cell. Row 0 is north, so this inverts. */
export function northingToCell(northing: number): number {
  return ((WIN.maxY - northing) / (heightKm * 1000)) * TOPOGRAPHY.rows;
}

/** A normalised sample (0..1) → metres of real elevation. */
export function toMetres(sample: number): number {
  return (
    TOPOGRAPHY.minElevationM +
    sample * (TOPOGRAPHY.maxElevationM - TOPOGRAPHY.minElevationM)
  );
}

/** Parse an rgb()/hex CSS colour string into [r,g,b]. */
export function parseColor(raw: string): [number, number, number] {
  const s = raw.trim();
  const rgb = s.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((n) => parseFloat(n));
    return [r, g, b];
  }
  const hex = s.replace('#', '');
  if (hex.length === 3) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ];
  }
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}
