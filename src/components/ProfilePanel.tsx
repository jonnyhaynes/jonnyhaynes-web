import { PortraitFigure } from './PortraitFigure';

/**
 * The left panel: the portrait, and nothing else.
 *
 * It deliberately carries no name, role, blurb or calls to action. Every one of
 * those was already said elsewhere — the hero states the name and the role, and
 * repeats the same pitch and the same two destinations — so the panel was
 * restating the page rather than adding to it.
 *
 * That also means it isn't a landmark: an `<aside>` here would announce a
 * complementary region containing a single image. The portrait's alt text carries
 * its meaning, so a plain wrapper is the honest markup.
 *
 * It sits directly above the hero on a phone, so the portrait runs straight into
 * the eyebrow, and vertically centred in its own column from lg.
 */
export function ProfilePanel() {
  return (
    <div className="shrink-0 px-6 pt-6 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:items-center lg:px-0 lg:pt-0">
      <PortraitFigure />
    </div>
  );
}
