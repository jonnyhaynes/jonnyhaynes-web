import { Career } from '../components/Career';
import { Contact } from '../components/Contact';
import { Footer } from '../components/Footer';
import { Gaming } from '../components/Gaming';
import { Health } from '../components/Health';
import { Hero } from '../components/Hero';
import { Listening } from '../components/Listening';
import { Projects } from '../components/Projects';
import { Reading } from '../components/Reading';
import { useDocumentMeta } from '../lib/useDocumentMeta';

const META = {
  title: 'Jonny Haynes - Est. 1985',
  description:
    'Building React, React Native and TypeScript products — with AI woven through the workflow.',
  path: '/',
};

/**
 * The home page's content, laid out in the shell's centre column. The header,
 * skip link and layout wrappers now live in ShellFrame — this file is just the
 * ordered sections.
 *
 * One container for every section: the pane is already narrower than any of the
 * old per-section max-widths, so the previous max-w-6xl / max-w-4xl split is gone.
 * `tabIndex={-1}` makes the skip link's target focusable, so activating it moves
 * keyboard focus rather than only scrolling.
 */
export function Home() {
  useDocumentMeta(META);

  return (
    <>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl px-6 focus:outline-none"
      >
        <Hero />
        <Projects />
        <Career />
        <Listening />
        <Reading />
        <Gaming />
        <Health />
        <Contact />
      </main>

      <Footer />
    </>
  );
}
