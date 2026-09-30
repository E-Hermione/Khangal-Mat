import React from 'react';
import { TheoryRule } from '../types';
import { MathRenderer } from './MathRenderer';
import { BookOpen, Plus, Edit2, Trash2 } from 'lucide-react';

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
  return (
    <section className="mb-8 print:mb-6" id="section-theory">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 mb-4 border-b-2 border-stone-800 print:border-black">
        <h2 className="text-lg md:text-xl font-black tracking-tight text-stone-900 print:text-black uppercase">
          I. ОНОЛЫН МАТЕРИАЛ БА ДҮРЭМ
        </h2>

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
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3.5">
          {theory.map((rule, idx) => (
            <div
              key={rule.id || idx}
              className="avoid-break bg-white border-2 border-stone-800 print:border-black rounded-lg p-3.5 md:p-4 shadow-xs print:shadow-none flex flex-col justify-between relative group"
            >
              <div>
                {/* Header Box */}
                <div className="flex items-start justify-between gap-2 pb-2 mb-2 border-b border-stone-200 print:border-stone-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm md:text-base text-stone-900 print:text-black uppercase tracking-wide">
                      {rule.title}
                    </h3>
                    {rule.badge && (
                      <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 bg-stone-100 print:bg-stone-200 text-stone-800 print:text-black rounded border border-stone-300 print:border-black">
                        {rule.badge}
                      </span>
                    )}
                  </div>

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

                {/* Rule Text */}
                <div className="text-xs md:text-sm text-stone-800 print:text-black font-normal leading-relaxed">
                  <MathRenderer content={rule.ruleText} />
                </div>

                {/* Mathematical Formula Box if exists */}
                {rule.formula && (
                  <div className="mt-2.5 p-2 bg-stone-50 print:bg-stone-100 border border-stone-300 print:border-stone-600 rounded text-center">
                    <MathRenderer content={`$$${rule.formula}$$`} block />
                  </div>
                )}
              </div>

              {/* Explanatory Note */}
              {rule.note && (
                <div className="mt-2.5 pt-2 border-t border-dashed border-stone-200 print:border-stone-400 text-[11px] md:text-xs text-stone-600 print:text-stone-800 italic">
                  <span className="font-semibold not-italic">Тайлбар: </span>
                  <MathRenderer content={rule.note} className="inline" />
                </div>
              )}
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
