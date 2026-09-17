import { useGitHubData } from '../data/github';
import { SKILL_GROUPS } from '../content/skills';
import { LanguageBar } from './LanguageBar';
import { SectionHeading } from './SectionHeading';

export function Skills() {
  const data = useGitHubData();

  return (
    <section id="skills" className="scroll-mt-16 py-16">
      <SectionHeading section="skills" />

      {/* Data-backed language breakdown, above the hand-picked skills. */}
      {data?.languages?.length ? (
        <div className="mt-6">
          <LanguageBar languages={data.languages} />
        </div>
      ) : null}

      {/* The tools as a taxonomy rather than three flat lists: each group is a
          node and its tools hang off a connector, so the shape says "these
          belong to that" before you read a word. Plain nested lists underneath,
          so it stays navigable and crawlable. */}
      <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {SKILL_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="flex items-baseline gap-2 font-mono text-sm font-medium text-foreground">
              <span aria-hidden="true" className="text-accent-start">
                ✢
              </span>
              {group.title}
            </h3>
            <ul className="skill-tree mt-4 flex list-none flex-col gap-2 p-0">
              {group.skills.map((skill) => (
                <li key={skill} className="skill-node text-muted">
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
