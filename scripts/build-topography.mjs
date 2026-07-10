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
const CONTOUR_INTERVAL = 50; // metres between isolines — sparse enough to read.
const DOWNSAMPLE = 2; // use every Nth cell (50m→100m) to cut path count/size.

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
  for (let lvl = Math.ceil(lo / CONTOUR_INTERVAL) * CONTOUR_INTERVAL; lvl < hi; lvl += CONTOUR_INTERVAL) {
    const segs = isolines(grid, rows, cols, lvl);
    // Round to whole grid units — at this resolution sub-unit precision is
    // invisible and roughly halves the byte count.
    const d = segs
      .map(([a, b]) => `M${Math.round(a[0])} ${Math.round(a[1])}L${Math.round(b[0])} ${Math.round(b[1])}`)
      .join('');
    if (d) paths.push(d);
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows}" ` +
    `fill="none" stroke="currentColor" stroke-width="0.4" stroke-linecap="round">` +
    paths.map((d) => `<path d="${d}"/>`).join('') +
    `</svg>`;

  const out = 'public/topography-south-yorkshire.svg';
  writeFileSync(out, svg);
  console.log(`elev ${lo}–${hi}m · ${rows}×${cols} grid · ${paths.length} contour levels · ${(svg.length / 1024).toFixed(0)}kB → ${out}`);
}

main();
