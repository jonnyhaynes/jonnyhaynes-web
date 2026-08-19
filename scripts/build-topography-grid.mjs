// PROVENANCE: source data is OS Terrain 50 (free, OGL v3). Download the GB
// ASCII-grid zip from the OS Downloads API (https://osdatahub.os.uk/downloads/open,
// "OS Terrain 50" → ASCII Grid), extract the SK grid-square .asc tiles, and pass
// their directory as argv[2]. Output is committed as public/topography-grid.json.
// Contains OS data (c) Crown copyright and database right. Licensed OGL v3.0.
//
// This is the ASCII-relief sibling of build-topography.mjs. Instead of tracing
// marching-squares contour lines, it bakes a small normalised HEIGHT GRID that
// the Canvas 2D background samples to pick an ASCII glyph per cell. Every cell
// carries relief (not just the 40m contour bands), which is what the character
// shading needs.
//
// Pipeline: read .asc tiles (ESRI ASCII grid) covering the South Yorkshire
// window → stitch into one elevation grid → area-average downsample to a fixed
// render resolution → normalise elevations to 0..255 → base64 a Uint8 array →
// write public/topography-grid.json.
//
// This is a ONE-TIME bake (terrain doesn't change) — it is NOT wired into the
// scheduled data-baking job, and it does NOT call the OS API itself; it consumes
// an already-extracted tile directory.
//
// Usage: node scripts/build-topography-grid.mjs <dir-of-asc-tiles>

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// --- South Yorkshire window (British National Grid eastings/northings, metres).
// Identical to build-topography.mjs so the ASCII relief covers the same ground
// as the old contour art: the Peak edge west of Sheffield down into the city.
const WIN = { minX: 420000, minY: 380000, maxX: 445000, maxY: 400000 };

// Render resolution of the baked grid (cells across × down). The window is
// 25km × 20km; at ~200×160 each cell is ~125m — plenty of relief for a
// background, and the JSON stays small (~32kB base64). Tune here.
const OUT_COLS = 200;
const OUT_ROWS = 160;

const OUT_JSON = 'public/topography-grid.json';
const OUT_LICENCE = 'public/topography-grid.LICENCE.txt';

// --- ESRI ASCII grid parser (shared shape with build-topography.mjs). --------
// Header lines: ncols, nrows, xllcorner, yllcorner, cellsize, NODATA_value;
// then nrows rows of ncols values, north-to-south (top row = highest y).
function parseAsc(text) {
  const lines = text.split('\n');
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
    grid.push(lines[row + r].trim().split(/\s+/).map(Number));
  }
  return { ncols, nrows, xllcorner, yllcorner, cellsize, nodata, grid };
}

// Assemble tiles into one elevation grid clipped to WIN, at native 50m cells.
// NaN marks cells with no data (outside coverage / NODATA).
function stitch(tiles) {
  const cell = tiles[0].cellsize;
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
  return { grid: out, rows, cols };
}

// Area-average downsample the native grid to OUT_COLS × OUT_ROWS. Each output
// cell averages the native cells that fall inside its footprint, ignoring NaN.
// Output cells with no data fall back to the window mean so the field has no
// holes (a background must never show gaps).
function downsample(grid, rows, cols) {
  const out = new Float64Array(OUT_COLS * OUT_ROWS);
  const filled = new Uint8Array(OUT_COLS * OUT_ROWS);
  let sum = 0, n = 0;
  for (let oy = 0; oy < OUT_ROWS; oy++) {
    const r0 = Math.floor((oy / OUT_ROWS) * rows);
    const r1 = Math.max(r0 + 1, Math.floor(((oy + 1) / OUT_ROWS) * rows));
    for (let ox = 0; ox < OUT_COLS; ox++) {
      const c0 = Math.floor((ox / OUT_COLS) * cols);
      const c1 = Math.max(c0 + 1, Math.floor(((ox + 1) / OUT_COLS) * cols));
      let s = 0, k = 0;
      for (let r = r0; r < r1; r++) {
        for (let c = c0; c < c1; c++) {
          const v = grid[r]?.[c];
          if (!Number.isNaN(v) && v !== undefined) { s += v; k++; }
        }
      }
      const idx = oy * OUT_COLS + ox;
      if (k) { out[idx] = s / k; filled[idx] = 1; sum += s / k; n++; }
    }
  }
  const mean = n ? sum / n : 0;
  for (let i = 0; i < out.length; i++) if (!filled[i]) out[i] = mean;
  return out;
}

function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: node scripts/build-topography-grid.mjs <dir-of-asc-tiles>');
    process.exit(1);
  }
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.asc'));
  const tiles = files
    .map((f) => parseAsc(readFileSync(join(dir, f), 'utf8')))
    .filter((t) => {
      const tmaxX = t.xllcorner + t.ncols * t.cellsize;
      const tmaxY = t.yllcorner + t.nrows * t.cellsize;
      return t.xllcorner < WIN.maxX && tmaxX > WIN.minX &&
             t.yllcorner < WIN.maxY && tmaxY > WIN.minY;
    });
  if (!tiles.length) throw new Error('No tiles intersect the window');

  const { grid, rows, cols } = stitch(tiles);
  const field = downsample(grid, rows, cols);

  // Normalise to 0..255 across the observed elevation range.
  let lo = Infinity, hi = -Infinity;
  for (const v of field) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = hi - lo || 1;
  const bytes = new Uint8Array(field.length);
  for (let i = 0; i < field.length; i++) {
    bytes[i] = Math.round(((field[i] - lo) / span) * 255);
  }

  const json = {
    cols: OUT_COLS,
    rows: OUT_ROWS,
    min: Math.round(lo),
    max: Math.round(hi),
    // base64 of the raw Uint8 grid (row-major, north-to-south).
    data: Buffer.from(bytes).toString('base64'),
  };
  writeFileSync(OUT_JSON, JSON.stringify(json));

  writeFileSync(
    OUT_LICENCE,
    'topography-grid.json is derived from Ordnance Survey OS Terrain 50.\n' +
      'Contains OS data © Crown copyright and database right.\n' +
      'Licensed under the Open Government Licence v3.0.\n',
  );

  const kb = (JSON.stringify(json).length / 1024).toFixed(0);
  console.log(
    `elev ${json.min}–${json.max}m · ${rows}×${cols} native → ` +
      `${OUT_COLS}×${OUT_ROWS} grid · ${kb}kB → ${OUT_JSON}`,
  );
}

main();
