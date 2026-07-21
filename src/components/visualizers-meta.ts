// Shared metadata for the Now Playing visualizers. Kept separate from
// visualizers.tsx so that file only exports components (React Fast Refresh).

export type VisualizerKind = 'spectrum' | 'scope' | 'plasma';

// Single source of truth for the switcher (see KnobControl). `label` is the
// full accessible name; `short` is the compact caption printed around the
// knob; `angle` (deg) drives both the knob's indicator rotation and the
// drag mapping. Order here is the knob's order, left → right.
export const VISUALIZERS: {
  kind: VisualizerKind;
  label: string;
  short: string;
  angle: number;
}[] = [
  { kind: 'spectrum', label: 'Spectrum bars', short: 'Bars', angle: -45 },
  { kind: 'scope', label: 'Oscilloscope', short: 'Wave', angle: 0 },
  { kind: 'plasma', label: 'Plasma', short: 'Plasma', angle: 45 },
];
