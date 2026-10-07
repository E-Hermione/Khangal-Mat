import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { TheoryBlock, TheoryRule } from '../types';
import { theoryBlocks, withBlocks } from '../utils/theoryBlocks';
import { LatexInputWithPreview } from './LatexInputWithPreview';

const LABEL: Record<TheoryBlock['type'], string> = {
  text: 'Бичвэр',
  formula: 'Голд томьёо (LaTeX)',
  note: 'Тайлбар / санамж',
  heading: 'Дэд гарчиг (1.1, 1.2 гэж дугаарлагдана)',
};

/** Edits a theory item as a list of blocks; a new block can be added under any block. */
export const TheoryBlocksEditor: React.FC<{ rule: TheoryRule; onChange: (rule: TheoryRule) => void }> = ({
  rule,
  onChange,
}) => {
  const blocks = theoryBlocks(rule);
  const save = (next: TheoryBlock[]) => onChange(withBlocks(rule, next));
  const addAfter = (i: number, type: TheoryBlock['type']) =>
    save([...blocks.slice(0, i + 1), { type, value: '' }, ...blocks.slice(i + 1)]);

  const addButtons = (i: number) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px] text-stone-400 font-semibold">Доор нь нэмэх:</span>
      {(['heading', 'text', 'formula', 'note'] as const).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => addAfter(i, type)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-stone-300 bg-white hover:bg-amber-50 hover:border-amber-400 text-[11px] font-bold text-stone-700 cursor-pointer"
        >
          <Plus className="w-3 h-3" /> {{ heading: 'Дэд гарчиг', text: 'Бичвэр', formula: 'Томьёо', note: 'Тайлбар' }[type]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      {blocks.length === 0 && addButtons(-1)}
      {blocks.map((block, i) => (
        <div key={i} className="space-y-1.5 border-l-2 border-stone-200 pl-3">
          <div className="flex items-start gap-2">
            <LatexInputWithPreview
              className="flex-1"
              label={LABEL[block.type]}
              value={block.value}
              onChange={(value) => save(blocks.map((b, j) => (j === i ? { ...b, value } : b)))}
              multiline={block.type === 'text' || block.type === 'note'}
              rows={block.type === 'text' ? 3 : 2}
              previewBlock={block.type === 'formula'}
            />
            <button
              type="button"
              onClick={() => save(blocks.filter((_, j) => j !== i))}
              className="mt-6 p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
              title="Энэ хэсгийг устгах"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {addButtons(i)}
        </div>
      ))}
    </div>
  );
};
