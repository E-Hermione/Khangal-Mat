import React from 'react';
import { WorkedExample } from '../types';
import { MathRenderer } from './MathRenderer';
import { Lightbulb, Plus, Edit2, Trash2 } from 'lucide-react';
import { LessonSectionHeader } from './LessonSectionHeader';

interface WorkedExamplesSectionProps {
  examples: WorkedExample[];
  isEditable?: boolean;
  onEditExample?: (example: WorkedExample) => void;
  onDeleteExample?: (exampleId: string) => void;
  onAddExample?: () => void;
}

export const WorkedExamplesSection: React.FC<WorkedExamplesSectionProps> = ({
  examples,
  isEditable = false,
  onEditExample,
  onDeleteExample,
  onAddExample,
}) => {
  return (
    <section className="mb-12 print:mb-6" id="section-examples">
      <LessonSectionHeader
        icon={<Lightbulb className="w-5 h-5" />}
        title="Жишээ"
        subtitle={examples?.length ? `${examples.length} бодлого алхам алхмаар бодсон` : undefined}
        tone="violet"
      >

        {isEditable && onAddExample && (
          <button
            type="button"
            onClick={onAddExample}
            className="no-print text-xs px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-md flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Жишээ нэмэх</span>
          </button>
        )}
      </LessonSectionHeader>

      {(!examples || examples.length === 0) ? (
        <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-xl my-3 text-stone-400">
          <p className="text-xs">Одоогоор бодолттой жишээ оруулаагүй байна.</p>
          {isEditable && onAddExample && (
            <button
              type="button"
              onClick={onAddExample}
              className="mt-2 text-xs text-amber-700 font-bold hover:underline"
            >
              + Эхний жишээг оруулах
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5 print:space-y-3.5">
          {examples.map((ex, idx) => (
            <div
              key={ex.id || ex.number || idx}
              className="avoid-break bg-white border border-stone-200 rounded-2xl p-5 shadow-sm print:border-stone-500 print:shadow-none print:rounded-lg print:p-3 relative group"
            >
              {/* Title & Example Number */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 print:bg-white print:text-black print:border print:border-black">
                    Жишээ {ex.number}
                  </span>
                  {ex.title && <span className="font-bold text-sm text-stone-800 print:text-black">{ex.title}</span>}
                </div>

                {/* Edit & Delete actions */}
                {isEditable && (
                  <div className="no-print flex items-center space-x-1 shrink-0">
                    {onEditExample && (
                      <button
                        type="button"
                        onClick={() => onEditExample(ex)}
                        title="Жишээ засах"
                        className="p-1 text-stone-500 hover:text-amber-800 hover:bg-stone-100 rounded cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteExample && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Жишээ ${ex.number}-г устгах уу?`)) {
                            onDeleteExample(ex.id);
                          }
                        }}
                        title="Жишээ устгах"
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Problem Statement */}
              <div className="font-medium text-stone-900 print:text-black text-[15px] mb-4 leading-relaxed">
                <MathRenderer content={ex.problem} />
              </div>

              {/* Step-by-step Solution */}
              <div className="rounded-xl bg-stone-50 p-4 mb-3 print:bg-white print:border print:border-stone-400 print:p-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2.5 print:text-black">Бодолт</div>
                <ol className="space-y-2.5 text-sm text-stone-700 print:text-black">
                  {ex.solutionSteps.map((step, sIdx) => (
                    <li key={sIdx} className="flex gap-3 leading-relaxed">
                      <span className="w-5 h-5 mt-0.5 rounded-full bg-white border border-violet-200 text-violet-700 text-[10px] font-black flex items-center justify-center shrink-0 print:border-black print:text-black">
                        {sIdx + 1}
                      </span>
                      <div className="min-w-0">
                        <MathRenderer content={step} className="inline" />
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Final Answer */}
              <div className="inline-flex flex-wrap items-baseline gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-sm print:bg-white print:border-black">
                <span className="font-bold text-emerald-800 print:text-black">Хариу:</span>
                <span className="font-semibold text-stone-900 print:text-black">
                  <MathRenderer content={ex.answer} className="inline" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom quick add button */}
      {isEditable && onAddExample && examples && examples.length > 0 && (
        <div className="no-print mt-3.5 pt-2 flex justify-center">
          <button
            type="button"
            onClick={onAddExample}
            className="text-xs px-3.5 py-1.5 bg-stone-100 hover:bg-amber-50 text-stone-700 hover:text-amber-950 border border-stone-300 hover:border-amber-300 rounded-lg font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-600" />
            <span>Шинэ жишээ бодлого нэмэх</span>
          </button>
        </div>
      )}
    </section>
  );
};
