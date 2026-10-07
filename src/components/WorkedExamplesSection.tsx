import React from 'react';
import { WorkedExample } from '../types';
import { MathRenderer } from './MathRenderer';
import { ArrowRight, Lightbulb, Plus, Edit2, Trash2 } from 'lucide-react';
import { LessonSectionHeader } from './LessonSectionHeader';

interface WorkedExamplesSectionProps {
  examples: WorkedExample[];
  isEditable?: boolean;
  onEditExample?: (example: WorkedExample) => void;
  onDeleteExample?: (exampleId: string) => void;
  onAddExample?: () => void;
  // Two examples side by side on wide screens
  twoColumns?: boolean;
}

export const WorkedExamplesSection: React.FC<WorkedExamplesSectionProps> = ({
  examples,
  isEditable = false,
  onEditExample,
  onDeleteExample,
  onAddExample,
  twoColumns = false,
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
        <div
          className={
            twoColumns
              ? 'grid md:grid-cols-2 gap-5 print:grid-cols-2 print:gap-4'
              : 'space-y-5 print:space-y-4'
          }
        >
          {examples.map((ex, idx) => (
            <div
              key={ex.id || ex.number || idx}
              className="avoid-break relative group rounded-2xl border border-stone-200 bg-white p-5 md:p-6 print:p-3"
            >
              {/* Title & Example Number */}
              <div className="flex items-start justify-between gap-2 mb-3">
                {/* The number, then the problem itself (no title) */}
                <div className="flex gap-2 text-stone-900 print:text-black text-[15px] leading-relaxed">
                  <span className="font-bold text-[17px] text-stone-950 shrink-0">{ex.number}.</span>
                  <MathRenderer content={ex.problem} />
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

              {/* Solution steps as boxes joined by arrows, the answer below them */}
              {(() => {
                const boxes = ex.solutionSteps || [];
                return (
                  <>
                  <div className="flex flex-wrap items-stretch gap-2 md:pl-8 text-[15px] text-stone-700 print:text-black leading-relaxed">
                    {boxes.map((step, sIdx) => (
                      <React.Fragment key={sIdx}>
                        {sIdx > 0 && (
                          <span className="self-center w-7 h-7 rounded-full border border-stone-200 bg-white flex items-center justify-center text-amber-700 shrink-0">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <div className="flex-1 min-w-[180px] rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 flex items-center">
                          <div>
                            <MathRenderer content={step} className="inline" />
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  {ex.answer && (
                    <div className="mt-3 pl-[17px] md:pl-[49px] text-[15px] text-stone-800 print:text-black">
                      <span className="font-bold text-stone-950">Хариу:</span>{' '}
                      <MathRenderer content={ex.answer} className="inline" />
                    </div>
                  )}
                  </>
                );
              })()}
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
