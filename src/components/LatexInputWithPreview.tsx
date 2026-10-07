import React, { useRef } from 'react';
import { MathRenderer } from './MathRenderer';
import { Eye, Sparkles } from 'lucide-react';
// Copying a rendered formula copies its LaTeX code
import 'katex/contrib/copy-tex';

interface LatexInputWithPreviewProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  previewBlock?: boolean;
  className?: string;
  helpText?: string;
  // No preview under the field (the editor shows one preview of the whole item instead)
  hidePreview?: boolean;
  // No LaTeX buttons above the field (the editor shows one shared toolbar instead)
  hideToolbar?: boolean;
}

// Toolbar marker: wrap the selection in $…$
const WRAP = '<wrap>';
const CENTRED = '\n$$ x $$\n';

const MATH_SNIPPETS = [
  { label: 'x²', snippet: '^2', desc: 'Зэрэг' },
  { label: 'xₙ', snippet: '_n', desc: 'Индекс' },
  { label: 'a/b', snippet: '\\frac{a}{b}', desc: 'Энгийн бутархай' },
  { label: '√x', snippet: '\\sqrt{x}', desc: 'Язгуур' },
  { label: 'ⁿ√x', snippet: '\\sqrt[n]{x}', desc: 'n зэргийн язгуур' },
  { label: '±', snippet: '\\pm ', desc: 'Нэмэх хасах' },
  { label: '·', snippet: '\\cdot ', desc: 'Үржүүлэх' },
  { label: '≤', snippet: '\\le ', desc: 'Бага буюу тэнцүү' },
  { label: '≥', snippet: '\\ge ', desc: 'Их буюу тэнцүү' },
  { label: '≠', snippet: '\\neq ', desc: 'Тэнцүү биш' },
  { label: 'π', snippet: '\\pi ', desc: 'Пи тоо' },
  { label: 'Таб', snippet: '\\qquad ', desc: 'Таб шиг зай авах' },
  { label: '$', snippet: WRAP, desc: 'Сонгосон хэсгийг $...$ дотор оруулах' },
  { label: '→', snippet: ' \\;\\rightarrow\\; ', desc: 'Сум' },
  { label: '↔', snippet: ' \\;\\leftrightarrow\\; ', desc: 'Хоёр тийш сум' },
];

// The field the shared toolbar writes into: the one focused last
let activeField: ((snippet: string) => void) | null = null;

/** The LaTeX buttons; with no `onInsert` they write into the field focused last. */
export const LatexToolbar: React.FC<{ onInsert?: (snippet: string) => void; centred?: boolean; className?: string }> = ({
  onInsert,
  centred = true,
  className = '',
}) => {
  const insert = (snippet: string) => (onInsert ? onInsert(snippet) : activeField?.(snippet));
  const btn = 'px-1.5 py-0.5 text-[11px] font-bold border rounded shadow-2xs transition-colors cursor-pointer';
  return (
    <div className={`flex items-center flex-wrap gap-1 bg-stone-100 p-1.5 rounded-lg border border-stone-200 ${className}`}>
      <span className="text-[10px] uppercase font-bold text-stone-500 flex items-center gap-1 pl-1 pr-1.5">
        <Sparkles className="w-3 h-3 text-amber-600" />
        <span>LaTeX:</span>
      </span>
      {MATH_SNIPPETS.map((item) => (
        <button
          key={item.label}
          type="button"
          // Keep the cursor in the field being written
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert(item.snippet)}
          title={item.desc}
          className={`${btn} font-mono bg-white hover:bg-amber-100 text-stone-800 hover:text-amber-950 border-stone-300`}
        >
          {item.label}
        </button>
      ))}
      {centred && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert(CENTRED)}
          title="Мөрийн голд томьёо оруулах"
          className={`${btn} bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300`}
        >
          Голд томьёо
        </button>
      )}
    </div>
  );
};


export const LatexInputWithPreview: React.FC<LatexInputWithPreviewProps> = ({
  label,
  value,
  onChange,
  placeholder = 'LaTeX код эсвэл тайлбар бичнэ үү...',
  multiline = false,
  rows = 2,
  previewBlock = false,
  className = '',
  helpText,
  hidePreview = false,
  hideToolbar = false,
}) => {
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  // Own undo / redo (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z): the browser's own history is lost when the
  // value is set from outside, e.g. by the LaTeX buttons
  const history = useRef<{ past: string[]; future: string[]; last: number }>({ past: [], future: [], last: 0 });
  const change = (next: string, group = true) => {
    const h = history.current;
    const now = Date.now();
    // Typing in quick succession is one undo step
    if (!group || now - h.last > 700 || h.past.length === 0) h.past.push(value);
    if (h.past.length > 200) h.past.shift();
    h.future = [];
    h.last = group ? now : 0;
    onChange(next);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    // By the physical key, so it works with the Mongolian keyboard layout too
    const key = e.code === 'KeyZ' ? 'z' : e.code === 'KeyY' ? 'y' : e.key.toLowerCase();
    const h = history.current;
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      const prev = h.past.pop();
      if (prev === undefined) return;
      h.future.push(value);
      h.last = 0;
      onChange(prev);
    } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
      e.preventDefault();
      const next = h.future.pop();
      if (next === undefined) return;
      h.past.push(value);
      h.last = 0;
      onChange(next);
    }
  };

  // Insert LaTeX snippet at current cursor position
  const insertSnippet = (snippet: string) => {
    const input = inputRef.current;
    if (!input) {
      change(value ? `${value} ${snippet}` : snippet, false);
      return;
    }

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    // $: put dollar signs on both sides of the selected text (cursor between them if none is selected)
    if (snippet === WRAP) {
      const selected = value.substring(start, end);
      change(value.substring(0, start) + '$' + selected + '$' + value.substring(end), false);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + 1, start + 1 + selected.length);
      }, 10);
      return;
    }
    const before = value.substring(0, start);
    const after = value.substring(end);
    const newValue = before + snippet + after;

    change(newValue, false);

    setTimeout(() => {
      input.focus();
      const newPos = start + snippet.length;
      input.setSelectionRange(newPos, newPos);
    }, 10);
  };


  // The shared toolbar always uses this field's latest value
  const insertRef = useRef(insertSnippet);
  insertRef.current = insertSnippet;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-stone-800 flex items-center space-x-1.5">
          <span>{label}</span>
        </label>
        {helpText && <span className="text-[11px] text-stone-500">{helpText}</span>}
      </div>

      {/* LaTeX buttons, unless the editor shows one shared toolbar */}
      {!hideToolbar && <LatexToolbar onInsert={insertSnippet} centred={multiline} />}

      {/* Input or Textarea */}
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => change(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => (activeField = (snippet) => insertRef.current(snippet))}
          rows={rows}
          placeholder={placeholder}
          className="w-full text-xs md:text-sm font-mono p-2.5 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none leading-relaxed"
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={(e) => change(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => (activeField = (snippet) => insertRef.current(snippet))}
          placeholder={placeholder}
          className="w-full text-xs md:text-sm font-mono p-2 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
        />
      )}

      {/* Real-time Live LaTeX Preview Box */}
      {!hidePreview && (
      <div className="rounded-lg border border-amber-200/80 bg-amber-50/40 p-2.5 transition-all">
        <div className="flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1">
          <Eye className="w-3.5 h-3.5" />
          <span>Бодит үр дүн (LaTeX харагдац):</span>
        </div>
        <div className="min-h-[24px] text-xs md:text-sm text-stone-900 bg-white p-2 rounded border border-stone-200">
          {value.trim() ? (
            <MathRenderer content={value} block={previewBlock} />
          ) : (
            <span className="text-stone-400 italic text-xs">
              Текст эсвэл томьёо бичихэд энд математик тэмдэглэгээгээр шууд харагдана.
            </span>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
