import React from 'react';
import { SolutionSteps, solutionLines } from './SolutionSteps';
import { PracticeProblem } from '../types';
import { MathRenderer } from './MathRenderer';
import { PencilLine, Eye, EyeOff, Plus, Edit2, Trash2 } from 'lucide-react';
import { LessonSectionHeader } from './LessonSectionHeader';

interface PracticeSectionProps {
  practice: PracticeProblem[];
  includeWorkSpace?: boolean;
  teacherVersion?: boolean;
  // Students never see practice answers or solutions
  allowSolutions?: boolean;
  // Extra controls in the section header (admin: who may see the solutions)
  headerExtra?: React.ReactNode;
  isEditable?: boolean;
  onEditPractice?: (problem: PracticeProblem) => void;
  onDeletePractice?: (problemId: string) => void;
  onAddPractice?: () => void;
}

export const PracticeSection: React.FC<PracticeSectionProps> = ({
  practice,
  includeWorkSpace = true,
  teacherVersion = false,
  allowSolutions = false,
  headerExtra,
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

          {allowSolutions && (
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
        <div className="divide-y divide-stone-200 print:divide-y-0 print:space-y-3">
          {practice.map((item, idx) => {
            const showSol = allowSolutions && (teacherVersion || showSolutionsOnScreen);

            return (
              <div
                key={item.id || item.number || idx}
                className="avoid-break py-6 first:pt-0 last:pb-0 relative group print:py-0"
              >
                {/* Question header */}
                {/* The number, then the problem itself */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex gap-2 text-stone-800 print:text-black text-[15px] leading-relaxed">
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

                {/* Workspace grid lines */}
                {includeWorkSpace && !showSol && (
                  <div
                    className="workspace-grid mt-2 mb-1 border-t border-b border-stone-200 print:border-stone-400"
                    style={{ height: `${(item.workSpaceLines || 4) * 23}px` }}
                  />
                )}

                {/* Teacher Solution on Screen or in Print: steps like the worked examples */}
                {showSol && (item.answer || item.solution) && (
                  <div className="mt-3">
                    <SolutionSteps steps={solutionLines(item.solution)} answer={item.answer} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
