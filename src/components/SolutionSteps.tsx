import React from 'react';
import { MathRenderer } from './MathRenderer';

// A step that is only a formula (or a column division) stands centred on its own line
const formulaOnly = (step: string): string | null => {
  const s = step.trim();
  if (/^\\longdiv\{[^}]*\}\{[^}]*\}$/.test(s)) return s;
  if (/^\$\$[\s\S]+\$\$$/.test(s)) return s;
  const m = s.match(/^\$([^$]+)\$[.,;]?$/);
  return m ? `$$${m[1]}$$` : null;
};

/**
 * A worked solution written out like the lesson's theory: each step a sentence of its own, and a
 * step that is just a formula centred on its line; the answer below.
 */
export const SolutionSteps: React.FC<{ steps: string[]; answer?: string; indent?: boolean; tail?: React.ReactNode }> = ({
  steps,
  answer,
  indent = true,
  tail,
}) => (
  <div className={`text-[15px] text-stone-700 print:text-black leading-relaxed space-y-1.5 ${indent ? 'md:pl-8' : ''}`}>
    {steps.map((step, i) => {
      const formula = formulaOnly(step);
      // `tail` (e.g. the «Зөв хариу» button) goes at the end of the last step
      const end = i === steps.length - 1 ? tail : null;
      return formula ? (
        <div key={i} className="flow-root">
          <div className="flex justify-center py-0.5">
            <MathRenderer content={formula} />
          </div>
          {end}
        </div>
      ) : (
        <div key={i} className="break-words flow-root">
          <MathRenderer content={step} className="inline" />
          {end}
        </div>
      );
    })}
    {!steps.length && tail && <div className="flow-root">{tail}</div>}
    {answer && (
      <div className="pt-1 text-stone-800 print:text-black">
        <span className="font-bold text-stone-950">Хариу:</span> <MathRenderer content={answer} className="inline" />
      </div>
    )}
  </div>
);

/** A solution stored as text: one step per line. */
export const solutionLines = (solution?: string) =>
  (solution || '').split('\n').map((s) => s.trim()).filter(Boolean);
