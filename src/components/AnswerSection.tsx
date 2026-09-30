import React from 'react';
import { TopicPackage } from '../types';
import { MathRenderer } from './MathRenderer';
import { CheckCircle2 } from 'lucide-react';

interface AnswerSectionProps {
  topic: TopicPackage;
  isFirstPrintedSection?: boolean;
}

export const AnswerSection: React.FC<AnswerSectionProps> = ({ topic, isFirstPrintedSection = false }) => {
  return (
    <section
      className={`mb-8 ${isFirstPrintedSection ? '' : 'page-break-before'}`}
      id="section-answers"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-4 border-b-2 border-stone-800 print:border-black">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 print:text-black no-print" />
          <h2 className="text-lg md:text-xl font-black tracking-tight text-stone-900 print:text-black uppercase">
            IV. БОДЛОГО БА СОРИЛЫН ХАРИУ, ЗӨВЛӨМЖ
          </h2>
        </div>
      </div>

      <div className="space-y-6 text-sm">
        {/* Practice Answers */}
        {topic.practice && topic.practice.length > 0 && (
          <div className="avoid-break bg-white border border-stone-300 print:border-stone-800 rounded-lg p-3.5 md:p-4">
            <h3 className="font-bold text-stone-900 print:text-black text-sm uppercase tracking-wide pb-1.5 mb-2.5 border-b border-stone-200 print:border-stone-400">
              1. Бие даах дасгалын хариу
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topic.practice.map((item) => (
                <div key={item.id || item.number} className="p-2 bg-stone-50 print:bg-stone-100/60 rounded border border-stone-200 print:border-stone-300 text-xs">
                  <div className="font-bold text-stone-800 print:text-black">
                    Дасгал {item.number}:
                  </div>
                  <div className="text-stone-900 print:text-black font-semibold mt-0.5">
                    <MathRenderer content={item.answer} />
                  </div>
                  {item.solution && (
                    <div className="text-stone-600 print:text-stone-800 text-[11px] mt-1 border-t border-stone-200 pt-1">
                      <MathRenderer content={item.solution} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tests Answers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Test 1 */}
          {topic.test1 && topic.test1.questions && (
            <div className="avoid-break bg-white border border-stone-300 print:border-stone-800 rounded-lg p-3">
              <h4 className="font-bold text-xs uppercase tracking-wide text-stone-900 print:text-black pb-1 mb-2 border-b border-stone-200">
                {topic.test1.title} (Нийт {topic.test1.totalPoints} оноо)
              </h4>
              <ul className="space-y-2 text-xs">
                {topic.test1.questions.map((q) => (
                  <li key={q.id || q.number} className="pb-1 border-b border-dashed border-stone-200">
                    <span className="font-bold text-stone-800">{q.number}-р бодлого: </span>
                    <span className="font-semibold text-stone-950">
                      <MathRenderer content={q.answer} className="inline" />
                    </span>
                    <span className="text-[11px] text-stone-500 ml-1">({q.points} оноо)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Test 2 */}
          {topic.test2 && topic.test2.questions && (
            <div className="avoid-break bg-white border border-stone-300 print:border-stone-800 rounded-lg p-3">
              <h4 className="font-bold text-xs uppercase tracking-wide text-stone-900 print:text-black pb-1 mb-2 border-b border-stone-200">
                {topic.test2.title} (Нийт {topic.test2.totalPoints} оноо)
              </h4>
              <ul className="space-y-2 text-xs">
                {topic.test2.questions.map((q) => (
                  <li key={q.id || q.number} className="pb-1 border-b border-dashed border-stone-200">
                    <span className="font-bold text-stone-800">{q.number}-р бодлого: </span>
                    <span className="font-semibold text-stone-950">
                      <MathRenderer content={q.answer} className="inline" />
                    </span>
                    <span className="text-[11px] text-stone-500 ml-1">({q.points} оноо)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Test 3 */}
          {topic.test3 && topic.test3.questions && (
            <div className="avoid-break bg-white border border-stone-300 print:border-stone-800 rounded-lg p-3">
              <h4 className="font-bold text-xs uppercase tracking-wide text-stone-900 print:text-black pb-1 mb-2 border-b border-stone-200">
                {topic.test3.title} (Нийт {topic.test3.totalPoints} оноо)
              </h4>
              <ul className="space-y-2 text-xs">
                {topic.test3.questions.map((q) => (
                  <li key={q.id || q.number} className="pb-1 border-b border-dashed border-stone-200">
                    <span className="font-bold text-stone-800">{q.number}-р бодлого: </span>
                    <span className="font-semibold text-stone-950">
                      <MathRenderer content={q.answer} className="inline" />
                    </span>
                    <span className="text-[11px] text-stone-500 ml-1">({q.points} оноо)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
