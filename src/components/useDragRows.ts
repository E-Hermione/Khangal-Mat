import React, { useEffect, useRef, useState } from 'react';

/**
 * Reorder rows of a list with the mouse: press a row, drag it onto another row and let go.
 * A green line shows where it lands. Pointer events, as in the sidebar's topic list.
 */
export function useDragRows() {
  const start = useRef<{ list: string; from: number; y: number; onMove: (from: number, to: number) => void } | null>(null);
  const [drag, setDrag] = useState<{ list: string; from: number } | null>(null);
  const [over, setOver] = useState<number | null>(null);

  useEffect(() => {
    const rowAt = (x: number, y: number, list: string) => {
      const el = document.elementFromPoint(x, y)?.closest('[data-drag-row]') as HTMLElement | null;
      const [l, i] = (el?.dataset.dragRow || '').split(':');
      return l === list ? Number(i) : null;
    };
    const onMove = (e: PointerEvent) => {
      const st = start.current;
      if (!st) return;
      if (!drag && Math.abs(e.clientY - st.y) < 6) return;
      if (!drag) setDrag({ list: st.list, from: st.from });
      setOver(rowAt(e.clientX, e.clientY, st.list));
      e.preventDefault();
    };
    const onUp = (e: PointerEvent) => {
      const st = start.current;
      start.current = null;
      if (st && drag) {
        const to = rowAt(e.clientX, e.clientY, st.list);
        if (to !== null && to !== st.from) st.onMove(st.from, to);
        // the release must not also select the row it was dropped on
        const stop = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        window.addEventListener('click', stop, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 50);
      }
      setDrag(null);
      setOver(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  });

  const rowProps = (list: string, idx: number, onMove: (from: number, to: number) => void) => ({
    'data-drag-row': `${list}:${idx}`,
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      start.current = { list, from: idx, y: e.clientY, onMove };
    },
    dragClass: `${drag?.list === list && drag.from === idx ? 'opacity-40' : ''} ${
      drag?.list === list && over === idx && drag.from !== idx
        ? idx < drag.from
          ? 'shadow-[0_-3px_0_0_#10b981]'
          : 'shadow-[0_3px_0_0_#10b981]'
        : ''
    } ${drag ? 'select-none cursor-grabbing' : ''}`,
  });
  return rowProps;
}

/** The list with the item at `from` moved to `to`. */
export const moveItem = <T,>(list: T[], from: number, to: number) => {
  const next = list.filter((_, i) => i !== from);
  next.splice(to, 0, list[from]);
  return next;
};
