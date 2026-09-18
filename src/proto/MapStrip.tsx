import { TOPOGRAPHY } from '../content/topography';
import type { Traverse } from '../lib/traverse';

/**
 * The map data strip: the chrome's positional readout.
 *
 * Reads as OS sheet furniture — reference, coordinates, scale, source, and
 * distance walked — rather than as a status bar, because every value in it is
 * either a fixed fact about the baked dataset or a real position on the route.
 *
 * Not a live region and not `aria-hidden`: a continuously-updating coordinate is
 * useless noise if it's announced on every scroll frame, but it's still real
 * content a screen-reader user can choose to read, so it stays in the tree
 * without demanding attention.
 */
export function MapStrip({ traverse }: { traverse: Traverse }) {
  return (
    <div className="proto-strip">
      <span>
        <span className="proto-strip-value">{traverse.ref}</span>
        <span className="proto-strip-mid">
          {' · '}
          {traverse.coord}
        </span>
      </span>

      <span className="proto-strip-mid">
        1:25 000 · {TOPOGRAPHY.source}
      </span>

      <span className="proto-strip-spacer">
        {traverse.km.toFixed(1)} km · {traverse.ascentM} m ▲
        {traverse.elevationM !== null && ` · ${traverse.elevationM} m`}
      </span>

      <span className="proto-strip-progress" />
    </div>
  );
}

/**
 * The same values for the rail, set vertically.
 *
 * A 3.75rem column can't hold a coordinate horizontally, but rotated it holds
 * one comfortably — and vertical lettering is what a map sheet actually does
 * along its margin, so the constraint produces the better answer rather than
 * forcing a compromise.
 */
export function RailReadout({ traverse }: { traverse: Traverse }) {
  return (
    <p className="proto-rail-readout">
      {traverse.ref} · {traverse.coord}
    </p>
  );
}
