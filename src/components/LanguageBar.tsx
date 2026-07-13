import type { GitHubLanguage } from '../data/github';
import { LANGUAGE_COLORS, LANGUAGE_FALLBACK } from '../content/languages';

/**
 * GitHub language-breakdown bar (spec §C): a single stacked bar showing the
 * share of each top language across the fetched repos, with a legend. Backed by
 * real data — validates the manual skills below it.
 */
export function LanguageBar({ languages }: { languages: GitHubLanguage[] }) {
  const total = languages.reduce((sum, l) => sum + l.count, 0);
  if (!total) return null;

  const withPct = languages.map((l) => ({
    ...l,
    pct: (l.count / total) * 100,
    color: LANGUAGE_COLORS[l.name] ?? LANGUAGE_FALLBACK,
  }));

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-wider text-muted">
        Languages, by GitHub
      </p>

      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
        {withPct.map((l) => (
          <div
            key={l.name}
            className="h-full"
            style={{ width: `${l.pct}%`, backgroundColor: l.color }}
            title={`${l.name} ${Math.round(l.pct)}%`}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {withPct.map((l) => (
          <li key={l.name} className="flex items-center gap-1.5 text-sm text-muted">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: l.color }}
              aria-hidden="true"
            />
            {l.name}
            <span className="text-muted/70">{Math.round(l.pct)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
