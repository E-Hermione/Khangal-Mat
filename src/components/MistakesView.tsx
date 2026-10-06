import React, { useState } from 'react';
import { Award, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { learningPlan, Mistake, topicMeta, useLearningPlanVersion } from '../services/learningPlan';
import { correctOption, getQuestionOptions, isOpenQuestion, isOptionCorrect, questionStem } from '../utils/examGrading';

/** One wrong question to try again: the student answers and sees right away whether it is right now. */
const MistakeCard: React.FC<{ m: Mistake; index: number }> = ({ m, index }) => {
  const q = m.question;
  const options = getQuestionOptions(q);
  const open = isOpenQuestion(q);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState<boolean | null>(null);

  const check = (value: string) => {
    if (!value.trim()) return;
    setChecked(isOptionCorrect(value, q, options));
  };
  const right = correctOption(q, options);

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3" data-testid="mistake">
      <div className="flex gap-2 text-sm text-stone-900">
        <span className="font-black shrink-0">{index}.</span>
        <MathRenderer content={questionStem(q)} />
      </div>

      {open ? (
        <div className="flex gap-2">
          <input
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              setChecked(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && check(answer)}
            placeholder="Хариугаа бичнэ үү"
            className="flex-1 px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={() => check(answer)}
            className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-black text-white text-sm font-bold cursor-pointer"
          >
            Шалгах
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {options.map(({ letter, text }) => {
            const chosen = answer === letter;
            const state = chosen && checked !== null ? (checked ? 'ok' : 'bad') : null;
            return (
              <button
                key={letter}
                type="button"
                onClick={() => {
                  setAnswer(letter);
                  check(letter);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm cursor-pointer transition-colors ${
                  state === 'ok'
                    ? 'border-emerald-500 bg-emerald-50'
                    : state === 'bad'
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    state === 'ok' ? 'bg-emerald-500 text-white' : state === 'bad' ? 'bg-rose-500 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {letter}
                </span>
                <MathRenderer content={text} />
              </button>
            );
          })}
        </div>
      )}

      {checked === true && (
        <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
          <CheckCircle2 className="w-4 h-4" /> Зөв! Сорилоо дахин өгөхөд энэ бодлого жагсаалтаас гарна.
        </div>
      )}
      {checked === false && (
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-1.5 font-bold text-rose-700">
            <XCircle className="w-4 h-4" /> Буруу байна. Дахин оролдоорой.
          </div>
          <details className="text-stone-700">
            <summary className="cursor-pointer text-xs font-bold text-stone-500">Зөв хариу, бодолтыг харах</summary>
            <div className="mt-1.5 p-2.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
              <div>
                Зөв хариу: <MathRenderer content={right ? `${right.letter}) ${right.text}` : q.answer || '—'} className="inline" />
              </div>
              {q.solution && <MathRenderer content={q.solution} />}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

/** The student's wrong answers on topic tests, grouped by topic and test, to solve again. */
export const MistakesView: React.FC<{ onOpenExam: (topicId: string) => void }> = ({ onOpenExam }) => {
  useLearningPlanVersion();
  const list = learningPlan.mistakes();
  const groups = new Map<string, Mistake[]>();
  for (const m of list) {
    const key = `${m.topicId}-${m.tier}`;
    groups.set(key, [...(groups.get(key) || []), m]);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5" data-testid="mistakes-view">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <RotateCcw className="w-6 h-6 text-rose-600" />
          Алдсан бодлогууд
        </h1>
        <p className="text-sm text-stone-400 mt-1">
          Сэдэвчилсэн сорилд алдсан бодлогуудаа дахин бодоорой. Сорилоо дахин өгч зөв бодвол жагсаалтаас гарна.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="py-14 text-center bg-white rounded-2xl border border-stone-200 text-sm text-stone-500">
          Алдсан бодлого алга. Сэдэвчилсэн сорил өгөхөд алдсан бодлогууд энд цугларна.
        </div>
      ) : (
        [...groups.entries()].map(([key, items]) => (
          <section key={key} className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-black text-white">
                {topicMeta(items[0].topicId).title}
                <span className="ml-2 text-xs font-bold text-stone-400">{items[0].tierName} сорил</span>
              </h2>
              <button
                type="button"
                onClick={() => onOpenExam(items[0].topicId)}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Award className="w-3.5 h-3.5" /> Сорил дахин өгөх
              </button>
            </div>
            {items.map((m, i) => (
              <MistakeCard key={m.question.id} m={m} index={i + 1} />
            ))}
          </section>
        ))
      )}
    </div>
  );
};
