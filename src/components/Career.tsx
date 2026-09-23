import { CAREER_LEAD, CREDENTIALS, ROLES } from '../content/career';
import { WORK_PROJECTS } from '../content/projects';
import { SKILL_GROUPS } from '../content/skills';
import { SectionHeading } from './SectionHeading';

/**
 * Career and credentials: where the work happened and what it qualified for.
 *
 * A timeline and a credential list, in the site's own vocabulary rather than a
 * chart — a hairline rule with a marker per role, small tracked-out labels, squared
 * everything. Each role's summary carries the three things a reader scans for
 * (when, what, where) and the detail folds away behind it, so all seven titles are
 * legible at once without seven blocks of prose. Native `<details>`, so it works
 * with JavaScript off.
 *
 * The marker is a shape as well as a colour — filled for the role held now, hollow
 * for the rest — the same rule the rail's active marker follows, so "current" still
 * reads in greyscale.
 *
 * The awards are deliberately *not* listed here. They are already attached to the
 * projects that won them, and a second copy would say the same thing twice; the
 * credentials block names the count and points at where they live.
 */
export function Career() {
  const awards = WORK_PROJECTS.reduce(
    (total, project) => total + project.awards.length,
    0,
  );

  return (
    <section id="career" className="scroll-mt-16 py-16">
      <SectionHeading section="career" />

      <p className="career-lead">{CAREER_LEAD}</p>

      <ol className="career-roles">
        {ROLES.map((role) => (
          <li key={`${role.company}-${role.period}`}>
            <details className="career-role">
              <summary className="career-summary">
                <span
                  className={`career-marker${role.current ? ' career-marker--current' : ''}`}
                  aria-hidden="true"
                />
                <span className="career-period">{role.period}</span>
                <span className="career-title">
                  {role.current && <span className="sr-only">Current role: </span>}
                  {role.title}
                </span>
                <span className="career-where">
                  {role.company} · {role.place}
                </span>
                <span className="career-chevron" aria-hidden="true">
                  ▾
                </span>
              </summary>

              <ul className="career-detail">
                {role.detail.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ol>

      <div className="career-block">
        <p className="career-block-name">Credentials</p>
        <ul className="career-credentials">
          {CREDENTIALS.map((credential) => (
            <li key={credential.name}>
              <span className="career-cred-name">{credential.name}</span>
              <span className="career-cred-from">
                {credential.from}
                {credential.year ? ` · ${credential.year}` : ''}
              </span>
            </li>
          ))}
          <li>
            <span className="career-cred-name">
              {awards} industry award{awards === 1 ? '' : 's'}
            </span>
            <span className="career-cred-from">listed against the work above</span>
          </li>
        </ul>
      </div>

      <div className="career-block">
        <p className="career-block-name">Stack</p>
        <dl className="career-stack">
          {SKILL_GROUPS.map((group) => (
            <div key={group.title}>
              <dt>{group.title}</dt>
              <dd>{group.skills.join(' · ')}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
