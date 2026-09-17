import { SCALE_TICKS_KM, TOPOGRAPHY } from '../content/topography';

const ROW = 'flex justify-between gap-2';

/**
 * The source-data colophon for the background relief — real map furniture rather
 * than another credit line: a scale bar, the dataset extent, the sheet, the
 * elevation range, and the OGL attribution the licence actually requires.
 *
 * The values describe the *dataset*, not the pixels on screen. That distinction
 * matters: the background drifts continuously, so anchoring a spot height to a
 * point in the viewport would be a lie. Everything here stays true whatever the
 * canvas is doing.
 *
 * The label is a `<p>`, not a heading — the document outline is the hero's h1
 * plus the seven section h2s, and a colophon shouldn't join that list.
 */
export function MapLegend() {
  return (
    <div className="max-w-sm">
      <p className="font-mono text-[0.65rem] text-muted">// source</p>

      {/* Segmented scale bar: five 5 km blocks spanning the 25 km window. */}
      <div aria-hidden="true" className="mt-3">
        <div className="flex h-2 overflow-hidden rounded-[2px]">
          {SCALE_TICKS_KM.slice(0, -1).map((km, i) => (
            <span
              key={km}
              className={`flex-1 ${i % 2 === 0 ? 'bg-muted/50' : 'bg-muted/20'}`}
            />
          ))}
        </div>
        <div className={`mt-1 font-mono text-[0.6rem] text-muted ${ROW}`}>
          {SCALE_TICKS_KM.map((km) => (
            <span key={km}>{km}</span>
          ))}
        </div>
        <p className="mt-0.5 font-mono text-[0.6rem] text-muted">km · east</p>
      </div>

      <dl className="mt-4 flex flex-col gap-1 font-mono text-[0.65rem] text-muted">
        <div className={ROW}>
          <dt>extent</dt>
          <dd>
            {TOPOGRAPHY.widthKm} × {TOPOGRAPHY.heightKm} km
          </dd>
        </div>
        <div className={ROW}>
          <dt>grid</dt>
          <dd>
            {TOPOGRAPHY.cols} × {TOPOGRAPHY.rows} · {TOPOGRAPHY.cellMetres} m
          </dd>
        </div>
        <div className={ROW}>
          <dt>sheet</dt>
          <dd>
            {TOPOGRAPHY.sheet} · {TOPOGRAPHY.source}
          </dd>
        </div>
        <div className={ROW}>
          <dt>relief</dt>
          <dd>
            {TOPOGRAPHY.minElevationM}–{TOPOGRAPHY.maxElevationM} m
          </dd>
        </div>
      </dl>

      <p className="mt-4 font-mono text-[0.6rem] leading-relaxed text-muted">
        {TOPOGRAPHY.attribution}.<br />
        Licensed under the {TOPOGRAPHY.licence}.
      </p>
    </div>
  );
}
