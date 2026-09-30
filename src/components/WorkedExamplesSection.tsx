import React from 'react';
import { WorkedExample } from '../types';
import { MathRenderer } from './MathRenderer';
import { Lightbulb, Plus, Edit2, Trash2 } from 'lucide-react';

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
    <section className="mb-8 print:mb-6" id="section-examples">
      <div className="flex items-center justify-between pb-2 mb-4 border-b-2 border-stone-800 print:border-black">
        <h2 className="text-lg md:text-xl font-black tracking-tight text-stone-900 print:text-black uppercase">
          II. ЖИШЭЭ БОДЛОГО БА БОДОЛТ
        </h2>

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
      </div>

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
        <div className="space-y-4 print:space-y-3.5">
          {examples.map((ex, idx) => (
            <div
              key={ex.id || ex.number || idx}
              className="avoid-break bg-white border border-stone-300 print:border-stone-800 rounded-lg p-3.5 md:p-4 shadow-xs print:shadow-none relative group"
            >
              {/* Title & Example Number */}
              <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-200 print:border-stone-400">
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="font-extrabold text-sm md:text-base text-stone-950 print:text-black">
                    Жишээ {ex.number}. {ex.title ? <span className="font-semibold text-stone-700 print:text-stone-900">({ex.title})</span> : null}
                  </span>
                  {ex.prerequisiteGrade && (
                    <span className="text-[11px] px-2 py-0.5 bg-stone-100 print:bg-stone-200 text-stone-700 border border-stone-300 rounded font-medium">
                      {ex.prerequisiteGrade}-р ангийн суурь
                    </span>
                  )}
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
              <div className="font-medium text-stone-900 print:text-black text-sm md:text-base mb-3 leading-relaxed">
                <MathRenderer content={ex.problem} />
              </div>

              {/* Step-by-step Solution */}
              <div className="bg-stone-50 print:bg-stone-50/50 rounded-md p-3 border border-stone-200 print:border-stone-400 mb-2.5">
                <div className="font-bold text-xs md:text-sm text-stone-800 print:text-black mb-1.5 uppercase tracking-wide">
                  Бодолт:
                </div>
                <ol className="space-y-1.5 text-xs md:text-sm text-stone-800 print:text-black list-decimal list-inside pl-1">
                  {ex.solutionSteps.map((step, sIdx) => (
                    <li key={sIdx} className="leading-relaxed">
                      <MathRenderer content={step} className="inline" />
                    </li>
                  ))}
                </ol>
              </div>

              {/* Final Answer */}
              <div className="flex items-baseline space-x-2 text-xs md:text-sm pt-1">
                <span className="font-bold text-stone-900 print:text-black">Хариу:</span>
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
