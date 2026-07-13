# Resume PDF

`public/resume.pdf` is generated from [`docs/resume.md`](../../docs/resume.md),
styled to mirror the site's light "Chalk / Deep Coal / Bright Heather" theme:
the hero-style gradient header (`// Ey up…` microcopy → gradient name → role),
lowercase `// section` labels, rounded outline skill pills (the project-card
chips), and the faint contour relief. Tokens are lifted from `src/index.css`.

## Regenerate

After editing `docs/resume.md`:

```sh
node scripts/resume/build-resume.mjs
```

Then commit the updated `public/resume.pdf`.

## How it works

`build-resume.mjs` parses the (hand-authored, stable-shape) resume Markdown,
renders a print-optimised A4 HTML document, and prints it to PDF via headless
system Chrome (`--print-to-pdf`). The HTML is fully self-contained:

- **Fonts** — JetBrains Mono latin (400/500) embedded as base64 woff2
  (`jetbrains-mono-latin-*.woff2.b64`), so the PDF needs no network and the
  output is deterministic.
- **Background** — the South Yorkshire contour relief
  (`public/topography-south-yorkshire.svg`, OS Terrain 50, © Crown copyright,
  OGL v3) inlined and tinted the muted colour at low opacity, matching the
  site's base topo layer.
- **Name** — rendered as inline SVG `<text>` with a heather gradient fill.
  (CSS `background-clip:text` mis-clips the trailing glyph in Chrome's PDF
  rasteriser; an SVG gradient vectorises cleanly.)

Requires Google Chrome at the standard macOS path; override with the `CHROME`
env var. `DEBUG_HTML=<path>` keeps a copy of the rendered HTML for inspection.
