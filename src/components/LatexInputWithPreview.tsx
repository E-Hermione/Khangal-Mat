import React, { useRef } from 'react';
import { MathRenderer } from './MathRenderer';
import { Eye, Sparkles } from 'lucide-react';

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
}

// Toolbar marker for a tab-wide space
const TAB = '<tab>';

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
    // A tab-wide space: inside a formula as is, in plain text wrapped as a formula
    if (snippet === TAB) {
      const insideMath = (value.substring(0, start).match(/\$/g) || []).length % 2 === 1;
      snippet = insideMath ? '\\qquad ' : '$\\qquad$';
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

  const mathSnippets = [
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
    { label: 'Таб', snippet: TAB, desc: 'Таб шиг зай авах' },
    { label: '→', snippet: ' \\;\\rightarrow\\; ', desc: 'Сум' },
    { label: '↔', snippet: ' \\;\\leftrightarrow\\; ', desc: 'Хоёр тийш сум' },
  ];

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-stone-800 flex items-center space-x-1.5">
          <span>{label}</span>
        </label>
        {helpText && <span className="text-[11px] text-stone-500">{helpText}</span>}
      </div>

      {/* Math quick insert helper toolbar */}
      <div className="flex items-center flex-wrap gap-1 bg-stone-100 p-1.5 rounded-lg border border-stone-200">
        <span className="text-[10px] uppercase font-bold text-stone-500 flex items-center gap-1 pl-1 pr-1.5">
          <Sparkles className="w-3 h-3 text-amber-600" />
          <span>LaTeX:</span>
        </span>
        {mathSnippets.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => insertSnippet(item.snippet)}
            title={item.desc}
            className="px-1.5 py-0.5 text-[11px] font-mono font-bold bg-white hover:bg-amber-100 text-stone-800 hover:text-amber-950 border border-stone-300 rounded shadow-2xs transition-colors cursor-pointer"
          >
            {item.label}
          </button>
        ))}
        {/* Multi-line text: a centred formula on its own line */}
        {multiline && (
          <>
            <button
              type="button"
              onClick={() => insertSnippet('\n$$ x $$\n')}
              title="Мөрийн голд томьёо оруулах (доор нь үргэлжлүүлэн бичнэ)"
              className="px-1.5 py-0.5 text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded shadow-2xs cursor-pointer"
            >
              Голд томьёо
            </button>
          </>
        )}
      </div>

      {/* Input or Textarea */}
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => change(e.target.value)}
          onKeyDown={onKeyDown}
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
          placeholder={placeholder}
          className="w-full text-xs md:text-sm font-mono p-2 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none"
        />
      )}

      {/* Real-time Live LaTeX Preview Box */}
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
    </div>
  );
};
