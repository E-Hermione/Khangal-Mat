import React from 'react';

const TONES = {
  sky: 'bg-sky-100 text-sky-700',
  violet: 'bg-violet-100 text-violet-700',
  emerald: 'bg-emerald-100 text-emerald-700',
} as const;

/** Heading of a lesson part (theory, examples, exercises): an icon, a title and a short note. */
export const LessonSectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  tone: keyof typeof TONES;
  children?: React.ReactNode;
}> = ({ icon, title, subtitle, tone, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 mb-5 print:mb-3 print:pb-1 print:border-b print:border-black">
    <div className="flex items-center gap-3">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 print:hidden ${TONES[tone]}`}>{icon}</span>
      <div>
        <h2 className="text-xl font-black text-stone-900 tracking-tight print:text-lg print:text-black">{title}</h2>
        {subtitle && <p className="text-xs text-stone-500 print:text-stone-700">{subtitle}</p>}
      </div>
    </div>
    {children && <div className="flex items-center gap-2 no-print">{children}</div>}
  </div>
);
