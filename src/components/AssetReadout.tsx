import { useAssets } from '../lib/assets';

const ROW = 'flex items-baseline justify-between gap-3';

/**
 * The asset readout: what the page actually fetched, and how long each took.
 *
 * Deliberately not a loading spinner. The data-driven sections render nothing
 * until their snapshot arrives, so without this they just pop in unannounced —
 * this accounts for the wait honestly, and reflects real state rather than
 * simulating progress.
 *
 * A native `<details>` disclosure, so it's keyboard-operable and accessible for
 * free, and it stays collapsed to a single line when everything is fine. Renders
 * nothing on the server or before the first request: there is genuinely nothing
 * to report yet, and the prerendered HTML shouldn't carry noise.
 */
export function AssetReadout() {
  const assets = useAssets();
  if (!assets.length) return null;

  const ok = assets.filter((asset) => asset.state === 'ok').length;
  const failed = assets.length - ok;

  return (
    // `sm:text-right` pins the summary to the column's right edge. The element is
    // shrink-to-fit and the open list is wider than the closed summary, so without
    // it the title slides left as the box widens — the column is right-aligned
    // from `sm`, so that's the edge it has to hold. Below `sm` the column is
    // left-aligned instead, and the left edge is the one that stays put.
    <details className="group font-mono text-[0.65rem] text-muted sm:text-right">
      <summary className="cursor-pointer list-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-start [&::-webkit-details-marker]:hidden">
        assets {ok}/{assets.length}
        {failed > 0 ? ` · ${failed} failed` : ''}
        <span
          aria-hidden="true"
          className="ml-1 inline-block transition-transform group-open:rotate-90 motion-reduce:transition-none"
        >
          ›
        </span>
      </summary>

      <ul className="mt-2 flex list-none flex-col gap-1 p-0">
        {assets.map((asset) => (
          <li key={asset.name} className={ROW}>
            <span className="truncate">{asset.name}</span>
            <span
              className={
                asset.state === 'error' ? 'shrink-0 text-accent-start' : 'shrink-0'
              }
            >
              {asset.state === 'ok'
                ? `${asset.ms} ms`
                : asset.state === 'error'
                  ? 'failed'
                  : '…'}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
