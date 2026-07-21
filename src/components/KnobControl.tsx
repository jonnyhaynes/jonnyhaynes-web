import { useRef } from 'react';
import { VISUALIZERS, type VisualizerKind } from './visualizers-meta';

type KnobControlProps = {
  visualizer: VisualizerKind;
  onChange: (kind: VisualizerKind) => void;
};

// Vertical drag distance (px) that advances one mode. Dragging up = previous,
// down = next; the accumulator carries the remainder so a slow drag still
// steps cleanly.
const DRAG_STEP = 30;

/**
 * Brushed-metal rotary knob that switches the Now Playing visualizer. It's a
 * `radiogroup`: the three short captions are the accessible radios (roving
 * tabindex + arrow keys), while the knob face and dots are decorative
 * (`aria-hidden`) affordances — the face drags, the dots click. The indicator
 * rotates to the active mode's angle.
 */
export function KnobControl({ visualizer, onChange }: KnobControlProps) {
  const index = VISUALIZERS.findIndex((v) => v.kind === visualizer);
  const activeIndex = index === -1 ? 0 : index;
  const angle = VISUALIZERS[activeIndex].angle;

  // Drag state: the pointer's last Y and the accumulated distance since the
  // last mode step. Refs, not state — they don't drive rendering.
  const lastY = useRef<number | null>(null);
  const accum = useRef(0);

  const setByIndex = (i: number) => {
    // Wrap so the knob is a continuous dial.
    const wrapped = ((i % VISUALIZERS.length) + VISUALIZERS.length) % VISUALIZERS.length;
    const next = VISUALIZERS[wrapped];
    if (next.kind !== visualizer) onChange(next.kind);
  };

  const startDrag = (e: React.PointerEvent) => {
    lastY.current = e.clientY;
    accum.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDrag = (e: React.PointerEvent) => {
    if (lastY.current === null) return;
    // Up (negative delta) → previous, down → next.
    accum.current += e.clientY - lastY.current;
    lastY.current = e.clientY;
    while (accum.current <= -DRAG_STEP) {
      accum.current += DRAG_STEP;
      setByIndex(activeIndex - 1);
    }
    while (accum.current >= DRAG_STEP) {
      accum.current -= DRAG_STEP;
      setByIndex(activeIndex + 1);
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    lastY.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        setByIndex(activeIndex - 1);
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        setByIndex(activeIndex + 1);
        break;
      case 'Home':
        e.preventDefault();
        setByIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setByIndex(VISUALIZERS.length - 1);
        break;
    }
  };

  return (
    <div className="knob-control" role="radiogroup" aria-label="Visualizer style">
      {/* Knob face — drag to turn. The dots on the face are the accessible
          radios (roving tabindex + arrow keys); the metal/indicator/cap are
          decorative. */}
      <div
        className="knob-face"
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="knob-metal" aria-hidden="true" />
        <div className="knob-ridges" aria-hidden="true" />
        <div
          className="knob-indicator"
          aria-hidden="true"
          style={{ transform: `rotate(${angle}deg)` }}
        />
        <div className="knob-cap" aria-hidden="true" />

        {/* Dots — arced on the face at each mode's angle; they ARE the radios. */}
        {VISUALIZERS.map((opt) => {
          const active = opt.kind === visualizer;
          return (
            <button
              key={opt.kind}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={opt.label}
              tabIndex={active ? 0 : -1}
              className="knob-dot"
              data-active={active}
              style={{ '--dot-angle': `${opt.angle}deg` } as React.CSSProperties}
              onClick={() => onChange(opt.kind)}
              onKeyDown={handleKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
            />
          );
        })}
      </div>
    </div>
  );
}
