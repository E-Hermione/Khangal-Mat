import React from 'react';
import { ArrowRight } from 'lucide-react';
import { MathRenderer } from './MathRenderer';

/** Solution steps as boxes, two per row joined by an arrow, with the answer below them. */
export const SolutionSteps: React.FC<{ steps: string[]; answer?: string; indent?: boolean }> = ({
  steps,
  answer,
  indent = true,
}) => (
  <>
    {steps.length > 0 && (
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 text-[15px] text-stone-700 print:text-black leading-relaxed ${
          indent ? 'md:pl-8' : ''
        }`}
      >
        {steps.map((step, i) => (
          <React.Fragment key={i}>
            {i % 2 === 1 && (
              <span className="self-center w-7 h-7 rounded-full border border-stone-200 bg-white flex items-center justify-center text-amber-700 shrink-0">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            )}
            <div className="min-w-0 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 flex items-center">
              <div className="min-w-0 break-words">
                <MathRenderer content={step} className="inline" />
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    )}
    {answer && (
      <div className={`mt-3 pl-[17px] text-[15px] text-stone-800 print:text-black ${indent ? 'md:pl-[49px]' : ''}`}>
        <span className="font-bold text-stone-950">Хариу:</span> <MathRenderer content={answer} className="inline" />
      </div>
    )}
  </>
);

/** A practice solution stored as text: one step per line. */
export const solutionLines = (solution?: string) =>
  (solution || '').split('\n').map((s) => s.trim()).filter(Boolean);
