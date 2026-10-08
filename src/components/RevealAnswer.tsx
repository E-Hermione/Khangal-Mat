import React, { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { MathRenderer } from './MathRenderer';

/**
 * The answer hidden behind a faint «Зөв хариу» button. The button floats to the end of the line it
 * follows (or the right end of a new line when there is no room). Once opened, the answer shows on
 * its own line and closes again by itself when it scrolls out of view or the reader clicks elsewhere.
 */
export const RevealAnswer: React.FC<{ answer: string; className?: string }> = ({ answer, className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open || !ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setOpen(false);
    });
    observer.observe(el);
    const onPointer = (e: PointerEvent) => {
      if (!el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return open ? (
    <span ref={ref} className={`no-print block clear-both mt-1.5 text-[15px] text-stone-800 leading-relaxed animate-in fade-in duration-150 ${className}`}>
      <span className="font-bold text-emerald-700">Зөв хариу:</span> <MathRenderer content={answer} className="inline" />
    </span>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`no-print float-right ml-3 mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed border-stone-300 text-xs font-semibold text-stone-400 hover:text-stone-600 hover:border-stone-400 cursor-pointer transition-colors ${className}`}
      data-testid="reveal-answer"
    >
      <Eye className="w-3.5 h-3.5" />
      Зөв хариу
    </button>
  );
};
