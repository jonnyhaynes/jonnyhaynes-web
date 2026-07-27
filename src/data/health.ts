import { useEffect, useState } from 'react';

export type HealthData = {
  fetchedAt: string;
  date: string;
  steps: number | null;
  activeMinutes: number | null;
  sleepHours: number | null;
  restingHeartRate: number | null;
};

/**
 * Loads the baked health snapshot from public/data/health.json.
 *
 * Returns `null` while loading and on any failure — the health section is
 * built to degrade gracefully, so a failed fetch (or missing file before the
 * first bake) just shows the section's rest-day fallback.
 */
export function useHealthData(): HealthData | null {
  const [data, setData] = useState<HealthData | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/data/health.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json: HealthData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        // Leave data null; the section renders its rest-day fallback.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
