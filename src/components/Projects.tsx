import { useBitbucketData } from '../data/bitbucket';
import { useGitHubData } from '../data/github';
import { useProjects } from '../data/projects';
import { CurrentlyBuildingChip } from './CurrentlyBuildingChip';
import { ProjectRow } from './ProjectRow';
import { ProjectStats } from './ProjectStats';
import { SectionHeading } from './SectionHeading';

export function Projects() {
  // The curated grid: the repos named in FEATURED_REPOS, then the hand-written
  // work projects. Work projects are static, so they render even if the GitHub
  // snapshot never arrives — see src/content/projects.ts.
  const projects = useProjects();
  const github = useGitHubData();
  const bitbucket = useBitbucketData();

  return (
    <section id="projects" className="scroll-mt-16 py-16">
      {/* The activity chip sits beside the title rather than pinned to the top of
          the page — it's a fact about the work, so it belongs with the work. */}
      <SectionHeading section="projects">
        <CurrentlyBuildingChip />
      </SectionHeading>

      {/* The work in column one, the figures in column two. Below `md` they stack
          with the figures first, which is the order this section had before it had
          columns at all. */}
      <div className="mt-10 grid gap-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="md:order-2">
          <ProjectStats
            contributions={github?.totalContributions ?? null}
            reviews={github?.reviewContributions ?? null}
            repositories={github?.repoCount ?? null}
            mergedPullRequests={bitbucket?.mergedPullRequests ?? null}
            openPullRequests={bitbucket?.openPullRequests ?? null}
            contributedRepositories={bitbucket?.repositories ?? null}
          />
        </div>

        <div className="md:order-1">
          {projects.length > 0 ? (
            /* Every project is a row, so all six titles are visible at once and the
               detail folds away behind each one. Rows rather than cards because six
               cards made this column several times the height of the figures
               beside it. */
            <ul className="divide-y divide-muted/20 border-y border-muted/20">
              {projects.map((project, index) => (
                <ProjectRow
                  key={project.name}
                  project={project}
                  defaultOpen={index === 0}
                />
              ))}
            </ul>
          ) : (
            // Graceful degradation: nothing curated and the GitHub data absent.
            <p className="text-muted">Projects are loading…</p>
          )}
        </div>
      </div>
    </section>
  );
}
