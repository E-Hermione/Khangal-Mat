import React from 'react';

/**
 * Heading of a lesson part (theory, examples, exercises). On screen the lesson tabs name the part,
 * so only its buttons show here; the title is for printing, where all parts come one after another.
 */
export const LessonSectionHeader: React.FC<{
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  tone?: string;
  children?: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <>
    <div className="hidden print:block mb-3 pb-1 border-b border-black">
      <h2 className="text-lg font-black text-black">{title}</h2>
      {subtitle && <p className="text-xs text-stone-700">{subtitle}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center justify-end gap-2 mb-4 no-print">{children}</div>}
  </>
);
