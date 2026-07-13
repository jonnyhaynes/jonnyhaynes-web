// PROVENANCE: source data is OS Terrain 50 (free, OGL v3). Download the GB
// ASCII-grid zip from the OS Downloads API, extract the SK grid-square .asc
// tiles, and pass their directory as argv[2]. Output is committed as
// public/topography-south-yorkshire.svg. Contains OS data (c) Crown copyright.
//
// Turn OS Terrain 50 ASCII-grid tiles for a South Yorkshire window into a
// simplified contour SVG, baked to public/topography-south-yorkshire.svg.
//
// Pipeline: read .asc tiles (ESRI ASCII grid) covering a chosen National Grid
// window → stitch into one elevation grid → marching-squares isolines at fixed
// elevation intervals → simplify → emit SVG <path>s in a normalised viewBox.
//
// Usage: node build-topo.mjs <dir-of-asc-tiles>
//
// ESRI ASCII grid header:
//   ncols, nrows, xllcorner, yllcorner, cellsize, NODATA_value
// then nrows lines of ncols values, north-to-south (top row = highest y).

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// --- South Yorkshire window (British National Grid eastings/northings, metres).
// Sheffield sits around E 435000, N 387000; the dramatic relief is the Peak
// edge just west. This window spans the moors west of the city into the city.
const WIN = { minX: 420000, minY: 380000, maxX: 445000, maxY: 400000 };
const CONTOUR_INTERVAL = 40; // metres between isolines — sparse enough to read.
const DOWNSAMPLE = 1; // full 50m resolution → smoother, more detailed contours.
const SMOOTH_ITERS = 4; // Chaikin passes to round off the marching-squares steps.
const MIN_POLYLINE_PTS = 20; // drop short stub contours (the stray straight bits).

function parseAsc(text) {
  const lines = text.split('\n');
  const h = {};
  let row = 0;
  const meta = {};
  for (; row < lines.length; row++) {
    const m = lines[row].trim().match(/^(\w+)\s+(-?[\d.]+)$/);
    if (!m) break;
    meta[m[1].toLowerCase()] = parseFloat(m[2]);
  }
  const { ncols, nrows, xllcorner, yllcorner, cellsize } = meta;
  const nodata = meta.nodata_value ?? -9999;
  const grid = [];
  for (let r = 0; r < nrows; r++) {
    const vals = lines[row + r].trim().split(/\s+/).map(Number);
    grid.push(vals);
  }
  return { ncols, nrows, xllcorner, yllcorner, cellsize, nodata, grid };
}

// Assemble tiles into one big grid indexed by BNG coords, clipped to WIN.
function stitch(tiles) {
  const cell = tiles[0].cellsize * DOWNSAMPLE; // effective cell size
  const cols = Math.round((WIN.maxX - WIN.minX) / cell);
  const rows = Math.round((WIN.maxY - WIN.minY) / cell);
  const out = Array.from({ length: rows }, () => new Array(cols).fill(NaN));
  for (const t of tiles) {
    for (let r = 0; r < t.nrows; r++) {
      for (let c = 0; c < t.ncols; c++) {
        const x = t.xllcorner + c * t.cellsize;
        const y = t.yllcorner + (t.nrows - 1 - r) * t.cellsize; // asc is N→S
        if (x < WIN.minX || x >= WIN.maxX || y < WIN.minY || y >= WIN.maxY) continue;
        const oc = Math.floor((x - WIN.minX) / cell);
        const or = rows - 1 - Math.floor((y - WIN.minY) / cell);
        const v = t.grid[r][c];
        if (v !== t.nodata) out[or][oc] = v;
      }
    }
  }
  return { grid: out, rows, cols, cell };
}

// Marching squares: return line segments for one elevation level.
function isolines(grid, rows, cols, level) {
  const segs = [];
  const at = (r, c) => grid[r]?.[c];
  // Guard equal endpoints (v2-v1 === 0) → midpoint, never ±Infinity.
  const interp = (v1, v2) => (v2 === v1 ? 0.5 : (level - v1) / (v2 - v1));
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = at(r, c), tr = at(r, c + 1), br = at(r + 1, c + 1), bl = at(r + 1, c);
      if ([tl, tr, br, bl].some((v) => Number.isNaN(v))) continue;
      let idx = 0;
      if (tl > level) idx |= 8;
      if (tr > level) idx |= 4;
      if (br > level) idx |= 2;
      if (bl > level) idx |= 1;
      if (idx === 0 || idx === 15) continue;
      const top = () => [c + interp(tl, tr), r];
      const right = () => [c + 1, r + interp(tr, br)];
      const bottom = () => [c + interp(bl, br), r + 1];
      const left = () => [c, r + interp(tl, bl)];
      const edges = {
        1: [left, bottom], 2: [bottom, right], 3: [left, right],
        4: [top, right], 5: [top, left], 6: [top, bottom], 7: [top, left],
        8: [top, left], 9: [top, bottom], 10: [top, right], 11: [top, right],
        12: [left, right], 13: [left, bottom], 14: [bottom, right],
      };
      const e = edges[idx];
      if (e) segs.push([e[0](), e[1]()]);
    }
  }
  return segs;
}

// Chain disconnected marching-squares segments into continuous polylines by
// matching shared endpoints. Quantised keys tolerate float jitter.
function joinSegments(segs) {
  const key = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const ends = new Map(); // endpoint key → list of segment indices
  segs.forEach((s, i) => {
    for (const end of [0, 1]) {
      const k = key(s[end]);
      if (!ends.has(k)) ends.set(k, []);
      ends.get(k).push(i);
    }
  });
  const used = new Array(segs.length).fill(false);
  const lines = [];
  for (let seed = 0; seed < segs.length; seed++) {
    if (used[seed]) continue;
    used[seed] = true;
    const line = [segs[seed][0], segs[seed][1]];
    // Extend forward (dir=1) then backward (dir=0) by hopping shared endpoints.
    for (const dir of [1, 0]) {
      for (;;) {
        const tip = dir ? line[line.length - 1] : line[0];
        const cand = (ends.get(key(tip)) ?? []).find((i) => !used[i]);
        if (cand === undefined) break;
        used[cand] = true;
        const s = segs[cand];
        // Append the endpoint that isn't the tip we matched on.
        const other = key(s[0]) === key(tip) ? s[1] : s[0];
        if (dir) line.push(other);
        else line.unshift(other);
      }
    }
    // A contour is closed if, after chaining, its two ends coincide (the
    // isoline forms a loop around high/low ground). Most real contours do.
    const closed =
      line.length > 3 && key(line[0]) === key(line[line.length - 1]);
    lines.push({ points: line, closed });
  }
  return lines;
}

// Chaikin corner-cutting: rounds the staircase into smooth curves. For closed
// loops it cuts every edge including the seam (wrapping around) so the loop
// stays smooth all the way round with no flat spot at the join.
function chaikin(points, iters, closed = false) {
  let pts = points;
  for (let it = 0; it < iters; it++) {
    if (pts.length < 3) break;
    const out = closed ? [] : [pts[0]];
    const n = pts.length;
    const last = closed ? n : n - 1; // closed: also cut the wrap-around edge
    for (let i = 0; i < last; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      out.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25]);
      out.push([p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
    }
    if (!closed) out.push(pts[n - 1]);
    pts = out;
  }
  return pts;
}

// Collinearity thinning: drop a point only when it sits (within EPS) on the
// straight line between the previous kept point and the next one. This trims
// redundant points on straight runs — shrinking the file — WITHOUT flattening
// curves, because points that carry real curvature deviate from that line and
// are kept. Much better than a distance dedupe, which straightens curves.
function thin(pts, eps = 0.7, closed = false) {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = out[out.length - 1], b = pts[i], c = pts[i + 1];
    // Perpendicular distance of b from line a→c.
    const dx = c[0] - a[0], dy = c[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const dist = Math.abs((b[0] - a[0]) * dy - (b[1] - a[1]) * dx) / len;
    if (dist > eps) out.push(b);
  }
  // Keep the last point for open lines; for closed loops it duplicates the
  // start (the join returned start==end), so drop it — Z closes the path.
  if (!closed) out.push(pts[pts.length - 1]);
  return out;
}

function polylineToPath(p, closed = false) {
  // Points are already thinned+smoothed. 1-decimal precision in a 500-wide
  // viewBox is plenty and halves the bytes. Closed loops end with Z.
  return (
    `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}` +
    p.slice(1).map((q) => `L${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('') +
    (closed ? 'Z' : '')
  );
}

function main() {
  const dir = process.argv[2];
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.asc'));
  const tiles = files
    .map((f) => parseAsc(readFileSync(join(dir, f), 'utf8')))
    .filter((t) => {
      const tx = t.xllcorner, ty = t.yllcorner;
      const tmaxX = tx + t.ncols * t.cellsize, tmaxY = ty + t.nrows * t.cellsize;
      return tx < WIN.maxX && tmaxX > WIN.minX && ty < WIN.maxY && tmaxY > WIN.minY;
    });
  if (!tiles.length) throw new Error('No tiles intersect the window');

  const { grid, rows, cols } = stitch(tiles);

  // Elevation range present, to pick sensible contour levels.
  let lo = Infinity, hi = -Infinity;
  for (const row of grid) for (const v of row) if (!Number.isNaN(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }

  const paths = [];
  let levels = 0;
  let polylines = 0;
  for (let lvl = Math.ceil(lo / CONTOUR_INTERVAL) * CONTOUR_INTERVAL; lvl < hi; lvl += CONTOUR_INTERVAL) {
    const segs = isolines(grid, rows, cols, lvl);
    if (!segs.length) continue;
    levels++;
    // Join the loose segments into continuous contours (closed loops where the
    // isoline encircles high ground), drop tiny fragments, then smooth.
    const lines = joinSegments(segs).filter((l) => l.points.length >= MIN_POLYLINE_PTS);
    for (const { points, closed } of lines) {
      polylines++;
      // Thin the raw (coarse) polyline first — points are ~1 unit apart here,
      // so collinear thinning behaves well — THEN Chaikin-smooth the survivors
      // into curves. Closed loops smooth around the seam and render with Z.
      paths.push(
        polylineToPath(chaikin(thin(points, 0.7, closed), SMOOTH_ITERS, closed), closed),
      );
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows}" ` +
    `fill="none" stroke="currentColor" stroke-width="0.2" stroke-linecap="round" stroke-linejoin="round">` +
    paths.map((d) => `<path d="${d}"/>`).join('') +
    `</svg>`;

  const out = 'public/topography-south-yorkshire.svg';
  writeFileSync(out, svg);
  console.log(`elev ${lo}–${hi}m · ${rows}×${cols} grid · ${levels} levels · ${polylines} contours · ${(svg.length / 1024).toFixed(0)}kB → ${out}`);
}

main();
