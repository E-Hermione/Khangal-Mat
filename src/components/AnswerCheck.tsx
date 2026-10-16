import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronDown, Info, XCircle } from 'lucide-react';
import { checkAnswer } from '../utils/answerCheck';

/** One small checker for a whole list of problems: the student types the problem number and the answer */
export const AnswerCheck: React.FC<{ items: { number: number; answer: string }[] }> = ({ items }) => {
  const [num, setNum] = useState('');
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<{ n: number; ok: boolean } | 'nonum' | null>(null);
  const [help, setHelp] = useState(false);
  const check = () => {
    const n = parseInt(num, 10);
    const item = items.find((x) => x.number === n);
    if (!item) return setResult('nonum');
    const r = checkAnswer(typed, item.answer);
    if (r !== null) setResult({ n, ok: r });
  };
  const reset = () => setResult(null);
  const ok = result && result !== 'nonum' ? result.ok : null;
  // The writing guide folds away by itself on anything else: scrolling, typing, a tap elsewhere
  const helpRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!help) return;
    const close = () => setHelp(false);
    const onDown = (e: PointerEvent) => !helpRef.current?.contains(e.target as Node) && close();
    window.addEventListener('scroll', close, { passive: true, once: true });
    window.addEventListener('keydown', close, { once: true });
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('scroll', close);
      window.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [help]);

  return (
    <div className="no-print mb-4 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 space-y-2" data-no-zoom data-testid="answer-check">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setHelp((h) => !h)}
          className="flex items-center gap-1 mr-3 text-xs font-semibold text-stone-500 hover:text-stone-700 cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" /> Хэрхэн бичих вэ?
        </button>
        <div className="flex items-stretch gap-1.5">
        <div className="flex items-center rounded-lg border border-stone-300 bg-white focus-within:ring-2 focus-within:ring-amber-300">
          {/* The number is picked from a short scrolling list, so it is always one of the problems */}
          <NumberPicker
            value={num}
            numbers={items.map((x) => x.number)}
            onPick={(v) => {
              setNum(v);
              reset();
              setHelp(false);
            }}
          />
          <input
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              reset();
            }}
            onKeyDown={(e) => e.key === 'Enter' && check()}
            placeholder="Хариугаа энд бичнэ үү"
            aria-label="Хариу"
            className="w-44 px-2 py-1 rounded-r-lg focus:outline-none"
          />
        </div>
          <button
            type="button"
            onClick={check}
            disabled={!num || !typed.trim()}
            className={`px-3 py-1 min-w-[4.5rem] flex items-center justify-center gap-1 rounded-lg border text-xs font-bold cursor-pointer transition-colors disabled:cursor-default ${
              ok === true
                ? 'bg-emerald-600 border-emerald-700 text-white'
                : ok === false
                ? 'bg-rose-600 border-rose-700 text-white'
                : 'bg-white border-stone-400 text-stone-800 hover:bg-stone-100 disabled:text-stone-400 disabled:border-stone-300'
            }`}
          >
            {/* The button itself shows the result: green «Зөв» or red «Буруу» */}
            {ok === true ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Зөв
              </>
            ) : ok === false ? (
              <>
                <XCircle className="w-3.5 h-3.5" /> Буруу
              </>
            ) : (
              'Шалгах'
            )}
          </button>
        </div>
      </div>
      {help && (
        <div ref={helpRef}>
        <ul className="text-xs text-stone-600 leading-relaxed list-none space-y-0.5">
          <li>Энгийн бутархай: <b>3/4</b></li>
          <li>Холимог бутархай: бүхэл хэсэг, зай, дараа нь бутархай хэсэг. Жишээ нь <b>2 1/3</b></li>
          <li>Аравтын бутархай: цэгээр. Жишээ нь <b>0.5</b></li>
          <li>Сөрөг тоо: <b>-4</b></li>
          <li>Хэд хэдэн хариутай бол таслалаар зааглана. Жишээ нь <b>3, -3</b></li>
          <li>Нэгж (см, кг, төгрөг) бичихгүй байж болно. Ижил утгатай бол <b>1/2</b> ба <b>0.5</b> аль аль нь зөв.</li>
        </ul>
        </div>
      )}
    </div>
  );
};

/** A small number button; its list opens below, a few rows high, and scrolls inside itself */
const NumberPicker: React.FC<{ value: string; numbers: number[]; onPick: (v: string) => void }> = ({ value, numbers, onPick }) => {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    // The chosen number in view
    list.current?.querySelector('[data-on="1"]')?.scrollIntoView({ block: 'nearest' });
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);
  return (
    <div ref={box} className="relative border-r border-stone-200 self-stretch flex">
      <button
        type="button"
        aria-label="Бодлогын дугаар"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-0.5 pl-2 pr-1 cursor-pointer ${value ? 'text-stone-900 font-bold' : 'text-stone-400'}`}
      >
        {value || '№'}
        <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          ref={list}
          role="listbox"
          className="absolute left-0 top-full mt-1 z-30 w-16 max-h-40 overflow-y-auto overscroll-contain thin-scroll rounded-lg border border-stone-200 bg-white shadow-lg py-1"
        >
          {numbers.map((n) => {
            const on = String(n) === value;
            return (
              <button
                key={n}
                type="button"
                role="option"
                aria-selected={on}
                data-on={on ? '1' : undefined}
                onClick={() => {
                  onPick(String(n));
                  setOpen(false);
                }}
                className={`block w-full px-2 py-1 text-center text-sm cursor-pointer ${on ? 'bg-amber-100 text-amber-900 font-bold' : 'text-stone-700 hover:bg-stone-100'}`}
              >
                {n}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
