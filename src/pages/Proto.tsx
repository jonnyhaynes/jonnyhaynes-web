import { Hero } from '../components/Hero';
import { Projects } from '../components/Projects';
import { SECTIONS } from '../content/sections';
import { waypointFor } from '../content/waypoints';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { heading } from '../theme/copy';
import { useTheme } from '../theme/useTheme';

const META = {
  title: 'Prototype — map chrome and hero',
  description: 'Throwaway prototype route: the map-backed background, chrome and hero.',
  path: '/proto',
};

/**
 * PROTOTYPE ONLY.
 *
 * Step 1 (background + chrome) is settled and its values now live in
 * `variant.ts`. Step 2 is the hero, which is the real `Hero` component rather
 * than a copy — so what's being reviewed is the thing that would ship, and there's
 * no second version to keep in step.
 *
 * The sections below the hero are still placeholders: they exist to give the
 * traverse distance to cover and to keep the nav's active state honest, and each
 * one's own content arrives in its own step.
 */
export function Proto() {
  useDocumentMeta(META);
  const { palette } = useTheme();

  return (
    <main id="main" tabIndex={-1} className="proto-sections focus:outline-none">
      <Hero />

      {/* Rebuilt sections are the real components, so what's reviewed is what
          would ship. The rest are still markers. */}
      <Projects />

      {SECTIONS.filter(({ id }) => id !== 'projects').map(({ id }) => {
        const waypoint = waypointFor(id);
        return (
          <section key={id} id={id} className="proto-section">
            <h2 className="proto-section-label">{heading(palette, id)}</h2>
            <p className="proto-section-ref">
              {waypoint?.ref ?? '—'} · section content not yet rebuilt
            </p>
          </section>
        );
      })}
    </main>
  );
}
