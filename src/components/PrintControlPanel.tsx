import React from 'react';
import { PrintSectionsSelection, PrintOptions } from '../types';

interface PrintControlPanelProps {
  selection: PrintSectionsSelection;
  onChangeSelection: (newSelection: PrintSectionsSelection) => void;
  options?: PrintOptions;
  onChangeOptions?: (newOptions: PrintOptions) => void;
}

export const PrintControlPanel: React.FC<PrintControlPanelProps> = ({
  selection,
  onChangeSelection,
}) => {
  const toggleSection = (key: keyof PrintSectionsSelection) => {
    onChangeSelection({
      ...selection,
      [key]: !selection[key],
    });
  };

  return (
    <aside className="print-control-panel bg-white border border-stone-200 rounded-xl p-2.5 sm:p-3 shadow-xs mb-6 sticky top-4 z-20 no-print">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Checkboxes List: Онол, Жишээ, Дасгал */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* 1. Онол */}
          <label
            className={`flex items-center space-x-2 text-xs font-semibold cursor-pointer select-none px-2.5 py-1.5 rounded-lg border transition-all ${
              selection.theory
                ? 'bg-amber-50/60 border-amber-200 text-stone-900 font-bold'
                : 'border-transparent text-stone-700 hover:bg-stone-50 hover:border-stone-200'
            }`}
          >
            <input
              type="checkbox"
              checked={selection.theory}
              onChange={() => toggleSection('theory')}
              className="w-4 h-4 rounded text-amber-700 border-stone-300 focus:ring-amber-500 accent-amber-700 cursor-pointer"
            />
            <span>Онол</span>
          </label>

          {/* 2. Жишээ */}
          <label
            className={`flex items-center space-x-2 text-xs font-semibold cursor-pointer select-none px-2.5 py-1.5 rounded-lg border transition-all ${
              selection.examples
                ? 'bg-amber-50/60 border-amber-200 text-stone-900 font-bold'
                : 'border-transparent text-stone-700 hover:bg-stone-50 hover:border-stone-200'
            }`}
          >
            <input
              type="checkbox"
              checked={selection.examples}
              onChange={() => toggleSection('examples')}
              className="w-4 h-4 rounded text-amber-700 border-stone-300 focus:ring-amber-500 accent-amber-700 cursor-pointer"
            />
            <span>Жишээ</span>
          </label>

          {/* 3. Дасгал */}
          <label
            className={`flex items-center space-x-2 text-xs font-semibold cursor-pointer select-none px-2.5 py-1.5 rounded-lg border transition-all ${
              selection.practice
                ? 'bg-amber-50/60 border-amber-200 text-stone-900 font-bold'
                : 'border-transparent text-stone-700 hover:bg-stone-50 hover:border-stone-200'
            }`}
          >
            <input
              type="checkbox"
              checked={selection.practice}
              onChange={() => toggleSection('practice')}
              className="w-4 h-4 rounded text-amber-700 border-stone-300 focus:ring-amber-500 accent-amber-700 cursor-pointer"
            />
            <span>Дасгал</span>
          </label>
        </div>
      </div>
    </aside>
  );
};
