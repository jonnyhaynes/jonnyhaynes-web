import { useGitHubData } from '../data/github';
import { SKILL_GROUPS } from '../content/skills';
import { LanguageBar } from './LanguageBar';

export function Skills() {
  const data = useGitHubData();

  return (
    <section id="skills" className="scroll-mt-16 py-16">
      <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
        // Skills
      </h2>

      {/* Data-backed language breakdown, above the hand-picked skills. */}
      {data?.languages?.length ? (
        <div className="mt-6">
          <LanguageBar languages={data.languages} />
        </div>
      ) : null}

      <div className="mt-10 grid gap-8 sm:grid-cols-3">
        {SKILL_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="font-medium text-foreground">{group.title}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {group.skills.map((skill) => (
                <li key={skill} className="text-muted">
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
