import { WORK_PROJECTS } from '../content/projects';

const NUMBER = new Intl.NumberFormat('en-GB');

/**
 * Big-number readouts for the Projects section — the one place the site has real
 * counts worth showing at display size.
 *
 * Every figure is derived, never asserted: the award total is the sum of the awards
 * actually attached to the work projects, and the repository count is the whole
 * public shelf rather than the curated handful the grid renders. Each is named for
 * where it comes from, so the source is on the page rather than implied.
 *
 * Anything missing is omitted rather than shown as a zero.
 */
export function ProjectStats({
  repositories,
  contributions,
}: {
  repositories: number | null;
  contributions: number | null;
}) {
  const awards = WORK_PROJECTS.reduce((total, project) => total + project.awards.length, 0);

  const stats = [
    contributions != null && {
      value: NUMBER.format(contributions),
      label: 'contributions · past year',
    },
    repositories != null && {
      value: String(repositories),
      label: 'repositories on GitHub',
    },
    awards > 0 && { value: String(awards), label: 'industry awards' },
  ].filter((stat): stat is { value: string; label: string } => Boolean(stat));

  if (!stats.length) return null;

  return (
    <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
      {stats.map((stat) => (
        // Term before definition in the DOM; `flex-col-reverse` puts the number
        // on top without breaking the pair's order for a screen reader.
        <div key={stat.label} className="flex flex-col-reverse gap-1">
          <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
            {stat.label}
          </dt>
          <dd className="font-mono text-title font-bold text-foreground">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
