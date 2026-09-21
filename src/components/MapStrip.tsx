import { TOPOGRAPHY } from '../content/topography';
import type { Traverse } from '../lib/traverse';

/**
 * The map data strip: the chrome's own positional readout.
 *
 * Full width and above every region on every route, because what it reports is
 * where the *page* is on the sheet rather than where any one section is. The
 * reference, the coordinates and the distance come from the traverse; the source
 * and its cell size are fixed facts about the bake.
 *
 * There is deliberately no "1:25 000" here. A map's scale is a claim about what a
 * fixed length of paper covers, and this map's on-screen scale changes with the
 * viewport — so it would be a number that drifts and lies. The dataset's own
 * resolution says the same thing and stays true.
 *
 * Progress is the strip's own bottom edge rather than a second bar, so the page
 * gains an indicator without gaining furniture.
 *
 * Not a live region and not `aria-hidden`: a coordinate that updates on every
 * scroll frame is noise if it's announced, but it is real content that a screen
 * reader can choose to read, so it stays in the tree without demanding attention.
 */
export function MapStrip({ traverse }: { traverse: Traverse }) {
  return (
    <div className="map-strip">
      <span>
        <span className="map-strip-live">{traverse.ref}</span>
        <span className="map-strip-wide"> · {traverse.coord}</span>
      </span>

      <span className="map-strip-wide">
        {TOPOGRAPHY.source} · {TOPOGRAPHY.cellMetres} m
      </span>

      <span className="map-strip-end">
        {traverse.km.toFixed(1)} km · {traverse.ascentM} m ▲
        {traverse.elevationM !== null && ` · ${traverse.elevationM} m`}
      </span>

      <span className="map-strip-progress" />
    </div>
  );
}
