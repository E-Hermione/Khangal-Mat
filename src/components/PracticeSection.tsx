import React from 'react';
import { SolutionSteps, solutionLines } from './SolutionSteps';
import { RevealAnswer } from './RevealAnswer';
import { PracticeProblem } from '../types';
import { MathRenderer } from './MathRenderer';
import { PencilLine, Eye, EyeOff, Plus, Edit2, Trash2 } from 'lucide-react';
import { LessonSectionHeader } from './LessonSectionHeader';

// Headings for the exercises grouped by level (5 хөнгөн, 5 дунд, 5 хүнд)
const LEVELS = {
  1: { label: 'Хөнгөн', cls: 'text-emerald-700 print:text-black', dot: 'bg-emerald-500' },
  2: { label: 'Дунд', cls: 'text-amber-700 print:text-black', dot: 'bg-amber-500' },
  3: { label: 'Хүнд', cls: 'text-rose-700 print:text-black', dot: 'bg-rose-500' },
} as const;

interface PracticeSectionProps {
  practice: PracticeProblem[];
  teacherVersion?: boolean;
  // Students never see practice answers or solutions
  allowSolutions?: boolean;
  // Extra controls in the section header (admin: who may see the solutions)
  headerExtra?: React.ReactNode;
  // With the solutions open, the exercises sit in two columns of cards like the worked examples
  twoColumns?: boolean;
  isEditable?: boolean;
  onEditPractice?: (problem: PracticeProblem) => void;
  onDeletePractice?: (problemId: string) => void;
  onAddPractice?: () => void;
}

export const PracticeSection: React.FC<PracticeSectionProps> = ({
  practice,
  teacherVersion = false,
  allowSolutions = false,
  headerExtra,
  twoColumns = true,
  isEditable = false,
  onEditPractice,
  onDeletePractice,
  onAddPractice,
}) => {
  const [showSolutionsOnScreen, setShowSolutionsOnScreen] = React.useState<boolean>(false);


  return (
    <section className="mb-12 print:mb-6" id="section-practice">
      <LessonSectionHeader
        icon={<PencilLine className="w-5 h-5" />}
        title="Дасгал"
        subtitle="Бие даан бодоорой: хялбараас ахисан руу"
        tone="emerald"
      >
          {headerExtra}
          {isEditable && onAddPractice && (
            <button
              type="button"
              onClick={onAddPractice}
              className="text-xs px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-md flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Дасгал нэмэх</span>
            </button>
          )}

          {/* Not needed when solutions always show (teacher version, editor preview) */}
          {allowSolutions && !teacherVersion && (
          <button
            type="button"
            onClick={() => setShowSolutionsOnScreen(!showSolutionsOnScreen)}
            className="text-xs px-2.5 py-1 rounded border border-stone-300 hover:bg-stone-100 flex items-center space-x-1 text-stone-700 transition-colors"
          >
            {showSolutionsOnScreen ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                <span>Бодолтыг нуух</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-stone-500" />
                <span>Шалгах / Бодолт харах</span>
              </>
            )}
          </button>
          )}
      </LessonSectionHeader>

      {(!practice || practice.length === 0) ? (
        <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-xl my-3 text-stone-400">
          <p className="text-xs">Одоогоор бие даах дасгал оруулаагүй байна.</p>
          {isEditable && onAddPractice && (
            <button
              type="button"
              onClick={onAddPractice}
              className="mt-2 text-xs text-amber-700 font-bold hover:underline"
            >
              + Эхний дасгалыг нэмэх
            </button>
          )}
        </div>
      ) : (
        (() => {
          const showSol = allowSolutions && (teacherVersion || showSolutionsOnScreen);
          // Solutions open: cards like the worked examples (two columns unless turned off)
          const cards = showSol;
          return (
        <div
          className={
            cards
              ? twoColumns
                ? 'grid md:grid-cols-2 gap-5 print:grid-cols-2 print:gap-4'
                : 'space-y-5 print:space-y-4'
              : 'space-y-6 print:space-y-3'
          }
        >
          {practice.map((item, idx) => {
            const heading = item.level && item.level !== practice[idx - 1]?.level ? LEVELS[item.level] : null;
            return (
              <React.Fragment key={item.id || item.number || idx}>
              {heading && (
                <h3
                  className={`${cards ? 'md:col-span-2 print:col-span-2' : ''} ${idx ? 'mt-3' : ''} flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${heading.cls}`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${heading.dot}`} />
                  {heading.label}
                </h3>
              )}
              <div
                className={`avoid-break relative group ${cards ? 'rounded-2xl border border-stone-200 bg-white p-5 md:p-6 print:p-3' : ''}`}
              >
                {/* Question header */}
                {/* The number, then the problem itself */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex gap-2 text-stone-800 print:text-black text-[15px] leading-relaxed flex-1 min-w-0">
                    <span className="font-bold text-[17px] text-stone-950 shrink-0">{item.number}.</span>
                    <MathRenderer content={item.question} />
                  </div>

                  {isEditable && (
                    <div className="no-print flex items-center space-x-1 shrink-0">
                      {onEditPractice && (
                        <button
                          type="button"
                          onClick={() => onEditPractice(item)}
                          title="Дасгал засах"
                          className="p-1 text-stone-500 hover:text-amber-800 hover:bg-stone-100 rounded cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeletePractice && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Дасгал ${item.number}-г устгах уу?`)) {
                              onDeletePractice(item.id);
                            }
                          }}
                          title="Дасгал устгах"
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Optional Hint */}
                {item.hint && (
                  <div className="text-[13px] text-stone-500 mb-2 print:text-stone-800">
                    <span className="font-semibold">Зөвлөмж: </span>
                    <MathRenderer content={item.hint} className="inline" />
                  </div>
                )}

                {/* Teacher Solution on Screen or in Print: steps like the worked examples */}
                {showSol && (item.answer || item.solution) && (
                  <div className="mt-3">
                    {/* Students: the answer behind «Зөв хариу» at the end of the solution's last line */}
                    <SolutionSteps
                      steps={solutionLines(item.solution)}
                      answer={teacherVersion ? item.answer : undefined}
                      tail={!teacherVersion && item.answer ? <RevealAnswer answer={item.answer} /> : null}
                    />
                  </div>
                )}

              </div>
              </React.Fragment>
            );
          })}
        </div>
          );
        })()
      )}

      {/* Bottom quick add */}
      {isEditable && onAddPractice && practice && practice.length > 0 && (
        <div className="no-print mt-3.5 pt-2 flex justify-center">
          <button
            type="button"
            onClick={onAddPractice}
            className="text-xs px-3.5 py-1.5 bg-stone-100 hover:bg-amber-50 text-stone-700 hover:text-amber-950 border border-stone-300 hover:border-amber-300 rounded-lg font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-600" />
            <span>Шинэ дасгал бодлого нэмэх</span>
          </button>
        </div>
      )}
    </section>
  );
};
