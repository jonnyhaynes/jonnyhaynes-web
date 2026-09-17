import { useBitbucketData } from '../data/bitbucket';
import { useGitHubData } from '../data/github';
import { useProjects } from '../data/projects';
import { CurrentlyBuildingChip } from './CurrentlyBuildingChip';
import { ProjectCard } from './ProjectCard';
import { ProjectStats } from './ProjectStats';
import { SectionHeading } from './SectionHeading';

/** How many cards show before the rest go behind the reveal. */
const SHOWN = 3;

export function Projects() {
  // The curated grid: the repos named in FEATURED_REPOS, then the hand-written
  // work projects. Work projects are static, so they render even if the GitHub
  // snapshot never arrives — see src/content/projects.ts.
  const projects = useProjects();
  const github = useGitHubData();
  const bitbucket = useBitbucketData();

  const shown = projects.slice(0, SHOWN);
  const rest = projects.slice(SHOWN);

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
            repositories={github?.repoCount ?? null}
            mergedPullRequests={bitbucket?.mergedPullRequests ?? null}
            contributedRepositories={bitbucket?.repositories ?? null}
          />
        </div>

        <div className="md:order-1">
          {projects.length > 0 ? (
            /* One card per row at every width. The column is too narrow for two
               once the figures have their own, and a single stack is what the
               reveal below reads best against. */
            <div className="flex flex-col gap-6">
              {shown.map((project) => (
                <ProjectCard key={project.name} project={project} />
              ))}

              {rest.length > 0 && (
                /* A native disclosure rather than a state toggle, so the collapsed
                   cards stay in the HTML for crawlers and the control still works
                   with JavaScript off. `.project-reveal` paints the summary last,
                   putting the control under the list it reveals. */
                <details className="project-reveal">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-2 font-mono text-sm text-muted transition-colors hover:text-accent-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start [&::-webkit-details-marker]:hidden">
                    <span className="project-reveal-more">
                      Show all {projects.length} projects
                    </span>
                    <span className="project-reveal-fewer">Show fewer projects</span>
                    <span aria-hidden="true" className="project-reveal-chevron">
                      ▾
                    </span>
                  </summary>

                  <div className="flex flex-col gap-6">
                    {rest.map((project) => (
                      <ProjectCard key={project.name} project={project} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            // Graceful degradation: nothing curated and the GitHub data absent.
            <p className="text-muted">Projects are loading…</p>
          )}
        </div>
      </div>
    </section>
  );
}
