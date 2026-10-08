import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
  block?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  content: rawContent,
  className = '',
  block = false,
}) => {
  // Empty lines and spaces before or after the text never add space
  const content = (rawContent || '').replace(/^\s+|\s+$/g, '');
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // If block is explicitly requested and content does not already have delimiters
    if (block && !content.includes('$')) {
      try {
        return katex.renderToString(content.trim(), {
          displayMode: true,
          throwOnError: false,
        });
      } catch {
        return escapeHtml(content);
      }
    }

    // Check if content contains LaTeX delimiters: $$...$$ or $...$ or \(...\) or \[...\]
    const hasMathDelimiters = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\(.+?\\\)|\\\[[\s\S]+?\\\]/.test(content);

    if (!hasMathDelimiters) {
      // Check if it looks like a pure LaTeX formula or mathematical expression
      // Contains typical LaTeX commands like \frac, \sqrt, \alpha, \pm, ^, _, \cdot, \begin, etc.
      const looksLikePureFormula = /\\(frac|sqrt|cdot|times|div|pm|mp|in|subset|sum|int|lim|alpha|beta|gamma|theta|pi|le|ge|neq|approx|mathbf|text|vec|angle|sin|cos|tan|cot|log|ln|infty|Delta|to|leftarrow|rightarrow|over|left|right|begin|pmatrix|cases)|[\^_{}]/.test(content);
      
      if (looksLikePureFormula) {
        try {
          const html = katex.renderToString(content.trim(), {
            displayMode: block,
            throwOnError: false,
            macros: block ? undefined : INLINE_MACROS,
          });
          return block ? html : `<span class="inline-math">${html}</span>`;
        } catch {
          return escapeHtml(content);
        }
      }
      return escapeHtml(content);
    }

    // Parse mixed text with math. Rendered formulas are swapped for placeholders so that turning
    // newlines into <br /> only touches the plain text (KaTeX's SVG paths contain newlines too).
    const rendered: string[] = [];
    const keep = (html: string) => `\u0000${rendered.push(html) - 1}\u0000`;
    const render = (math: string, displayMode: boolean) =>
      katex.renderToString(math.trim(), { displayMode, throwOnError: false, macros: displayMode ? undefined : INLINE_MACROS });

    // 1. Replace $$...$$ block math
    let processed = content.replace(/\$\$([\s\S]+?)\$\$/g, (whole, math) => {
      try {
        return keep(`<div class="my-2 overflow-x-auto print:overflow-visible flex justify-center">${render(math, true)}</div>`);
      } catch {
        return whole;
      }
    });

    // 2. Replace \[...\] block math
    processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (whole, math) => {
      try {
        return keep(`<div class="my-2 overflow-x-auto print:overflow-visible flex justify-center">${render(math, true)}</div>`);
      } catch {
        return whole;
      }
    });

    // 3. Replace $...$ inline math
    processed = processed.replace(/\$([^$\n]+?)\$/g, (whole, math) => {
      try {
        return keep(`<span class="inline-math px-0.5">${render(math, false)}</span>`);
      } catch {
        return whole;
      }
    });

    // 4. Replace \(...\) inline math
    processed = processed.replace(/\\\((.+?)\\\)/g, (whole, math) => {
      try {
        return keep(`<span class="inline-math px-0.5">${render(math, false)}</span>`);
      } catch {
        return whole;
      }
    });

    // Preserve newlines for plain paragraphs, then put the formulas back
    return processed
      .replace(/\n/g, '<br />')
      .replace(/\u0000(\d+)\u0000/g, (_, i) => rendered[Number(i)]);
  }, [content, block]);

  return (
    <div
      className={`math-content leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

// Fractions inside a line of text are drawn full height (\dfrac) with slightly smaller digits
// (see .inline-math in index.css), so 4/7 reads clearly instead of as tiny stacked digits
const INLINE_MACROS = { '\\frac': '\\dfrac' };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br />');
}
