import { useFitbitData } from '../data/fitbit';

/** One stat tile. Renders a muted em-dash when the metric is missing. */
function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="rounded-lg border border-muted/20 bg-background/70 p-4 backdrop-blur-sm">
      <p className="font-mono text-xs uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-medium text-foreground">
        {value}
        {unit && <span className="ml-1 text-sm text-muted">{unit}</span>}
      </p>
    </div>
  );
}

/**
 * Health section — a light-touch personality widget backed by the baked Fitbit
 * snapshot (kept beyond the spec). Renders nothing until data loads, so a
 * missing/stale JSON just hides the section (graceful degradation).
 */
export function Health() {
  const data = useFitbitData();
  if (!data) return null;

  // Each metric can be null independently; show a dash rather than "0".
  const fmt = (n: number | null, digits = 0) =>
    n === null ? '—' : n.toLocaleString('en-GB', { maximumFractionDigits: digits });

  return (
    <section id="health" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // Life beyond the keyboard
      </h2>

      <p className="mt-4 max-w-xl text-muted">
        A day away from the compiler, more or less — pulled from my Fitbit.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Steps" value={fmt(data.steps)} />
        <Stat label="Active" value={fmt(data.activeMinutes)} unit="min" />
        <Stat label="Sleep" value={fmt(data.sleepHours, 1)} unit="hrs" />
        <Stat label="Resting HR" value={fmt(data.restingHeartRate)} unit="bpm" />
      </div>
    </section>
  );
}
