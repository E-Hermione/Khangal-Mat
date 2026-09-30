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

  // Insert LaTeX snippet at current cursor position
  const insertSnippet = (snippet: string) => {
    const input = inputRef.current;
    if (!input) {
      onChange(value ? `${value} ${snippet}` : snippet);
      return;
    }

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const before = value.substring(0, start);
    const after = value.substring(end);
    const newValue = before + snippet + after;

    onChange(newValue);

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
    { label: 'α', snippet: '\\alpha ', desc: 'Альфа' },
    { label: 'β', snippet: '\\beta ', desc: 'Бета' },
    { label: 'Δ', snippet: '\\Delta ', desc: 'Дельта / Дискриминант' },
    { label: '∞', snippet: '\\infty ', desc: 'Хязгааргүй' },
    { label: '$...$', snippet: '$x$', desc: 'Томьёоны хаалт' },
    { label: '{...}', snippet: '\\begin{cases} x + y = 1 \\\\ x - y = 0 \\end{cases}', desc: 'Систем' },
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
      </div>

      {/* Input or Textarea */}
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full text-xs md:text-sm font-mono p-2.5 bg-white border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 outline-none leading-relaxed"
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
