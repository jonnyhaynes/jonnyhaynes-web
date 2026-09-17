import { useBitbucketData } from '../data/bitbucket';
import { useGitHubData } from '../data/github';
import { useProjects } from '../data/projects';
import { CurrentlyBuildingChip } from './CurrentlyBuildingChip';
import { ProjectCard } from './ProjectCard';
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
    // The shell's pane gives every section the same content container, so the
    // grid sits in the same width as the prose sections rather than a wider one.
    <section id="projects" className="scroll-mt-16 py-16">
      {/* The activity chip sits beside the title rather than pinned to the top of
          the page — it's a fact about the work, so it belongs with the work. */}
      <SectionHeading section="projects">
        <CurrentlyBuildingChip />
      </SectionHeading>

      <ProjectStats
        contributions={github?.totalContributions ?? null}
        repositories={github?.repoCount ?? null}
        mergedPullRequests={bitbucket?.mergedPullRequests ?? null}
        contributedRepositories={bitbucket?.repositories ?? null}
      />

      {projects.length > 0 ? (
        // One across on phones, two from `md` — and two is the ceiling, so no
        // further breakpoint is needed. Below lg the pane is the full width of a
        // one-column shell (~720px at md, so ~348px cards); at lg it narrows to
        // two thirds with the panel and rail (~285px cards). Two holds in both.
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      ) : (
        // Graceful degradation: nothing curated and the GitHub data absent.
        <p className="mt-6 text-muted">Projects are loading…</p>
      )}
    </section>
  );
}
