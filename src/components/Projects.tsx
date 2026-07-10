import { useGitHubData } from '../data/github';
import { FEATURED_ORDER, PROJECT_NOTES } from '../content/projects';
import { ProjectCard, type FeaturedProject } from './ProjectCard';

/** Compact relative time, e.g. "3 days ago". Falls back to null on bad input. */
function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const seconds = Math.round((Date.now() - then) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const rtf = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
  for (const [unit, secs] of units) {
    if (seconds >= secs) return rtf.format(-Math.floor(seconds / secs), unit);
  }
  return rtf.format(-seconds, 'second');
}

/** "Currently Building" widget — the most recently pushed repo + last commit. */
function CurrentlyBuilding({
  data,
}: {
  data: ReturnType<typeof useGitHubData>;
}) {
  const activity = data?.lastActivity;
  if (!activity) return null;

  const when = relativeTime(activity.committedAt);

  return (
    <div className="mt-10 rounded-lg border border-accent-start/30 bg-accent-start/[0.04] p-4">
      <p className="font-mono text-xs uppercase tracking-wider text-accent-start">
        Currently building
      </p>
      <p className="mt-2 text-foreground">
        <a
          href={activity.url}
          target="_blank"
          rel="noreferrer noopener"
          className="font-medium underline decoration-muted/40 underline-offset-4 transition-colors hover:text-accent-start"
        >
          {activity.repo}
        </a>
      </p>
      {activity.message && (
        <p className="mt-1 truncate font-mono text-sm text-muted">
          {activity.message}
        </p>
      )}
      {when && <p className="mt-1 text-xs text-muted">{when}</p>}
    </div>
  );
}

export function Projects() {
  const data = useGitHubData();

  // Merge live GitHub project data with the hand-written notes, ordered by the
  // curated FEATURED_ORDER. A featured repo missing from the fetch is skipped.
  const byName = new Map((data?.projects ?? []).map((p) => [p.name, p]));
  const featured: FeaturedProject[] = FEATURED_ORDER.map((name) => {
    const project = byName.get(name);
    if (!project) return null;
    return { ...project, note: PROJECT_NOTES[name] };
  }).filter((p): p is FeaturedProject => p !== null);

  return (
    <section id="projects" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // Projects
      </h2>

      {featured.length > 0 ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {featured.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      ) : (
        // Graceful degradation: GitHub data not loaded / no featured repos.
        <p className="mt-6 text-muted">Projects are loading…</p>
      )}

      <CurrentlyBuilding data={data} />
    </section>
  );
}
