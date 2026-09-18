import { useMemo } from 'react';

import { selfTest } from '../lib/gridref';
import type { Variant } from './variant';

/**
 * PROTOTYPE ONLY — deleted once the direction is settled.
 *
 * The background, reticle, direction, readout and progress controls are gone:
 * those choices are approved and now live as constants in `variant.ts`, so
 * leaving switches for them would only advertise options that no longer exist.
 * What's left is what's still genuinely open — reduced motion, plus two readouts
 * that help judge whether the whole thing hangs together.
 *
 * `activeSection` (what the nav highlights, from `useActiveSection`) sits beside
 * `traverseWaypoint` (what the route says you're at) because they are two
 * independent answers to "where am I", and this is the place to find out whether
 * they agree in practice.
 */
export function ProtoControls({
  variant,
  onChange,
  activeSection,
  traverseWaypoint,
}: {
  variant: Variant;
  onChange: (patch: Partial<Variant>) => void;
  activeSection: string | null;
  traverseWaypoint: string;
}) {
  const results = useMemo(() => selfTest(), []);
  const failures = results.filter((result) => !result.pass);
  const agrees = activeSection === traverseWaypoint;

  return (
    <details className="proto-controls">
      <summary>Prototype controls · not part of the design</summary>
      <div className="proto-controls-body">
        <p className="proto-note" style={{ marginTop: 0 }}>
          Step 2: <strong>the hero</strong>. Background and chrome are settled —
          traverse pan, reticle, rising into the Peak, full-width strip with the
          progress edge. The sections below are still placeholders.
        </p>

        <fieldset>
          <legend>Reduced motion</legend>
          <label>
            <input
              type="checkbox"
              checked={variant.reduce}
              onChange={(e) => onChange({ reduce: e.target.checked })}
            />
            <span>simulate prefers-reduced-motion</span>
          </label>
          <p className="proto-note">
            Stills the traverse, the reticle and the hero drift. Still to be
            checked against the real OS setting.
          </p>
        </fieldset>

        <fieldset>
          <legend>Where am I?</legend>
          <p className="proto-note" style={{ marginTop: 0 }}>
            nav says <strong>{activeSection ?? '—'}</strong>, route says{' '}
            <strong>{traverseWaypoint}</strong>{' '}
            <span className={agrees ? 'proto-pass' : 'proto-fail'}>
              {agrees ? '· agree' : '· disagree'}
            </span>
          </p>
        </fieldset>

        <fieldset>
          <legend>Known-answer checks</legend>
          <p
            className={failures.length ? 'proto-fail' : 'proto-pass'}
            style={{ margin: 0 }}
          >
            {failures.length
              ? `${failures.length} of ${results.length} failing: ${failures
                  .map((failure) => failure.label)
                  .join(', ')}`
              : `${results.length}/${results.length} passing`}
          </p>
          <p className="proto-note">
            Grid references and the OSGB36→WGS84 projection, checked against
            published Ordnance Survey values on every load.
          </p>
        </fieldset>
      </div>
    </details>
  );
}
