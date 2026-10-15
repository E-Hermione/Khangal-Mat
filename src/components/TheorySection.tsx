import React from 'react';
import { theoryBlocks, theoryNumbers, theoryParts } from '../utils/theoryBlocks';
import { TheoryRule, TheorySplit } from '../types';
import { MathRenderer } from './MathRenderer';
import { BookOpen, Plus, Edit2, Trash2 } from 'lucide-react';
import { LessonSectionHeader } from './LessonSectionHeader';

interface TheorySectionProps {
  theory: TheoryRule[];
  prerequisiteNotice?: string;
  isEditable?: boolean;
  onEditRule?: (rule: TheoryRule) => void;
  onDeleteRule?: (ruleId: string) => void;
  onAddRule?: () => void;
}

export const TheorySection: React.FC<TheorySectionProps> = ({
  theory,
  prerequisiteNotice,
  isEditable = false,
  onEditRule,
  onDeleteRule,
  onAddRule,
}) => {
  // 1, 2, … for main topics and 1.1, 1.2, … for their sub-topics, in order
  const numbers = theoryNumbers(theory || []);
  return (
    <section className="mb-12 print:mb-6" id="section-theory">
      <LessonSectionHeader
        icon={<BookOpen className="w-5 h-5" />}
        title="Онол"
        tone="sky"
      >
        {isEditable && onAddRule && (
          <button
            type="button"
            onClick={onAddRule}
            className="no-print text-xs px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-md flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Дүрэм нэмэх</span>
          </button>
        )}
      </LessonSectionHeader>

      {prerequisiteNotice && (
        <div className="mb-4 p-3 bg-amber-50/60 border border-amber-200 rounded-md text-xs md:text-sm text-amber-900 print:bg-white print:border-stone-400 print:text-black avoid-break">
          <span className="font-bold">Санамж / Суурь мэдлэгийн залгамж: </span>
          <MathRenderer content={prerequisiteNotice} className="inline" />
        </div>
      )}

      {/* Grid of Rule Boxes */}
      {(!theory || theory.length === 0) ? (
        <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-xl my-3 text-stone-400">
          <p className="text-xs">Одоогоор онолын дүрэм оруулаагүй байна.</p>
          {isEditable && onAddRule && (
            <button
              type="button"
              onClick={onAddRule}
              className="mt-2 text-xs text-amber-700 font-bold hover:underline"
            >
              + Эхний дүрмийг оруулах
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-stone-200 print:divide-y-0 print:space-y-4">
          {theory.map((rule, idx) => (
            <div
              key={rule.id || idx}
              className={`avoid-break py-7 first:pt-0 last:pb-0 relative group print:py-0 ${rule.sub ? 'pl-6 md:pl-10 print:pl-8' : ''}`}
            >
              <div>
                {/* Header Box */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <h3 className={`flex items-center gap-2.5 font-bold leading-snug text-[#3D0C02] ${rule.sub ? 'text-[16px]' : 'text-[18px]'}`}>
                    <span
                      className={`inline-flex shrink-0 items-center justify-center rounded-md font-bold tabular-nums print:border print:border-[#3D0C02] ${
                        rule.sub
                          ? 'h-6 min-w-[2.25rem] px-1.5 text-[12px] bg-[#3D0C02] text-white print:bg-white print:text-[#3D0C02]'
                          : 'h-7 min-w-[1.75rem] px-1.5 text-[13px] bg-[#3D0C02] text-white print:bg-white print:text-[#3D0C02]'
                      }`}
                    >
                      {numbers[idx]}
                    </span>
                    <span>{rule.title}</span>
                  </h3>

                  {/* Edit/Delete controls for editable mode */}
                  {isEditable && (
                    <div className="no-print flex items-center space-x-1 shrink-0">
                      {onEditRule && (
                        <button
                          type="button"
                          onClick={() => onEditRule(rule)}
                          title="Онол засах"
                          className="p-1 text-stone-500 hover:text-amber-800 hover:bg-stone-100 rounded cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteRule && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`«${rule.title}» дүрмийг устгах уу?`)) {
                              onDeleteRule(rule.id);
                            }
                          }}
                          title="Онол устгах"
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {rule.split ? <SplitTheory split={rule.split} /> : null}
                {/* Content in reading order: text, centred formulas, notes */}
                {!rule.split && theoryBlocks(rule).map((block, bIdx) =>
                  block.type === 'formula' ? (
                    <div key={bIdx} className="my-3 text-center overflow-x-auto overflow-y-hidden scrollbar-none">
                      <MathRenderer content={`$$${block.value}$$`} block />
                    </div>
                  ) : block.type === 'note' ? (
                    <div key={bIdx} className="mt-2 text-[13px] text-stone-500 leading-relaxed print:text-stone-800">
                      <MathRenderer content={block.value} className="inline" />
                    </div>
                  ) : (
                    <div key={bIdx}>
                      {theoryParts(block.value).map((part, pIdx) =>
                        part.kind === 'formula' ? (
                          <div key={pIdx} className="my-2 text-center overflow-x-auto overflow-y-hidden scrollbar-none">
                            <MathRenderer content={`$$${part.value}$$`} />
                          </div>
                        ) : part.kind === 'rule' ? (
                          <div key={pIdx} className="my-1.5 text-[15px] text-stone-700 print:text-black leading-relaxed">
                            <MathRenderer content={part.value} />
                          </div>
                        ) : (
                          <div key={pIdx} className="my-1.5 text-[15px] text-stone-700 print:text-black leading-relaxed">
                            <MathRenderer content={part.value} />
                          </div>
                        )
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Button below grid when in editable mode */}
      {isEditable && onAddRule && theory && theory.length > 0 && (
        <div className="no-print mt-3.5 pt-2 flex justify-center">
          <button
            type="button"
            onClick={onAddRule}
            className="text-xs px-3.5 py-1.5 bg-stone-100 hover:bg-amber-50 text-stone-700 hover:text-amber-950 border border-stone-300 hover:border-amber-300 rounded-lg font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-600" />
            <span>Шинэ онол, дүрэм нэмэх</span>
          </button>
        </div>
      )}
    </section>
  );
};

/**
 * Rule and example side by side: the definition and its explanation on the left, the example on
 * the right with its calculation as numbered steps (one under another) and the answer last.
 * The two columns share an accent and an arrow, so the example reads as this rule in use.
 */
const SplitTheory: React.FC<{ split: TheorySplit }> = ({ split }) => (
  <div className="grid gap-4 md:grid-cols-2 md:gap-0 items-stretch">
    <div className="md:pr-6 md:border-r-2 md:border-dashed md:border-sky-200 relative">
      <div className="text-[11px] font-bold uppercase tracking-wide text-sky-700 mb-1.5">Тодорхойлолт</div>
      <div className="rounded-lg border-l-4 border-sky-600 bg-sky-50/70 px-3.5 py-2.5 text-[15px] text-stone-900 leading-relaxed print:bg-white">
        <MathRenderer content={split.rule} />
      </div>
      {split.explain && (
        <>
          <div className="text-[11px] font-bold uppercase tracking-wide text-stone-500 mt-3 mb-1">Тайлбар</div>
          <div className="text-[14px] text-stone-700 leading-relaxed print:text-black">
            <MathRenderer content={split.explain} />
          </div>
        </>
      )}
      <span
        aria-hidden
        className="hidden md:flex absolute top-8 -right-[13px] h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white text-[13px] font-bold shadow-sm print:hidden"
      >
        →
      </span>
    </div>
    <div className="md:pl-7">
      <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-1.5">Жишээ</div>
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3.5 py-2.5 text-[14.5px] text-stone-800 leading-relaxed print:bg-white">
        <MathRenderer content={split.example} />
      </div>
      {!!split.steps?.length && (
        <>
          <div className="text-[11px] font-bold uppercase tracking-wide text-stone-500 mt-3 mb-1.5">Тооцоолол</div>
          <ol className="space-y-2">
            {split.steps.map((st, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-800 text-white text-[11px] font-bold tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-stone-700">
                    <MathRenderer content={st.label} />
                  </div>
                  {st.note && (
                    <div className="text-[12.5px] text-stone-500 leading-snug">
                      <MathRenderer content={st.note} />
                    </div>
                  )}
                  <div className="mt-0.5 rounded-md bg-white border border-stone-200 px-2.5 py-1 overflow-x-auto scrollbar-none text-center">
                    <MathRenderer content={`$${st.value}$`} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
      {split.answer && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-300 px-3 py-2 print:bg-white">
          <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Хариу</span>
          <span className="text-[15px] font-bold text-emerald-900">
            <MathRenderer content={split.answer} className="inline" />
          </span>
        </div>
      )}
    </div>
  </div>
);
