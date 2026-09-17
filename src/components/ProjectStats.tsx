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

/** Counts read badly at one: "1 open pull requests". */
const countLabel = (count: number, singular: string) =>
  count === 1 ? singular : `${singular}s`;

/**
 * Big-number readouts for the Projects section — the one place the site has real
 * counts worth showing at display size.
 *
 * Every figure is derived, never asserted: the award total is the sum of the awards
 * actually attached to the work projects, and the project count spans every
 * repository rather than the curated handful the grid renders.
 *
 * Both totals span GitHub and Bitbucket, and the labels deliberately don't say so.
 * Two things worth knowing before changing them:
 *
 *  - The project total adds repositories *owned* on GitHub to repositories merely
 *    *contributed to* on Bitbucket. Different relationships: it reads as "projects
 *    I've worked in", not "projects I own".
 *  - The activity total adds GitHub's contribution count — commits, issues, reviews
 *    and pull requests — to Bitbucket's, which can only report merged pull requests,
 *    because Bitbucket has no contributions API. The Bitbucket side therefore misses
 *    commits that never went through a pull request, so the total reads low rather
 *    than high.
 *
 * Anything missing is omitted rather than shown as a zero.
 */
export function ProjectStats({
  contributions,
  reviews,
  repositories,
  mergedPullRequests,
  openPullRequests,
  contributedRepositories,
}: {
  contributions: number | null;
  reviews: number | null;
  repositories: number | null;
  mergedPullRequests: number | null;
  openPullRequests: number | null;
  contributedRepositories: number | null;
}) {
  const awards = WORK_PROJECTS.reduce((total, project) => total + project.awards.length, 0);
  const activity = sumPresent(contributions, mergedPullRequests);
  const projectCount = sumPresent(repositories, contributedRepositories);

  const stats = [
    activity != null && {
      value: NUMBER.format(activity),
      label: countLabel(activity, 'contribution'),
    },
    // Only shown when there are some. A zero would read as a deficiency rather
    // than a fact, and the reviewing that does happen is on Bitbucket, whose API
    // can't count it — so this is data that may simply never appear.
    reviews != null &&
      reviews > 0 && {
        value: NUMBER.format(reviews),
        label: countLabel(reviews, 'code review'),
      },
    projectCount != null && {
      value: String(projectCount),
      label: countLabel(projectCount, 'project'),
    },
    // The only figure describing now rather than the total so far.
    openPullRequests != null && {
      value: String(openPullRequests),
      label: countLabel(openPullRequests, 'open pull request'),
    },
    awards > 0 && {
      value: String(awards),
      label: countLabel(awards, 'industry award'),
    },
  ].filter((stat): stat is { value: string; label: string } => Boolean(stat));

  if (!stats.length) return null;

  return (
    <dl className="flex flex-col gap-8">
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
