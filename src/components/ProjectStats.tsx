import { WORK_PROJECTS } from '../content/projects';

const NUMBER = new Intl.NumberFormat('en-GB');

/**
 * Adds whichever figures are present. A missing snapshot should thin the total
 * rather than blank the stat — and a missing figure must never count as zero.
 */
const sumPresent = (...values: (number | null)[]) => {
  const present = values.filter((value): value is number => value != null);
  return present.length ? present.reduce((running, value) => running + value, 0) : null;
};

/**
 * Big-number readouts for the Projects section — the one place the site has real
 * counts worth showing at display size.
 *
 * Every figure is derived, never asserted: the award total is the sum of the awards
 * actually attached to the work projects, and the repository count is the whole
 * public shelf rather than the curated handful the grid renders. Each is named for
 * where it comes from, so the source is on the page rather than implied.
 *
 * Each figure now spans both platforms. Two things worth knowing before relabelling:
 *
 *  - The repository total adds repositories *owned* on GitHub to repositories
 *    *contributed to* on Bitbucket. Different relationships, so it reads as
 *    "repositories I've worked in" rather than "repositories I own".
 *  - The activity total adds GitHub's contribution count — commits, issues, reviews
 *    and pull requests — to Bitbucket's, which can only report merged pull requests,
 *    because Bitbucket has no contributions API. So the Bitbucket side misses
 *    commits that never went through a pull request, and the total reads low rather
 *    than high.
 *
 * Anything missing is omitted rather than shown as a zero.
 */
export function ProjectStats({
  contributions,
  repositories,
  mergedPullRequests,
  contributedRepositories,
}: {
  contributions: number | null;
  repositories: number | null;
  mergedPullRequests: number | null;
  contributedRepositories: number | null;
}) {
  const awards = WORK_PROJECTS.reduce((total, project) => total + project.awards.length, 0);
  const activity = sumPresent(contributions, mergedPullRequests);
  const workedIn = sumPresent(repositories, contributedRepositories);

  const stats = [
    activity != null && {
      value: NUMBER.format(activity),
      label: 'contributions · GitHub + Bitbucket',
    },
    workedIn != null && {
      value: String(workedIn),
      label: 'repositories · GitHub + Bitbucket',
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
