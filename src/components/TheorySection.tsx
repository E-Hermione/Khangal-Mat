import React from 'react';
import { TheoryRule } from '../types';
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
  return (
    <section className="mb-12 print:mb-6" id="section-theory">
      <LessonSectionHeader
        icon={<BookOpen className="w-5 h-5" />}
        title="Онол"
        subtitle={theory?.length ? `${theory.length} дүрэм, тодорхойлолт` : undefined}
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
              className="avoid-break py-7 first:pt-0 last:pb-0 relative group print:py-0"
            >
              <div>
                {/* Header Box */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="font-bold text-[17px] leading-snug text-[#3D0C02] print:text-black">
                    <span className="text-amber-500 print:text-black">{idx + 1}.</span> {rule.title}
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

                {/* Rule Text */}
                <div className="text-[15px] text-stone-700 print:text-black leading-relaxed">
                  <MathRenderer content={rule.ruleText} />
                </div>

                {/* Mathematical Formula Box if exists */}
                {rule.formula && (
                  <div className="my-3 text-center overflow-x-auto">
                    <MathRenderer content={`$$${rule.formula}$$`} block />
                  </div>
                )}
              </div>

              {/* Explanatory Note */}
              {rule.note && (
                <div className="text-[13px] text-stone-500 leading-relaxed print:text-stone-800">
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
