import { useEffect, useState } from 'react';

export type CVPosition = {
  title: string;
  company: string;
  start: string | null;
  end: string | null;
  description: string;
};

export type CVData = {
  generatedAt: string;
  name: string;
  headline: string;
  location: string;
  summary: string;
  clients: string[];
  positions: CVPosition[];
  skills: string[];
};

/**
 * Loads the CV snapshot from public/data/cv.json, generated locally from a
 * LinkedIn data export by scripts/parse-cv.mjs.
 *
 * Returns `null` while loading and on any failure — the CV section degrades
 * gracefully, so a missing file just hides it rather than breaking the page.
 */
export function useCVData(): CVData | null {
  const [data, setData] = useState<CVData | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/data/cv.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json: CVData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        // Leave data null; the section renders its empty state.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
