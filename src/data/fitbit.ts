import { useEffect, useState } from 'react';

export type FitbitData = {
  fetchedAt: string;
  date: string;
  steps: number | null;
  activeMinutes: number | null;
  sleepHours: number | null;
  restingHeartRate: number | null;
};

/**
 * Loads the baked Fitbit snapshot from public/data/fitbit.json.
 *
 * Returns `null` while loading and on any failure — the health section is
 * built to degrade gracefully, so a failed fetch (or missing file before the
 * first bake) just shows the section's rest-day fallback.
 */
export function useFitbitData(): FitbitData | null {
  const [data, setData] = useState<FitbitData | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/data/fitbit.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json: FitbitData) => {
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
