import React from 'react';
import { TopicPackage, PrintSectionsSelection, TestQuestion } from '../types';
import { MathRenderer } from './MathRenderer';
import { SolutionSteps, solutionLines } from './SolutionSteps';
import { getQuestionOptions } from '../utils/examGrading';

/**
 * The topic's tests on paper (print only, admin): each test on a new page, every question with its
 * options A–D. With «Бодолттой» chosen in the print menu the right option and the solution follow
 * each question.
 */
const strip = (s: string) => s.replace(/\$/g, '').replace(/\s+/g, '');

export const TestsPrint: React.FC<{ topic: TopicPackage; selection: PrintSectionsSelection; viewerGrade: number }> = ({
  topic,
  selection,
  viewerGrade,
}) => {
  const tests = ([1, 2, 3] as const)
    .filter((n) => selection[`test${n}`])
    .map((n) => topic[`test${n}`])
    .filter((t) => t && t.questions?.length);
  if (!tests.length) return null;
  const shown = (q: TestQuestion) => (q.prerequisiteGrade ?? topic.grade) <= viewerGrade;

  return (
    <div className="hidden print:block" data-testid="tests-print">
      {tests.map((t) => {
        const questions = t.questions.filter(shown);
        const points = questions.reduce((s, q) => s + (q.points || 0), 0);
        return (
          <section key={t.id} className="break-before-page">
            <div className="mb-3 pb-1 border-b border-black flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-black">
                  {topic.title} — {t.title} сорил
                </h2>
              </div>
              <p className="text-xs text-black shrink-0">
                {questions.length} асуулт · {points} оноо
              </p>
            </div>
            {!selection.answers && (
              <p className="text-xs text-black mb-3">Нэр: ............................................ Анги: .......... Огноо: ..........</p>
            )}
            <ol className="space-y-3">
              {questions.map((q, i) => {
                const options = getQuestionOptions(q);
                const right = options.find((o) => strip(o.text) === strip(q.answer || ''));
                return (
                  <li key={q.id} className="avoid-break text-black">
                    <div className="flex gap-2 text-[14px] leading-relaxed">
                      <span className="font-bold shrink-0">{i + 1}.</span>
                      <MathRenderer content={q.question} className="flex-1 min-w-0" />
                      <span className="text-[11px] shrink-0">({q.points} оноо)</span>
                    </div>
                    <div className={`grid ${options.some((o) => o.text.length > 28) ? 'grid-cols-2' : 'grid-cols-4'} gap-x-4 gap-y-1 pl-6 mt-1 text-[14px]`}>
                      {options.map((o) => (
                        <div key={o.letter} className={`flex gap-1.5 items-baseline ${selection.answers && right?.letter === o.letter ? 'font-bold underline' : ''}`}>
                          <span className="font-semibold">{o.letter})</span>
                          <MathRenderer content={o.text} />
                        </div>
                      ))}
                    </div>
                    {selection.answers && (
                      <div className="pl-6 mt-1.5 text-[13px]">
                        <p>
                          <span className="font-bold">Зөв хариу: </span>
                          {right ? `${right.letter}) ` : ''}
                          <MathRenderer content={q.answer} className="inline" />
                        </p>
                        {q.solution && (
                          <div className="mt-1">
                            <SolutionSteps steps={solutionLines(q.solution)} />
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            {!selection.answers && (
              <div className="avoid-break mt-5 pt-2 border-t border-black text-[13px] text-black">
                <span className="font-bold">Хариултын хүснэгт: </span>
                {questions.map((q, i) => (
                  <span key={q.id} className="inline-block mr-3">
                    {i + 1}. ____
                  </span>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
