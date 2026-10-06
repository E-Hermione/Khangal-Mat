import React from 'react';
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

  const difficultyLabels: Record<string, { label: string; badgeClass: string }> = {
    easy: {
      label: 'Хялбар',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 print:bg-white print:text-black print:border-black',
    },
    medium: {
      label: 'Дунд',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 print:bg-white print:text-black print:border-black',
    },
    hard: {
      label: 'Ахисан',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 print:bg-white print:text-black print:border-black',
    },
  };

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
        <div className="space-y-4 print:space-y-3.5">
          {practice.map((item, idx) => {
            const diff = difficultyLabels[item.difficulty] || difficultyLabels.medium;
            const showSol = allowSolutions && (teacherVersion || showSolutionsOnScreen);

            return (
              <div
                key={item.id || item.number || idx}
                className="avoid-break bg-white border border-stone-200 rounded-2xl p-5 shadow-sm print:border-stone-500 print:shadow-none print:rounded-lg print:p-3 relative group"
              >
                {/* Question header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-stone-900 text-white text-xs font-black flex items-center justify-center print:bg-white print:text-black print:border print:border-black">
                      {item.number}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${diff.badgeClass}`}>
                      {diff.label}
                    </span>
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

                {/* Question body */}
                <div className="text-stone-900 print:text-black text-[15px] mb-2 leading-relaxed">
                  <MathRenderer content={item.question} />
                </div>

                {/* Optional Hint */}
                {item.hint && (
                  <div className="text-xs text-amber-900 bg-amber-50 print:bg-transparent print:border print:border-stone-300 px-3 py-2 rounded-xl mb-2 inline-block">
                    <span className="font-bold">💡 Зөвлөмж: </span>
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

                {/* Teacher Solution on Screen or in Print */}
                {showSol && item.answer && (
                  <div className="mt-3 p-4 bg-emerald-50 print:bg-stone-100 border border-emerald-100 print:border-stone-500 rounded-xl text-sm">
                    <div className="font-bold text-emerald-900 print:text-black mb-1">
                      Хариу: <span className="text-emerald-700 print:text-black"><MathRenderer content={item.answer} className="inline" /></span>
                    </div>
                    {item.solution && (
                      <div className="text-stone-700 print:text-black mt-1">
                        <span className="font-semibold">Бодолт: </span>
                        <MathRenderer content={item.solution} className="inline" />
                      </div>
                    )}
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
