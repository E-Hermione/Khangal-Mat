import React from 'react';
import { PracticeProblem } from '../types';
import { MathRenderer } from './MathRenderer';
import { PencilLine, Eye, EyeOff, Plus, Edit2, Trash2 } from 'lucide-react';

interface PracticeSectionProps {
  practice: PracticeProblem[];
  includeWorkSpace?: boolean;
  teacherVersion?: boolean;
  isEditable?: boolean;
  onEditPractice?: (problem: PracticeProblem) => void;
  onDeletePractice?: (problemId: string) => void;
  onAddPractice?: () => void;
}

export const PracticeSection: React.FC<PracticeSectionProps> = ({
  practice,
  includeWorkSpace = true,
  teacherVersion = false,
  isEditable = false,
  onEditPractice,
  onDeletePractice,
  onAddPractice,
}) => {
  const [showSolutionsOnScreen, setShowSolutionsOnScreen] = React.useState<boolean>(false);

  const difficultyLabels: Record<string, { label: string; badgeClass: string }> = {
    easy: {
      label: 'Хялбар түвшин',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 print:bg-stone-100 print:text-black print:border-black',
    },
    medium: {
      label: 'Дунд түвшин',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 print:bg-stone-100 print:text-black print:border-black',
    },
    hard: {
      label: 'Ахисан түвшин',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 print:bg-stone-100 print:text-black print:border-black',
    },
  };

  return (
    <section className="mb-8 print:mb-6" id="section-practice">
      <div className="flex items-center justify-between pb-2 mb-4 border-b-2 border-stone-800 print:border-black">
        <h2 className="text-lg md:text-xl font-black tracking-tight text-stone-900 print:text-black uppercase">
          III. БИЕ ДААХ ДАСГАЛ БОДЛОГО
        </h2>
        <div className="flex items-center space-x-2 no-print">
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
        </div>
      </div>

      <p className="text-xs text-stone-600 print:text-stone-700 mb-4 italic">
        Дараах бодлогуудыг бодолтын дэвтэр эсвэл доорх зайд шат дараалан гүйцэтгэнэ үү. (Хялбар $\rightarrow$ Дунд $\rightarrow$ Ахисан шатлалтай)
      </p>

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
            const showSol = teacherVersion || showSolutionsOnScreen;

            return (
              <div
                key={item.id || item.number || idx}
                className="avoid-break bg-white border border-stone-300 print:border-stone-800 rounded-lg p-3.5 md:p-4 shadow-xs print:shadow-none relative group"
              >
                {/* Question header */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-stone-100 print:border-stone-300">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm md:text-base text-stone-950 print:text-black">
                      Дасгал {item.number}.
                    </span>
                    <span className={`text-[10px] md:text-[11px] font-bold px-2 py-0.5 rounded border ${diff.badgeClass}`}>
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
                <div className="text-stone-900 print:text-black text-sm md:text-base mb-2 leading-relaxed font-normal">
                  <MathRenderer content={item.question} />
                </div>

                {/* Optional Hint */}
                {item.hint && (
                  <div className="text-[11px] text-amber-900/80 bg-amber-50/50 print:bg-transparent print:border-stone-300 p-1.5 rounded mb-2 border border-amber-200/60 inline-block">
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

                {/* Teacher Solution on Screen or in Print */}
                {showSol && (
                  <div className="mt-3 p-3 bg-amber-50/70 print:bg-stone-100 border border-amber-200 print:border-stone-500 rounded-md text-xs md:text-sm">
                    <div className="font-bold text-amber-950 print:text-black mb-1">
                      Шалгах хариу: <span className="font-mono text-emerald-700 print:text-black"><MathRenderer content={item.answer} className="inline" /></span>
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
