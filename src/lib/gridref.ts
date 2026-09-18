import { TOPOGRAPHY } from '../content/topography';

/**
 * British National Grid: easting/northing → grid reference, and → WGS84.
 *
 * Pure arithmetic, no dependency. Two separate pieces of maths, both verified
 * against published Ordnance Survey values rather than eyeballed — see
 * `GRID_REF_CASES` and `PROJECTION_CASES` below, which the prototype surfaces in
 * its control panel so they can't silently rot.
 */

/**
 * Grid letters, A–Z with I omitted. The OS omits I so the sequence can't be
 * misread as a 1, and this string already encodes that skip — which is why the
 * indices below need no adjustment for it.
 */
const LETTERS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';

/**
 * The two-letter 100 km square containing a point.
 *
 * The first letter comes from the 500 km square and the second from the 100 km
 * square within it; both are read off the same 5 × 5 letter pattern, which is
 * what produces the OS's characteristic diagonal letter repeats (S T N O H / N O
 * H J K / …). Verified against Sheffield, London, Winchester, Cambridge and
 * Newcastle in GRID_REF_CASES.
 */
function squareLetters(easting: number, northing: number): string {
  const east100 = Math.floor(easting / 100000);
  const north100 = Math.floor(northing / 100000);
  const row = 19 - north100;
  return (
    LETTERS[row - (row % 5) + Math.floor((east100 + 10) / 5)] +
    LETTERS[((row * 5) % 25) + (east100 % 5)]
  );
}

/**
 * A grid reference at the given precision, e.g. `SK 358 873`.
 *
 * `figures` is the total digit count: 6 gives 100 m precision (the standard
 * walker's reference and what the site uses), 10 gives 1 m.
 */
export function toGridRef(
  easting: number,
  northing: number,
  figures: 4 | 6 | 8 | 10 = 6,
): string {
  const half = figures / 2;
  const divisor = 10 ** (5 - half);
  const east = String(Math.floor((easting % 100000) / divisor)).padStart(half, '0');
  const north = String(Math.floor((northing % 100000) / divisor)).padStart(half, '0');
  return `${squareLetters(easting, northing)} ${east} ${north}`;
}

/* ── OSGB36 → WGS84 ─────────────────────────────────────────────────────────
   Transverse Mercator inverse on the Airy 1830 ellipsoid, then the OS's
   published 7-parameter Helmert transform onto WGS84. Both halves are needed:
   the projection gives OSGB36 lat/lon, and without the datum shift the result is
   ~100 m out while still looking entirely plausible.
   ------------------------------------------------------------------------- */

const A_AIRY = 6377563.396;
const B_AIRY = 6356256.909;
const F0 = 0.9996012717;
const LAT0 = (49 * Math.PI) / 180;
const LON0 = (-2 * Math.PI) / 180;
const N0 = -100000;
const E0 = 400000;
const E2 = 1 - (B_AIRY * B_AIRY) / (A_AIRY * A_AIRY);
const N_AIRY = (A_AIRY - B_AIRY) / (A_AIRY + B_AIRY);

/** Easting/northing → OSGB36 latitude/longitude, in radians. */
function osgb36LatLon(easting: number, northing: number): [number, number] {
  let lat = LAT0;
  let meridional = 0;
  let guard = 0;

  // Iterate: the meridional arc M depends on latitude, and latitude depends on M.
  do {
    lat = (northing - N0 - meridional) / (A_AIRY * F0) + lat;
    const dLat = lat - LAT0;
    const sLat = lat + LAT0;
    meridional =
      B_AIRY *
      F0 *
      ((1 + N_AIRY + 1.25 * N_AIRY ** 2 + 1.25 * N_AIRY ** 3) * dLat -
        (3 * N_AIRY + 3 * N_AIRY ** 2 + 2.625 * N_AIRY ** 3) *
          Math.sin(dLat) *
          Math.cos(sLat) +
        (1.875 * N_AIRY ** 2 + 1.875 * N_AIRY ** 3) *
          Math.sin(2 * dLat) *
          Math.cos(2 * sLat) -
        (35 / 24) * N_AIRY ** 3 * Math.sin(3 * dLat) * Math.cos(3 * sLat));
  } while (Math.abs(northing - N0 - meridional) >= 0.00001 && guard++ < 20);

  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const tanLat = Math.tan(lat);
  const nu = (A_AIRY * F0) / Math.sqrt(1 - E2 * sinLat * sinLat);
  const rho = (A_AIRY * F0 * (1 - E2)) / Math.pow(1 - E2 * sinLat * sinLat, 1.5);
  const eta2 = nu / rho - 1;
  const dE = easting - E0;
  const dE2 = dE * dE;

  const VII = tanLat / (2 * rho * nu);
  const VIII =
    (tanLat / (24 * rho * nu ** 3)) *
    (5 + 3 * tanLat ** 2 + eta2 - 9 * tanLat ** 2 * eta2);
  const IX =
    (tanLat / (720 * rho * nu ** 5)) * (61 + 90 * tanLat ** 2 + 45 * tanLat ** 4);
  const X = 1 / (cosLat * nu);
  const XI = (1 / (cosLat * 6 * nu ** 3)) * (nu / rho + 2 * tanLat ** 2);
  const XII =
    (1 / (cosLat * 120 * nu ** 5)) * (5 + 28 * tanLat ** 2 + 24 * tanLat ** 4);
  const XIIA =
    (1 / (cosLat * 5040 * nu ** 7)) *
    (61 + 662 * tanLat ** 2 + 1320 * tanLat ** 4 + 720 * tanLat ** 6);

  return [
    lat - VII * dE2 + VIII * dE2 ** 2 - IX * dE2 ** 3,
    LON0 + X * dE - XI * dE2 * dE + XII * dE2 ** 2 * dE - XIIA * dE2 ** 3 * dE,
  ];
}

const A_WGS84 = 6378137;
const B_WGS84 = 6356752.3142;
const E2_WGS84 = 1 - (B_WGS84 * B_WGS84) / (A_WGS84 * A_WGS84);

/** Latitude/longitude in degrees, WGS84. */
export type LatLon = { lat: number; lon: number };

/**
 * Easting/northing → WGS84 latitude/longitude in degrees.
 *
 * The rotation sign convention here is the OS's own (x − rz·y + ry·z, and so
 * on). Checked against the Greenwich meridian, which OSGB36 defines as 0° while
 * WGS84 puts ~102 m east of it — the one anchor where the *direction* of a
 * sign error is unmistakable.
 */
export function toLatLon(easting: number, northing: number): LatLon {
  const [lat, lon] = osgb36LatLon(easting, northing);

  const sinLat = Math.sin(lat);
  const cosLat = Math.cos(lat);
  const sinLon = Math.sin(lon);
  const cosLon = Math.cos(lon);
  const nu = A_AIRY / Math.sqrt(1 - E2 * sinLat * sinLat);

  const x = nu * cosLat * cosLon;
  const y = nu * cosLat * sinLon;
  const z = (1 - E2) * nu * sinLat;

  const tx = 446.448;
  const ty = -125.157;
  const tz = 542.06;
  const scale = -20.4894e-6;
  const arcsec = Math.PI / (180 * 3600);
  const rx = 0.1502 * arcsec;
  const ry = 0.247 * arcsec;
  const rz = 0.8421 * arcsec;

  const x2 = tx + (1 + scale) * (x - rz * y + ry * z);
  const y2 = ty + (1 + scale) * (rz * x + y - rx * z);
  const z2 = tz + (1 + scale) * (-ry * x + rx * y + z);

  const p = Math.sqrt(x2 * x2 + y2 * y2);
  let latWgs = Math.atan2(z2, p * (1 - E2_WGS84));
  for (let i = 0; i < 6; i++) {
    const nuWgs = A_WGS84 / Math.sqrt(1 - E2_WGS84 * Math.sin(latWgs) ** 2);
    latWgs = Math.atan2(z2 + E2_WGS84 * nuWgs * Math.sin(latWgs), p);
  }

  return {
    lat: (latWgs * 180) / Math.PI,
    lon: (Math.atan2(y2, x2) * 180) / Math.PI,
  };
}

/** `53.3806°N 1.4695°W` — the form the map readout uses. */
export function formatLatLon({ lat, lon }: LatLon): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${ns} ${Math.abs(lon).toFixed(4)}°${ew}`;
}

/* ── The window, in grid terms ───────────────────────────────────────────── */

/** True when the point falls inside the baked window — outside it, the render
 *  is sampling mirrored terrain, so the "position" it reports would be fiction. */
export function insideWindow(easting: number, northing: number): boolean {
  const { minX, minY, maxX, maxY } = TOPOGRAPHY.window;
  return easting >= minX && easting <= maxX && northing >= minY && northing <= maxY;
}

/* ── Known-answer cases ─────────────────────────────────────────────────────
   Real published coordinates. The prototype runs these on load and reports the
   result, so a regression in either half of the maths shows up on screen rather
   than quietly producing a plausible-but-wrong number.
   ------------------------------------------------------------------------- */

export type GridRefCase = {
  easting: number;
  northing: number;
  expected: string;
  label: string;
};

export const GRID_REF_CASES: readonly GridRefCase[] = [
  { easting: 435860, northing: 387370, expected: 'SK 358 873', label: 'Sheffield' },
  { easting: 530000, northing: 180000, expected: 'TQ 300 800', label: 'London' },
  { easting: 447000, northing: 129000, expected: 'SU 470 290', label: 'Winchester' },
  { easting: 545000, northing: 258000, expected: 'TL 450 580', label: 'Cambridge' },
  { easting: 425000, northing: 564000, expected: 'NZ 250 640', label: 'Newcastle' },
  { easting: 420000, northing: 380000, expected: 'SK 200 800', label: 'window SW' },
  { easting: 445000, northing: 400000, expected: 'SE 450 000', label: 'window NE' },
];

export type ProjectionCase = {
  easting: number;
  northing: number;
  lat: number;
  lon: number;
  label: string;
};

/**
 * The OS's own worked example from "A guide to coordinate systems in Great
 * Britain" — chosen because it sits far from the central meridian, so it
 * exercises the full projection series rather than just its first terms.
 */
export const PROJECTION_CASES: readonly ProjectionCase[] = [
  { easting: 651409.903, northing: 313177.27, lat: 52.6575703, lon: 1.7179216, label: 'OS guide example' },
];

export type SelfTest = {
  label: string;
  pass: boolean;
  got: string;
  /** Metres of error, for the projection cases. */
  metres?: number;
};

/** Runs every known-answer case. Used by the prototype's control panel. */
export function selfTest(): SelfTest[] {
  const results: SelfTest[] = GRID_REF_CASES.map((c) => {
    const got = toGridRef(c.easting, c.northing);
    return { label: c.label, got, pass: got === c.expected };
  });

  for (const c of PROJECTION_CASES) {
    const got = toLatLon(c.easting, c.northing);
    const dNorth = (got.lat - c.lat) * 111320;
    const dEast = (got.lon - c.lon) * 111320 * Math.cos((got.lat * Math.PI) / 180);
    const metres = Math.hypot(dNorth, dEast);
    results.push({
      label: c.label,
      got: formatLatLon(got),
      pass: metres < 1,
      metres,
    });
  }

  return results;
}
