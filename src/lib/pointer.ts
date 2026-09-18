import { useEffect, type RefObject } from 'react';

/**
 * One pointer listener for the whole page, shared by everything that follows the
 * cursor.
 *
 * The portrait and the hero copy both drift with the pointer, and in the real
 * layout they live in different columns — so an effect owned by either one can't
 * reach the other. A shared module-level listener solves that, keeps the work to
 * a single `pointermove` subscription with one rAF throttle however many
 * elements are following, and means a component can't silently lose its
 * interactivity when it moves, which has already happened once on this site.
 *
 * Normalised to -1..1 against the viewport, so the drift reads as following the
 * cursor across the page rather than jittering inside a small box.
 */

type Listener = (x: number, y: number) => void;

const listeners = new Set<Listener>();
let attached = false;
let frame = 0;
let pending: { x: number; y: number } | null = null;

/**
 * Pointer-following only makes sense with a real cursor, and nobody should get
 * motion they didn't ask for — so a coarse pointer or a reduced-motion
 * preference means no listener is attached at all.
 */
function canTrack(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches !== true) return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true) return false;
  return true;
}

function flush() {
  frame = 0;
  if (!pending) return;
  const { x, y } = pending;
  pending = null;
  for (const listener of listeners) listener(x, y);
}

function onMove(event: PointerEvent) {
  pending = {
    x: (event.clientX / window.innerWidth - 0.5) * 2,
    y: (event.clientY / window.innerHeight - 0.5) * 2,
  };
  if (!frame) frame = requestAnimationFrame(flush);
}

function reset() {
  pending = null;
  for (const listener of listeners) listener(0, 0);
}

function attach() {
  if (attached) return;
  attached = true;
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerleave', reset);
  document.documentElement.addEventListener('mouseleave', reset);
}

function detach() {
  if (!attached) return;
  attached = false;
  cancelAnimationFrame(frame);
  frame = 0;
  pending = null;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerleave', reset);
  document.documentElement.removeEventListener('mouseleave', reset);
}

/** Subscribe to normalised pointer position. No-op on touch / reduced motion. */
export function subscribePointer(listener: Listener): () => void {
  if (!canTrack()) return () => {};
  listeners.add(listener);
  if (listeners.size === 1) attach();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) detach();
  };
}

/**
 * Drift `ref`'s element with the pointer by writing two custom properties.
 *
 * The movement itself is pure CSS reading those properties, so the element's
 * resting position is defined in the stylesheet next to its transition rather
 * than here, and a device that never subscribes still gets the base offset.
 */
export function usePointerParallax(
  ref: RefObject<HTMLElement | null>,
  {
    x = 12,
    y = 9,
    varX = '--parallax-x',
    varY = '--parallax-y',
  }: { x?: number; y?: number; varX?: string; varY?: string } = {},
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return subscribePointer((px, py) => {
      element.style.setProperty(varX, `${px * x}px`);
      element.style.setProperty(varY, `${py * y}px`);
    });
  }, [ref, x, y, varX, varY]);
}
