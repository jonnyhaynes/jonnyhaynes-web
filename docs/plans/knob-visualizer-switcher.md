# Knob visualizer switcher

Replace the 3-button segmented control in the NowPlaying deck with a
machined-metal rotary knob that cuts into the bottom-right corner of the
visualizer LCD screen.

---

## Files to change

| Action | File |
|--------|------|
| Create | `src/components/KnobControl.tsx` |
| Modify | `src/components/NowPlaying.tsx` |
| Modify | `src/index.css` |
| Delete | `knob-mockup.html` |

---

## 1. Component interface

```tsx
// KnobControl.tsx
import type { VisualizerKind } from './visualizers-meta';

type KnobControlProps = {
  visualizer: VisualizerKind;
  onChange: (kind: VisualizerKind) => void;
};
```

No external state — it derives everything from `visualizer` and fires
`onChange`.

---

## 2. Visual layout

The knob does **not** overlap the live visualizer. Instead the LCD screen
has a **concave round notch scooped out of its bottom-right corner**, and
the knob nests in that notch, mounted on the deck-panel chrome. The
visualizer never renders under the knob, so there is no clipping or
z-index fight — the LCD's shape is what makes room for the knob.

```
┌─ deck-panel (brushed-metal chrome) ─────────┐
│  Now playing                       ● LED    │
│  ┌─ deck-lcd (square footprint) ─────┐      │
│  │            visualizer             │      │
│  │                              ╲    │      │
│  │                               )        │  ← concave notch in the
│  └──────────────────────────────╱   ○     │     LCD's bottom-right;
│                              Bars Wave Plasma│     knob sits in it, on
│                                 •   •   •    │     the chrome
│  ▸ title — artist                            │  ← readout on chrome,
│  ▓▓▓▓▓░░░░░░░░░  progress                     │     bottom-left
└──────────────────────────────────────────────┘
```

- **LCD**: keeps its square footprint (album art still reads as a cover),
  but a radial-gradient mask scoops a concave round bite out of the
  bottom-right corner that hugs the ~40px knob with an even gap. See §7.
- **Knob**: positioned absolutely in that notch, sitting on the chrome —
  **no negative offsets over the screen**, no `overflow-hidden` conflict.
- **Labels + dots**: the knob's own captions (`Bars / Wave / Plasma`) and
  indicator dots sit just below/around the knob within `.knob-control`.
- **Readout + progress**: move up onto the chrome directly under the LCD,
  bottom-left — essentially their current position, so this part is low
  risk (the old switcher block that lived here is deleted).

---

## 3. KnobControl DOM structure

```tsx
<div
  className="knob-control"
  role="radiogroup"
  aria-label="Visualizer style"
>
  {/* Labels — clickable radio buttons */}
  <div className="knob-labels">
    {OPTIONS.map((opt) => (
      <button
        key={opt.kind}
        role="radio"
        aria-checked={opt.kind === visualizer}
        tabIndex={opt.kind === visualizer ? 0 : -1}
        className="knob-label"
        data-active={opt.kind === visualizer}
        onClick={() => onChange(opt.kind)}
        onKeyDown={handleKeyDown}
      >
        {opt.label}
      </button>
    ))}
  </div>

  {/* Dots — decorative indicator positions */}
  <div className="knob-dots" aria-hidden="true">
    {OPTIONS.map((opt) => (
      <span
        key={opt.kind}
        className="knob-dot"
        data-active={opt.kind === visualizer}
        onClick={() => onChange(opt.kind)}
      />
    ))}
  </div>

  {/* Knob face — decorative, handles drag */}
  <div className="knob-face" aria-hidden="true" onPointerDown={startDrag}>
    <div className="knob-metal" />
    <div className="knob-ridges" />
    <div className="knob-indicator" style={{ transform: `rotate(${angle})` }} />
    <div className="knob-cap" />
  </div>
</div>
```

## 4. Option mapping

**Single source of truth:** derive options from `VISUALIZERS` in
`visualizers-meta.ts` — do **not** redefine a parallel array in
`KnobControl`. The knob needs a short display label and an angle, which
aren't on `VISUALIZERS`, so add them there rather than in the component:

```ts
// visualizers-meta.ts
export const VISUALIZERS = [
  { kind: 'spectrum', label: 'Spectrum bars', short: 'Bars',  angle: -45 },
  { kind: 'scope',    label: 'Oscilloscope',  short: 'Wave',  angle: 0 },
  { kind: 'plasma',   label: 'Plasma',        short: 'Plasma', angle: 45 },
] as const;
```

- `label` stays the full accessible name (used for `aria-label` / SR text).
- `short` is the compact knob caption (`Bars / Wave / Plasma`).
- `angle` (deg) drives both the indicator `transform: rotate()` and the
  drag mapping. Index → angle: `-45 / 0 / +45`.

`KnobControl` maps over `VISUALIZERS`; the mockup's `BARS/WAVE/PLASMA`
strings were placeholders and are replaced by `short`.

## 5. Interactions

### Pointer drag
- `onPointerDown` on `.knob-face` records `clientY` and calls
  `setPointerCapture`
- `onPointerMove` computes delta; every 30px of vertical drag fires
  `onChange` to prev/next mode
- `onPointerUp` releases capture
- `touch-action: none` on the knob face

### Click
- Clicking a label or dot fires `onChange` directly

### Keyboard (roving tabindex on the radio group)
- **ArrowUp / ArrowLeft**: previous mode (wrap to last)
- **ArrowDown / ArrowRight**: next mode (wrap to first)
- **Home**: first mode
- **End**: last mode
- Labels use `role="radio"` with `aria-checked`; the active radio gets
  `tabIndex={0}`, the others get `tabIndex={-1}`

---

## 6. Deck layout change in NowPlaying.tsx

The knob nests in a notch cut from the LCD's bottom-right corner and sits
on the chrome — it does **not** overhang the screen. So we need a
positioning wrapper around the LCD, but the knob's offsets are small/positive
(it sits *in* the notch, not hanging off the panel). The notch itself is a
`mask` on `.deck-lcd` (see §7); `overflow-hidden` on the LCD is fine because
nothing needs to escape it.

### Change

1. Wrap the `.deck-lcd` block in a new `<div className="relative">` so the
   `KnobControl` can position against it and land in the notch.
2. Keep `.deck-lcd`'s classes as-is (`relative overflow-hidden aspect-square`)
   — the visualizer's `absolute inset-0` layer needs `relative`, and the
   notch is applied via `mask`, not overflow.
3. Add `<KnobControl … />` as a sibling of `.deck-lcd` inside the wrapper.
   Its `.knob-control` CSS positions it in the notch (bottom-right, small
   positive inset — see §7), on the chrome, clear of the visualizer.
4. **Remove** the entire trailing switcher block (`.mt-3 grid grid-cols-3 …`
   `role="group"` … `VISUALIZERS.map(...)` with the `.deck-mini-screen`
   previews). The knob replaces it.
5. **Readout + progress bar stay where they are** — on the chrome under the
   LCD, bottom-left. No move needed; deleting the switcher already leaves
   them as the content below the LCD.

```tsx
{/* Header strip — unchanged */}

{/* LCD + Knob container — wrapper gives the knob a positioning context so
    it lands in the LCD's notched bottom-right corner. */}
<div className="relative">
  <div className="deck-lcd relative aspect-square w-full overflow-hidden rounded-sm">
    {/* album art, scrim, <Visualizer /> — unchanged.
        The notch is a mask on .deck-lcd (§7); the visualizer's inset-0
        layer is masked with it, so nothing renders under the knob. */}
  </div>

  {/* Knob nests in the notch, on the chrome — see .knob-control in §7. */}
  <KnobControl visualizer={visualizer} onChange={onVisualizerChange} />
</div>

{/* Readout — unchanged, now the first thing under the LCD */}
{/* Progress bar — unchanged */}
{/* Old switcher block — DELETED */}

{/* Readout — unchanged */}
{/* Progress bar — unchanged */}
{/* Old switcher block — DELETED */}
```

---

## 7. CSS to add to index.css

**Theming decision (resolved):** the knob metal is **theme-aware**, not
fixed-dark. A light-theme plan for Now Playing is in flight, and a dark
metal disc straddling a light LCD reads as a foreign object. Drive the
metal/cap gradients from CSS custom properties defined on `:root` (dark)
with a light-theme override under the site's existing theme selector
(match whatever the rest of `index.css` uses — e.g. `[data-theme='light']`
or the `.light` class; confirm against the current theme setup before
writing). The stops below become the dark-theme defaults of those
variables.

**Confirmed selector:** the site toggles themes via `[data-theme='light']`
on `<html>` (see top of `index.css`), so the light-theme metal override
goes under `[data-theme='light'] .knob-control { … }`.

**Label font size (resolved):** `6.5px` (used in `.knob-label` below)
violates CLAUDE.md's readable-minimum principle and doesn't render
reliably. Bump it to `font-size: clamp(10px, 2.4vw, 11px)`. Three short
captions (`Bars / Wave / Plasma`) at ~10px still fit above a 40px knob
within the 112px control; if they crowd, widen `.knob-control` and grow
the `.knob-labels` gap rather than shrinking the text back. The `6.5px`
value in the CSS block below is superseded.

**Interaction decision (resolved):** drag stays as specced —
`touch-action: none` on the 40px face. A mobile touch landing on the face
switches modes rather than scrolling; accepted trade-off given the small
target and the label/dot tap fallbacks.

### 7a. The LCD notch

The concave round bite in the LCD's bottom-right corner is a **mask** on
`.deck-lcd` — a radial-gradient centred on the knob's position that punches
a transparent circle (plus a small even gap) out of the screen. Because
`mask` composites with the existing background layers, the scanlines and
screen gradient are cut cleanly; the visualizer's `absolute inset-0` layer
sits inside `.deck-lcd` and is clipped by the same box, so nothing renders
in the scoop.

```css
.deck-lcd {
  /* existing background/box-shadow rules stay */
  --notch-cx: calc(100% - 22px);   /* knob centre X, matches .knob-control */
  --notch-cy: calc(100% - 6px);    /* knob centre Y */
  --notch-r: 28px;                 /* scoop radius = knob radius (20px) + gap */
  -webkit-mask: radial-gradient(
    circle var(--notch-r) at var(--notch-cx) var(--notch-cy),
    transparent 0 var(--notch-r),
    black calc(var(--notch-r) + 0.5px)
  );
  mask: radial-gradient(
    circle var(--notch-r) at var(--notch-cx) var(--notch-cy),
    transparent 0 var(--notch-r),
    black calc(var(--notch-r) + 0.5px)
  );
}
```

Tune `--notch-cx/cy/r` against the real knob so the gap is even. The knob's
`.knob-control` origin must line up with the same corner (below).

> Note: the LCD's inset `box-shadow` won't follow the masked edge (shadows
> aren't masked). If the scoop rim looks flat, add a thin curved highlight
> with a second `.deck-lcd::after` radial-gradient ring at the notch, rather
> than relying on the inset shadow. Flag at review if it reads poorly.

### 7b. Knob styles

Add a new section after the existing deck styles. Replace the hardcoded
hex in `.knob-metal` / `.knob-cap` with `var(--knob-metal-*)` /
`var(--knob-cap-*)` custom properties (dark defaults shown inline as the
fallback), and add a light-theme block overriding them with a brighter,
warmer brushed-aluminium palette:

```css
/* ---------------------------------------------------------------------------
 * Knob Control — brushed-metal rotary knob for visualizer switching.
 * Nests in the concave notch cut from the LCD's bottom-right corner (§7a),
 * sitting on the deck-panel chrome — it does NOT overlap the visualizer.
 * ------------------------------------------------------------------------- */

.knob-control {
  position: absolute;
  /* Sits IN the notch, on the chrome — small positive insets, not the old
     negative overhang. Align with --notch-cx/cy on .deck-lcd. */
  bottom: 8px;
  right: 2px;
  z-index: 20;
  width: 112px;
  height: 112px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Labels row */
.knob-labels {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 1px;
}

.knob-label {
  font-family: var(--font-mono);
  font-size: clamp(10px, 2.4vw, 11px); /* readable-minimum; was 6.5px */
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-deck-panel-text);
  cursor: pointer;
  background: none;
  border: none;
  padding: 1px 2px;
  transition: color 0.15s, text-shadow 0.15s;
  border-radius: 1px;
}

.knob-label[data-active='true'] {
  color: var(--color-accent-start);
  text-shadow:
    0 0 4px color-mix(in oklch, var(--color-accent-start) 70%, transparent),
    0 0 10px color-mix(in oklch, var(--color-accent-start) 45%, transparent);
}

.knob-label:focus-visible {
  outline: 2px solid var(--color-accent-start);
  outline-offset: 2px;
}

/* Dots row */
.knob-dots {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 3px;
}

.knob-dot {
  display: block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
}

.knob-dot[data-active='true'] {
  background: var(--color-accent-start);
  box-shadow: 0 0 5px var(--color-accent-start);
}

/* Knob face — the physical rotary knob */
.knob-face {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: ns-resize;
  user-select: none;
  touch-action: none;
}

/* Brushed metal disc (dark — fixed across themes) */
.knob-metal {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at 38% 35%,
    #4a4d55 0%,
    #2e3038 35%,
    #1e2025 70%,
    #18191d 100%
  );
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.5),
    0 2px 4px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3);
}

/* Grip ring — conic ridges every 12 degrees */
.knob-ridges {
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.15);
}

.knob-ridges::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background:
    repeating-conic-gradient(
      from 6deg at 50% 50%,
      rgba(255, 255, 255, 0.03) 0deg,
      transparent 1deg,
      transparent 11deg,
      rgba(255, 255, 255, 0.03) 12deg
    );
  mask: radial-gradient(circle, transparent 44%, black 44.5%, black 49%, transparent 49.5%);
  -webkit-mask: radial-gradient(circle, transparent 44%, black 44.5%, black 49%, transparent 49.5%);
}

/* Indicator line — points at the active dot */
.knob-indicator {
  position: absolute;
  bottom: 50%;
  left: 50%;
  width: 2px;
  height: 14px;
  margin-left: -1px;
  border-radius: 1px;
  background: var(--color-accent-start);
  box-shadow: 0 0 4px var(--color-accent-start);
  transform-origin: bottom center;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .knob-indicator {
    transition: none;
  }
}

/* Center cap */
.knob-cap {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #3a3c44, #22242a);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}
```

---

## 8. Cleanup

The old switcher used `.deck-mini-screen` previews; `VisualizerIcon` and
`.viz-icon*` were already orphaned before this change (defined/exported but
not referenced by `NowPlaying.tsx`). All four become dead once the knob
lands — verified by grep on 2026-07-20:

- `knob-mockup.html` — delete (mockup, no longer needed)
- `.deck-mini-screen` block in `index.css` — remove (only the old switcher
  used it)
- `VisualizerIcon` in `visualizers.tsx` — remove the exported function, and
  drop its mention in the `visualizers-meta.ts` comment
- `.viz-icon*` CSS in `index.css` (~lines 444–531 incl. the reduced-motion
  block) — remove

Do this in the **same PR** as the knob so no dead code lands on `main`.
Run `npm run build` after — `tsc` will catch any lingering imports of the
removed `VisualizerIcon` export.

---

## 9. Accessibility

- `role="radiogroup"` with `aria-label="Visualizer style"` on the container
- Each label is a `role="radio"` button with `aria-checked`
- Roving tabindex: active radio has `tabIndex={0}`, others `tabIndex={-1}`
- Arrow keys navigate between modes (wrap around)
- Knob face and dots are `aria-hidden="true"` — decorative only
- Dots use `onClick` for mouse users who want to click a dot directly
