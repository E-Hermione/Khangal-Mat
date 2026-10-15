import React from 'react';
import { theoryBlocks, theoryNumbers, theoryParts } from '../utils/theoryBlocks';
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
  // 1, 2, … for main topics and 1.1, 1.2, … for their sub-topics, in order
  const numbers = theoryNumbers(theory || []);
  // One theory item: its numbered title and its content; `card` lays it out as a framed card
  const renderRule = (rule: TheoryRule, idx: number, card: boolean) => (
              <div>
                {/* Header Box */}
                <div className={`flex items-start justify-between gap-2 ${card ? 'px-4 py-3 border-b border-stone-200' : 'mb-2.5'}`}>
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
                    <span>{rule.title.includes("$") ? <MathRenderer content={rule.title} className="inline" /> : rule.title}</span>
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

                {/* Content in reading order: text, centred formulas, notes */}
                <div className={card ? 'px-4 py-3' : ''}>
                {theoryBlocks(rule).map((block, bIdx) =>
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
  );
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
          {theoryGroups(theory).map((g) =>
            g.cards ? (
              <div
                key={g.items[0].rule.id || g.items[0].idx}
                className="py-7 first:pt-0 last:pb-0 pl-6 md:pl-10 print:pl-8 grid gap-4 md:grid-cols-2"
              >
                {cardOrder(g.items).map(({ rule, idx, wide }) => (
                  <div
                    key={rule.id || idx}
                    className={`avoid-break relative group rounded-xl border border-stone-200 bg-white shadow-xs ${wide ? 'md:col-span-2' : ''}`}
                  >
                    {renderRule(rule, idx, true)}
                  </div>
                ))}
              </div>
            ) : (
              <div
                key={g.items[0].rule.id || g.items[0].idx}
                className={`avoid-break py-7 first:pt-0 last:pb-0 relative group print:py-0 ${g.items[0].rule.sub ? 'pl-6 md:pl-10 print:pl-8' : ''}`}
              >
                {renderRule(g.items[0].rule, g.items[0].idx, false)}
              </div>
            )
          )}
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
 * Theory items in display groups: a run of sub-parts marked `cards` is shown as cards two to a
 * row; every other item stands alone.
 */
function theoryGroups(theory: TheoryRule[]): { cards: boolean; items: { rule: TheoryRule; idx: number }[] }[] {
  const groups: { cards: boolean; items: { rule: TheoryRule; idx: number }[] }[] = [];
  theory.forEach((rule, idx) => {
    const card = !!(rule.sub && rule.cards);
    const last = groups[groups.length - 1];
    if (card && last?.cards) last.items.push({ rule, idx });
    else groups.push({ cards: card, items: [{ rule, idx }] });
  });
  return groups;
}

/**
 * Cards in the order they are laid out two to a row. With an odd number the middle one takes a
 * whole row of its own, set between the pairs; the others keep their order in pairs:
 * 7 cards → 1.1 1.2 / 1.3 1.5 / 1.4 (whole row) / 1.6 1.7.
 */
function cardOrder<T>(items: T[]): (T & { wide: boolean })[] {
  const all = items.map((x) => ({ ...x, wide: false }));
  if (all.length % 2 === 0) return all;
  const mid = (all.length - 1) / 2;
  const middle = { ...all[mid], wide: true };
  const rest = all.filter((_, i) => i !== mid);
  const at = Math.ceil(rest.length / 2 / 2) * 2;
  return [...rest.slice(0, at), middle, ...rest.slice(at)];
}
