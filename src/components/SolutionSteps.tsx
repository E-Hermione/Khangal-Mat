import React from 'react';
import { MathRenderer } from './MathRenderer';

/** Solution steps as a plain numbered list, one step per line, with the answer below them. */
export const SolutionSteps: React.FC<{ steps: string[]; answer?: string; indent?: boolean }> = ({
  steps,
  answer,
  indent = true,
}) => (
  <div className={`text-[15px] text-stone-700 print:text-black leading-relaxed ${indent ? 'md:pl-8' : ''}`}>
    {steps.length > 0 && (
      <ol className="space-y-1.5 border-l-2 border-amber-200 pl-4">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2">
            <span className="shrink-0 w-5 text-right text-stone-400 font-semibold tabular-nums">{i + 1}.</span>
            <div className="min-w-0 break-words">
              <MathRenderer content={step} className="inline" />
            </div>
          </li>
        ))}
      </ol>
    )}
    {answer && (
      <div className={`${steps.length ? 'mt-2.5' : ''} text-stone-800 print:text-black`}>
        <span className="font-bold text-stone-950">Хариу:</span> <MathRenderer content={answer} className="inline" />
      </div>
    )}
  </div>
);

/** A practice solution stored as text: one step per line. */
export const solutionLines = (solution?: string) =>
  (solution || '').split('\n').map((s) => s.trim()).filter(Boolean);
