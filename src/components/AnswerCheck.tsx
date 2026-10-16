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
    <div className="no-print mt-3 space-y-1.5" data-no-zoom>
      <div className="flex gap-2">
        <input
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setResult(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          inputMode="text"
          placeholder="Хариугаа бичээд шалга (жишээ нь 2 1/3, 0.5, -4)"
          className={`flex-1 min-w-0 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${
            result === true ? 'border-emerald-500 bg-emerald-50' : result === false ? 'border-rose-400 bg-rose-50' : 'border-stone-300'
          }`}
        />
        <button
          type="button"
          onClick={check}
          disabled={!typed.trim()}
          className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-black disabled:opacity-40 text-white text-sm font-bold cursor-pointer shrink-0"
        >
          Шалгах
        </button>
      </div>
      {result === true && (
        <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="w-4 h-4" /> Зөв! Сайн байна.
        </div>
      )}
      {result === false && (
        <div className="flex items-center gap-1.5 text-sm font-bold text-rose-700">
          <XCircle className="w-4 h-4" /> Буруу байна. Дахин бодоод үзээрэй.
        </div>
      )}
    </div>
  );
};
