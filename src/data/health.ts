import { useEffect, useState } from 'react';

/** One day of a metric in the 3-day drill-down histories. */
export type HistoryPoint = { date: string; value: number | null };

export type WeatherDay = {
  date: string;
  hiC: number | null;
  loC: number | null;
  code: number | null;
};

export type HealthData = {
  fetchedAt: string;
  date: string;
  steps: number | null;
  activeMinutes: number | null;
  restingHeartRate: number | null;
  calories: number | null;
  history?: {
    steps: HistoryPoint[];
    calories: HistoryPoint[];
    restingHeartRate: HistoryPoint[];
  } | null;
  weather?: {
    tempC: number | null;
    code: number | null;
    forecast: WeatherDay[];
  } | null;
  sun?: {
    sunrise: string | null;
    sunset: string | null;
    sunriseTomorrow: string | null;
  } | null;
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
