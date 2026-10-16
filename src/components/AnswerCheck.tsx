import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { checkAnswer } from '../utils/answerCheck';

/** The student types an answer and sees at once whether it is right */
export const AnswerCheck: React.FC<{ answer: string; onResult?: (right: boolean) => void }> = ({ answer, onResult }) => {
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const check = () => {
    const r = checkAnswer(typed, answer);
    if (r === null) return;
    setResult(r);
    onResult?.(r);
  };
  return (
    <div className="no-print mt-2 flex flex-wrap items-center justify-end gap-x-2 gap-y-1" data-no-zoom>
      {result === true && (
        <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" /> Зөв
        </span>
      )}
      {result === false && (
        <span className="flex items-center gap-1 text-xs font-bold text-rose-700">
          <XCircle className="w-3.5 h-3.5" /> Буруу, дахин бодоорой
        </span>
      )}
      <div className="flex items-center rounded-lg border border-stone-300 overflow-hidden focus-within:ring-2 focus-within:ring-amber-300">
        <input
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setResult(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          inputMode="text"
          placeholder="Хариу"
          title="Жишээ нь 2 1/3, 0.5, -4"
          className={`w-28 px-2.5 py-1 text-sm focus:outline-none ${result === true ? 'bg-emerald-50' : result === false ? 'bg-rose-50' : 'bg-white'}`}
        />
        <button
          type="button"
          onClick={check}
          disabled={!typed.trim()}
          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 border-l border-stone-300 text-stone-700 text-xs font-bold cursor-pointer"
        >
          Шалгах
        </button>
      </div>
    </div>
  );
};
