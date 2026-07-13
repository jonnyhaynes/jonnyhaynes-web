# Resume PDF (light-theme, two-column)

> **Note:** built interactively; this plan documents the work after the fact for
> the paper trail rather than as a pre-approved spec.

## Goal

Provide a downloadable CV at `public/resume.pdf`, generated from
`docs/resume.md` and styled to match the site's light theme. Re-enable the
Contact section's "Download Resume" button (`SITE.resumeUrl`).

## Approach

A build script (`scripts/resume/build-resume.mjs`) parses the hand-authored
`docs/resume.md`, renders a print-optimised A4 HTML document, and prints it to
PDF via headless system Chrome. The HTML is self-contained — JetBrains Mono
(latin 400/500) embedded as base64 woff2, the South Yorkshire contour SVG
inlined — so generation is offline and deterministic.

## Layout

- **Full-width header** mirroring the site hero: `// Ey up. I'm a
  <role>` microcopy over a heather-gradient name.
- **Two columns:** a floated narrow left **sidebar** (core stack, top skills,
  certifications, education — each in a site-style bordered card) and a wide
  right **main** lane (summary + experience, borderless plain text).
- The sidebar is floated so it occupies the left lane on page 1 only; the main
  content keeps its reserved left margin, so experience stays in the right lane
  on later pages with the left empty.
- Page margins live on `@page` so they repeat on every page.
- Plain white background; a whisper-faint contour relief behind the content.

## Styling notes

- Tokens lifted from `src/index.css` (`[data-theme='light']`): foreground
  `#202225`, muted `#61697a`, heather accent `#8b52a1`/`#673d7a`.
- The gradient name is inline SVG `<text>` (Chrome's PDF rasteriser mis-clips
  CSS `background-clip:text`). The gradient sweeps magenta → heather → indigo,
  echoing the site hero's animated drift.
- Cards use the site's project-card recipe (rounded-lg, `muted/20` border);
  skill chips use the rounded-full outline pill treatment.

## Regeneration

After editing `docs/resume.md`:

```sh
node scripts/resume/build-resume.mjs
```

Then commit the updated `public/resume.pdf`. See
`scripts/resume/README.md` for details.

## Acceptance criteria

- `public/resume.pdf` exists and renders in the site's light theme.
- The Contact "Download Resume" button links to it (`SITE.resumeUrl`).
- `npm run build` and `npm run lint` pass.
