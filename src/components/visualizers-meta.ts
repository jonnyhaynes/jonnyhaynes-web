// Shared metadata for the Now Playing visualizers. Kept separate from
// visualizers.tsx so that file only exports components (React Fast Refresh).

export type VisualizerKind = 'spectrum' | 'scope' | 'plasma';

// Drives the front-end switcher; `label` is the full accessible name (the
// button glyph is an inline SVG, see VisualizerIcon).
export const VISUALIZERS: { kind: VisualizerKind; label: string }[] = [
  { kind: 'spectrum', label: 'Spectrum bars' },
  { kind: 'scope', label: 'Oscilloscope' },
  { kind: 'plasma', label: 'Plasma' },
];
