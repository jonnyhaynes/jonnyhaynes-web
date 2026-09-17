import { WORK_PROJECTS } from '../content/projects';

const NUMBER = new Intl.NumberFormat('en-GB');

/**
 * Big-number readouts for the Projects section — the one place the site has real
 * counts worth showing at display size.
 *
 * Every figure is derived, never asserted: the award total is the sum of the
 * awards actually attached to the work projects, and the project count is what
 * the grid is really rendering. Contributions come from the baked snapshot and
 * are omitted rather than shown as zero when that fetch is missing.
 */
export function ProjectStats({
  projects,
  contributions,
}: {
  projects: number;
  contributions: number | null;
}) {
  const awards = WORK_PROJECTS.reduce((total, project) => total + project.awards.length, 0);

  const stats = [
    contributions != null && {
      value: NUMBER.format(contributions),
      label: 'contributions · past year',
    },
    projects > 0 && { value: String(projects), label: 'projects' },
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
