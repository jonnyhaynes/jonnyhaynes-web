/**
 * Facts about the relief dataset behind the background.
 *
 * Every value here is derived from something real, not chosen: the window and
 * output resolution come from scripts/build-topography-grid.mjs, and the
 * elevation range and grid dimensions come from public/topography-grid.json
 * itself. The sheet letter is SK because that's the OS grid square the bake
 * consumes. Regenerate this alongside any re-bake.
 */
export const TOPOGRAPHY = {
  /** British National Grid window, metres. 25 km × 20 km of South Yorkshire. */
  window: { minX: 420000, minY: 380000, maxX: 445000, maxY: 400000 },
  widthKm: 25,
  heightKm: 20,
  cols: 200,
  rows: 160,
  cellMetres: 125,
  /** Lowest and highest sampled ground in the window. */
  minElevationM: 20,
  maxElevationM: 513,
  sheet: 'SK',
  source: 'OS Terrain 50',
  licence: 'Open Government Licence v3.0',
  attribution: 'Contains OS data © Crown copyright and database right 2026',
} as const;

/** Scale bar ticks, km east from the window's western edge. */
export const SCALE_TICKS_KM = [0, 5, 10, 15, 20, 25] as const;
