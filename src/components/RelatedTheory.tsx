import React, { useEffect, useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { MathRenderer } from './MathRenderer';

const RULE = /__([^_\n]+?)__/g;

/** The rules a solution quotes from the theory (written __…__) */
export const quotedRules = (solution: string) => [...(solution || '').matchAll(RULE)].map((m) => m[1].trim());

/** The solution without its quoted rules; lines left empty go too */
export const withoutRules = (solution: string) =>
  (solution || '')
    .split('\n')
    .map((l) => l.replace(RULE, '').replace(/^\s+/, '').replace(/\s{2,}/g, ' '))
    .filter((l) => l.trim())
    .join('\n');

/**
 * «Холбогдох онол үзэх»: the rules the example's solution uses, hidden behind a small button.
 * It folds away by itself on scrolling, typing or a tap elsewhere.
 */
export const RelatedTheory: React.FC<{ rules: string[] }> = ({ rules }) => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && close();
    // a moment's delay: the tap that opened it must not count as scrolling
    const t = window.setTimeout(() => window.addEventListener('scroll', close, { passive: true, once: true }), 300);
    window.addEventListener('keydown', close, { once: true });
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('scroll', close);
      window.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);
  if (rules.length === 0) return null;

  return (
    <div ref={box} className="no-print mb-2" data-no-zoom>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
          open ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-stone-200 text-stone-500 hover:text-stone-700 hover:border-stone-300'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        Холбогдох онол үзэх
      </button>
      {open && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-1.5 text-[14px] text-stone-800 leading-relaxed animate-in fade-in duration-150">
          {rules.map((r, i) => (
            <MathRenderer key={i} content={`__${r}__`} />
          ))}
        </div>
      )}
    </div>
  );
};
