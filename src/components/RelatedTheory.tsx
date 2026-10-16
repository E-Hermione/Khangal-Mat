import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { TheoryRule } from '../types';
import { MathRenderer } from './MathRenderer';

/** Words that say what a text is about: Mongolian words of four letters or more, formulas and numbers left out */
const words = (t: string) =>
  new Set(
    (t.replace(/\$[^$]*\$/g, ' ').toLowerCase().match(/[а-яөүё]{4,}/g) || []).map((w) => w.slice(0, 6)) // the stem: endings differ
  );
const ruleText = (r: TheoryRule) => (r.blocks?.length ? r.blocks.map((b) => b.value).join('\n') : [r.ruleText, r.formula, r.note].filter(Boolean).join('\n'));

/** The theory cards of the topic that best match a problem and its solution (the rules it quotes) */
function relatedRules(theory: TheoryRule[], text: string): TheoryRule[] {
  if (theory.length <= 1) return theory;
  const w = words(text);
  const scored = theory.map((r) => {
    const rw = words(`${r.title} ${ruleText(r)}`);
    let common = 0;
    rw.forEach((x) => w.has(x) && common++);
    return { r, score: common / Math.sqrt(rw.size || 1) };
  });
  const best = Math.max(...scored.map((s) => s.score));
  if (best === 0) return theory;
  return scored.filter((s) => s.score >= best * 0.7).map((s) => s.r).slice(0, 2);
}

/**
 * «Холбогдох онол»: a small button on a problem card; it opens the theory the problem uses.
 * It folds away by itself on scrolling, typing or a tap elsewhere.
 */
export const RelatedTheory: React.FC<{ theory: TheoryRule[]; text: string }> = ({ theory, text }) => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const rules = useMemo(() => (open ? relatedRules(theory, text) : []), [open, theory, text]);
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
  if (theory.length === 0) return null;

  return (
    <div ref={box} className="no-print mt-2" data-no-zoom>
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
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2.5 text-[14px] text-stone-800 leading-relaxed animate-in fade-in duration-150">
          {rules.map((r) => (
            <div key={r.id}>
              <div className="font-black text-stone-900 mb-1">{r.title}</div>
              {ruleText(r)
                .split('\n')
                .filter((l) => l.trim())
                .map((l, i) => (
                  <MathRenderer key={i} content={l} />
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
