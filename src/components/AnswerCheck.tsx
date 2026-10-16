import React, { useState } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
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

  return (
    <div className="no-print mb-4 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 space-y-2" data-no-zoom data-testid="answer-check">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="flex items-stretch gap-1.5">
        <div className="flex items-center rounded-lg border border-stone-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-amber-300">
          <input
            value={num}
            onChange={(e) => {
              setNum(e.target.value.replace(/\D/g, ''));
              reset();
            }}
            inputMode="numeric"
            placeholder="№"
            aria-label="Бодлогын дугаар"
            className="w-11 px-2 py-1 text-center border-r border-stone-200 focus:outline-none"
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
            className="w-44 px-2 py-1 focus:outline-none"
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
        <button
          type="button"
          onClick={() => setHelp((h) => !h)}
          className="flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-700 cursor-pointer"
        >
          <Info className="w-3.5 h-3.5" /> Хэрхэн бичих вэ?
        </button>
        {result === 'nonum' && <span className="text-xs font-bold text-rose-700">Ийм дугаартай бодлого алга.</span>}
      </div>
      {help && (
        <ul className="text-xs text-stone-600 leading-relaxed list-none space-y-0.5">
          <li>Энгийн бутархай: <b>3/4</b></li>
          <li>Холимог бутархай: бүхэл хэсэг, зай, дараа нь бутархай хэсэг. Жишээ нь <b>2 1/3</b></li>
          <li>Аравтын бутархай: цэгээр. Жишээ нь <b>0.5</b></li>
          <li>Сөрөг тоо: <b>-4</b></li>
          <li>Хэд хэдэн хариутай бол таслалаар зааглана. Жишээ нь <b>3, -3</b></li>
          <li>Нэгж (см, кг, төгрөг) бичихгүй байж болно. Ижил утгатай бол <b>1/2</b> ба <b>0.5</b> аль аль нь зөв.</li>
        </ul>
      )}
    </div>
  );
};
