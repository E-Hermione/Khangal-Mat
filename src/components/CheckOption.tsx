import React from 'react';
import { Check } from 'lucide-react';

/** A checkbox with its text; clicking anywhere on it, the text too, toggles it. */
export const CheckOption: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
  className?: string;
}> = ({ checked, onChange, label, disabled, className = '' }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 whitespace-nowrap cursor-pointer select-none disabled:opacity-40 disabled:cursor-default ${className}`}
  >
    <span
      className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 ${
        checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-stone-400'
      }`}
    >
      {checked && <Check className="w-3 h-3" strokeWidth={3} />}
    </span>
    {label}
  </button>
);
