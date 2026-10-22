import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';

export type DragPos = { x: number; y: number; s: number; r: number };

const ZERO: DragPos = { x: 0, y: 0, s: 1, r: 0 };

/** Every draggable thing on the desk, so stacking and jitter stay in one place. */
const IDS = [
  'work',
  'deck',
  'career',
  'games',
  'books',
  'watch',
  'me',
  'email',
  'cv',
  'linkedin',
  'github',
] as const;

type DragMode = 'move' | 'scale' | 'rotate';

type DragState = {
  id: string;
  mode: DragMode;
  sx: number;
  sy: number;
  start: DragPos;
  el: HTMLElement;
  pid: number;
  moved: boolean;
  cx: number;
  cy: number;
  a0: number;
};

const jitterAxis = () => Math.round(Math.random() * 100 - 50);

/**
 * Direct manipulation for the desk: drag to move, the corner handle to scale and
 * the stalk handle to rotate. A press only becomes a drag after 6px, and an
 * object's action is suppressed for 400ms after a drag or after a long press —
 * so "one click opens, a drag never opens" holds for every pointer type.
 */
export type DeskDrag = ReturnType<typeof useDeskDrag>;

export function useDeskDrag(onInteract: () => void) {
  const [pos, setPos] = useState<Record<string, DragPos>>({});
  const [stack, setStack] = useState<{ top: number; map: Record<string, number> }>(
    () => ({ top: 1000, map: { word: 1000 } }),
  );
  const [grabbing, setGrabbing] = useState<string | null>(null);

  const posRef = useRef(pos);
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const drag = useRef<DragState | null>(null);
  const pressAt = useRef(0);
  const pressLen = useRef(0);
  const justDragged = useRef(0);

  // A slightly different desk every visit: each thing lands within 50px of
  // its spot. The name itself is the one fixed thing.
  const jitter = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {};
    for (const id of IDS) out[id] = { x: jitterAxis(), y: jitterAxis() };
    return out;
  }, []);

  const bump = useCallback((id: string) => {
    setStack((prev) => {
      const top = prev.top + 1;
      return { top, map: { ...prev.map, [id]: top } };
    });
  }, []);

  const start = useCallback(
    (id: string, mode: DragMode) => (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      if (mode !== 'move') e.stopPropagation();
      if (e.pointerType === 'touch' && id !== 'word' && window.innerWidth <= 620) {
        return;
      }

      onInteract();
      pressAt.current = Date.now();
      bump(id);

      let cx = 0;
      let cy = 0;
      let a0 = 0;
      if (mode === 'rotate') {
        const host = (e.currentTarget as HTMLElement).parentElement;
        if (!host) return;
        const rect = host.getBoundingClientRect();
        cx = rect.left + rect.width / 2;
        cy = rect.top + rect.height / 2;
        a0 = Math.atan2(e.clientY - cy, e.clientX - cx);
      }

      drag.current = {
        id,
        mode,
        sx: e.clientX,
        sy: e.clientY,
        start: posRef.current[id] ?? ZERO,
        el: e.currentTarget as HTMLElement,
        pid: e.pointerId,
        moved: false,
        cx,
        cy,
        a0,
      };
    },
    [bump, onInteract],
  );

  const move = useCallback((e: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;

    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;

    if (!d.moved) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      d.moved = true;
      try {
        d.el.setPointerCapture(d.pid);
      } catch {
        // Capture is a nicety; pointermove still reports while inside the stage.
      }
      setGrabbing(d.id);
    }

    const st = d.start;
    let next: DragPos;

    if (d.mode === 'scale') {
      next = { ...st, s: Math.min(2.4, Math.max(0.5, st.s + (dx + dy) / 320)) };
    } else if (d.mode === 'rotate') {
      let r = st.r + ((Math.atan2(e.clientY - d.cy, e.clientX - d.cx) - d.a0) * 180) / Math.PI;
      if (e.shiftKey) r = Math.round(r / 15) * 15;
      else if (Math.abs(r) < 3) r = 0;
      next = { ...st, r };
    } else {
      next = { ...st, x: st.x + dx, y: st.y + dy };
    }

    setPos((prev) => ({ ...prev, [d.id]: next }));
  }, []);

  const end = useCallback(() => {
    pressLen.current = pressAt.current ? Date.now() - pressAt.current : 0;
    pressAt.current = 0;
    if (drag.current?.moved) justDragged.current = Date.now();
    drag.current = null;
    setGrabbing(null);
  }, []);

  /**
   * Wraps an object action so a drag or a long press never counts as a click.
   * Keyboard activation (`detail === 0`) always fires.
   */
  const guarded = useCallback(
    (fn: () => void) => (e?: { detail?: number }) => {
      if (e && e.detail === 0) {
        fn();
        return;
      }
      if (Date.now() - justDragged.current < 400) return;
      if (pressLen.current > 450) return;
      fn();
    },
    [],
  );

  const key = useCallback(
    (id: string) => (e: KeyboardEvent<HTMLElement>) => {
      const p = posRef.current[id] ?? ZERO;
      let next: DragPos | null = null;

      onInteract();

      if (e.key === 'ArrowLeft') next = { ...p, x: p.x - 20 };
      else if (e.key === 'ArrowRight') next = { ...p, x: p.x + 20 };
      else if (e.key === 'ArrowUp') next = { ...p, y: p.y - 20 };
      else if (e.key === 'ArrowDown') next = { ...p, y: p.y + 20 };
      else if (e.key === '+' || e.key === '=') next = { ...p, s: Math.min(2.4, p.s + 0.1) };
      else if (e.key === '-' || e.key === '_') next = { ...p, s: Math.max(0.5, p.s - 0.1) };
      else if (e.key === '[') next = { ...p, r: p.r - 5 };
      else if (e.key === ']') next = { ...p, r: p.r + 5 };

      if (!next) return;
      e.preventDefault();
      bump(id);
      setPos((prev) => ({ ...prev, [id]: next }));
    },
    [bump, onInteract],
  );

  /** Tidy up: every position, size and rotation back to rest. Jitter is kept. */
  const reset = useCallback(() => {
    drag.current = null;
    justDragged.current = 0;
    pressLen.current = 0;
    setPos({});
    setStack({ top: 1000, map: { word: 1000 } });
    setGrabbing(null);
  }, []);

  const styleFor = useCallback(
    (id: string, withJitter = true): CSSProperties => {
      const p = pos[id] ?? ZERO;
      const j = withJitter ? (jitter[id] ?? { x: 0, y: 0 }) : { x: 0, y: 0 };
      return {
        '--x': `${p.x + j.x}px`,
        '--y': `${p.y + j.y}px`,
        '--r': `${p.r}deg`,
        '--s': String(p.s),
        zIndex: 2 + (stack.map[id] ?? 0),
      } as CSSProperties;
    },
    [jitter, pos, stack],
  );

  return {
    pos,
    grabbing,
    moved: Object.keys(pos).length > 0,
    startMove: (id: string) => start(id, 'move'),
    startScale: (id: string) => start(id, 'scale'),
    startRotate: (id: string) => start(id, 'rotate'),
    move,
    end,
    key,
    guarded,
    reset,
    styleFor,
  };
}
