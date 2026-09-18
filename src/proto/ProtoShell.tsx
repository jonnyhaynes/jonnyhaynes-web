import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';

import { BackToTopButton } from '../components/BackToTopButton';
import { SectionNavLinks } from '../components/SectionNavLinks';
import { SECTION_IDS } from '../content/sections';
import { useActiveSection } from '../lib/useActiveSection';
import { resetBackground, setBackground, useTraverse } from '../lib/traverse';
import { PaletteToggle } from '../theme/PaletteToggle';
import { ThemeToggle } from '../theme/ThemeToggle';
import { MapStrip, RailReadout } from './MapStrip';
import { ProtoControls } from './ProtoControls';
import { DEFAULT_VARIANT, type Variant } from './variant';
import './proto.css';

/**
 * PROTOTYPE ONLY — step 1: background + chrome.
 *
 * Mirrors the real shell's structure (bar, panel, pane, rail) so the chrome can
 * be judged in its true position, but owns its wrappers so the shipped `.shell`
 * rules and the live site's behaviour are untouched. Reuses the real chrome
 * internals — the nav links, the toggles, back-to-top, the portrait — rather
 * than stand-ins, so what's being reviewed is the actual components in a new
 * arrangement.
 *
 * Deleted, along with `proto.css` and the control panel, once a direction is
 * agreed.
 */
export function ProtoShell() {
  const [variant, setVariant] = useState<Variant>(DEFAULT_VARIANT);
  const update = (patch: Partial<Variant>) => setVariant((v) => ({ ...v, ...patch }));

  const traverse = useTraverse({ reverse: variant.reverse, frozen: variant.reduce });

  // Push the variant into the background store. The canvas reads it once per
  // frame, so changing this costs no re-render and doesn't restart the canvas.
  useEffect(() => {
    setBackground({
      mode: variant.reduce ? 'static' : variant.mode,
      reticle: variant.reticle && !variant.reduce,
    });
  }, [variant.mode, variant.reticle, variant.reduce]);

  // Leaving the prototype must hand the background back to the shipped
  // behaviour, or every other route would inherit the traverse.
  useEffect(() => resetBackground, []);

  const { active, scrolled } = useActiveSection(SECTION_IDS);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <div
        className="proto"
        data-readout={variant.readout}
        data-progress={variant.progress}
        data-reduce={String(variant.reduce)}
      >
        <header className="proto-bar gap-2 border-b border-muted/15 bg-background/80 px-4 backdrop-blur-sm">
          <BackToTopButton scrolled={scrolled} />
          <SectionNavLinks active={active} orientation="horizontal" />
          <div className="flex shrink-0 items-center gap-1">
            <PaletteToggle />
            <ThemeToggle />
          </div>
        </header>

        <MapStrip traverse={traverse} />

        <div className="shell" data-layout="panel">
          <div className="pane">
            <Outlet />
          </div>

          <div className="proto-rail">
            <BackToTopButton scrolled={scrolled} />

            <RailReadout traverse={traverse} />

            {/* The rail is the route: the line reports progress behind tiles
                that stay put, so the controls never move as you scroll. */}
            <div className="proto-route">
              <div className="proto-route-line" aria-hidden="true">
                <span className="proto-route-track" />
                <span className="proto-route-fill" />
              </div>
              <SectionNavLinks active={active} orientation="vertical" />
            </div>

            <div className="proto-rail-toggles">
              <PaletteToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>

        <ProtoControls
          variant={variant}
          onChange={update}
          activeSection={active}
          traverseWaypoint={traverse.waypoint.id}
        />
      </div>
    </>
  );
}
