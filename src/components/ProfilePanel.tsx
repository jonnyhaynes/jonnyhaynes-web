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
 * lg only. Below that the panel is stacked above the content, and a portrait up
 * there can't be part of the hero's full-height centred block — the first screen
 * would be the portrait plus a screenful, not a screenful. So the hero renders its
 * own portrait at those widths instead, and this column appears when there's room
 * beside it.
 */
export function ProfilePanel() {
  return (
    <div className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:items-center">
      <PortraitFigure />
    </div>
  );
}
