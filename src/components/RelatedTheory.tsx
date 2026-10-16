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
 * Returns the button (for the card's top right corner) and the panel (under the problem).
 * The panel folds away by itself on scrolling, typing or a tap elsewhere.
 */
export function useRelatedTheory(rules: string[]): [React.ReactNode, React.ReactNode] {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const inside = (n: Node) => btn.current?.contains(n) || panel.current?.contains(n);
    const onDown = (e: PointerEvent) => !inside(e.target as Node) && close();
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
  if (rules.length === 0) return [null, null];
  const button = (
    <button
      ref={btn}
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      title="Холбогдох онол үзэх"
      data-no-zoom
      className={`no-print absolute top-4 right-4 md:top-5 md:right-5 inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
        open ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-stone-200 text-stone-500 hover:text-stone-700 hover:border-stone-300'
      }`}
    >
      <BookOpen className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Холбогдох онол үзэх</span>
      <span className="sm:hidden">Онол</span>
    </button>
  );
  const box = open ? (
    <div
      ref={panel}
      data-no-zoom
      className="no-print mb-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-1.5 text-[14px] text-stone-800 leading-relaxed animate-in fade-in duration-150"
    >
      {rules.map((r, i) => (
        <MathRenderer key={i} content={`__${r}__`} />
      ))}
    </div>
  ) : null;
  return [button, box];
}

/** The button in the card's top right corner (the card is `relative`), the rules under the problem */
export const RelatedTheory: React.FC<{ rules: string[] }> = ({ rules }) => {
  const [button, panel] = useRelatedTheory(rules);
  return (
    <>
      {button}
      {panel}
    </>
  );
};
