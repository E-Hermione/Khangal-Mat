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
    const hasLongDiv = content.includes('\\longdiv');
    if (block && !content.includes('$') && !hasLongDiv) {
      const columns = columnSums(content);
      if (columns) return columns;
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

    if (!hasMathDelimiters && !hasLongDiv) {
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
      return bold(escapeHtml(content));
    }

    // Parse mixed text with math. Rendered formulas are swapped for placeholders so that turning
    // newlines into <br /> only touches the plain text (KaTeX's SVG paths contain newlines too).
    const rendered: string[] = [];
    const keep = (html: string) => `\u0000${rendered.push(html) - 1}\u0000`;
    const render = (math: string, displayMode: boolean) =>
      katex.renderToString(math.trim(), { displayMode, throwOnError: false, macros: displayMode ? undefined : INLINE_MACROS });

    // 0. Division with a remainder, written out in columns: \longdiv{23}{5}, and the older
    //    "$23 : 5 = 4$, үлдэгдэл $3$" sentences (only when the numbers add up)
    //    Wrapped in $$…$$ it stands centred on its own line; the dollars are taken with it either way,
    //    or a lone leftover $ pair would turn the placeholder into a red KaTeX error.
    let processed0 = content.replace(/(\$\$|\$)?\s*\\longdiv\{\s*(\d+)\s*\}\{\s*(\d+)\s*\}\s*(\$\$|\$)?/g, (whole, open, a, b) =>
      Number(b) > 0
        ? keep(open === '$$' ? `<div class="my-2 flex justify-center">${longDivision(Number(a), Number(b))}</div>` : longDivision(Number(a), Number(b)))
        : whole
    );
    processed0 = processed0.replace(
      /\$\s*(\d+)\s*(?::|\\div)\s*(\d+)\s*=\s*(\d+)\s*\$\s*,?\s*\(?\s*үлдэгдэл\s*\$\s*(\d+)\s*\$\s*\)?\.?/g,
      (whole, a, b, q, r) => {
        const [A, B, Q, R] = [a, b, q, r].map(Number);
        return B > 0 && Q === Math.floor(A / B) && R === A % B ? keep(longDivision(A, B)) : whole;
      }
    );

    // 1. Replace $$...$$ block math
    let processed = processed0.replace(/\$\$([\s\S]+?)\$\$/g, (whole, math) => {
      const columns = columnSums(math);
      if (columns) return keep(`<div class="my-2 flex justify-center">${columns}</div>`);
      try {
        return keep(`<div class="my-2 overflow-x-auto overflow-y-hidden scrollbar-none print:overflow-visible flex justify-center">${render(math, true)}</div>`);
      } catch {
        return whole;
      }
    });

    // 2. Replace \[...\] block math
    processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (whole, math) => {
      try {
        return keep(`<div class="my-2 overflow-x-auto overflow-y-hidden scrollbar-none print:overflow-visible flex justify-center">${render(math, true)}</div>`);
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
    return bold(processed)
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

/**
 * Division in columns, as taught in school:
 *   −23 | 5
 *        ‾‾
 *    20   4  ногд
 *    ‾‾
 *     3  үлд
 */
function longDivision(a: number, b: number): string {
  const q = Math.floor(a / b);
  const num = (n: number | string) => katex.renderToString(String(n), { throwOnError: false });
  return (
    `<span class="long-division" title="${a} : ${b} = ${q}, үлдэгдэл ${a % b}"><table><tbody>` +
    `<tr><td class="ld-minus" rowspan="2">${num('-')}</td><td class="ld-num">${num(a)}</td>` +
    `<td class="ld-div">${num(b)}</td><td></td></tr>` +
    `<tr><td class="ld-num ld-under">${num(b * q)}</td><td class="ld-q">${num(q)}</td><td class="ld-label ld-q">ногд</td></tr>` +
    `<tr><td></td><td class="ld-num ld-r">${num(a % b)}</td><td class="ld-label ld-r" colspan="2">үлд</td></tr>` +
    `</tbody></table></span>`
  );
}

/**
 * Addition and subtraction in columns, written as
 *   \begin{array}{r} 3{,}60 \\ +\;\; 2{,}45 \\ \hline 6{,}05 \end{array}
 * is drawn as at school: the sign to the left, halfway between the two numbers, and the line only
 * as wide as the numbers. A formula made only of such sums (side by side) becomes their HTML;
 * anything else returns null and is left to KaTeX.
 */
const COLUMN_SUM = /\\begin\{array\}\{r\}\s*([^\\]*?(?:\\(?!\\)[^\\]*?)*?)\s*\\\\\s*([+\-−])\s*(?:\\[;,: ]\s*)*([^\\]*?(?:\\(?!\\)[^\\]*?)*?)\s*\\\\\s*\\hline\s*([\s\S]*?)\s*\\end\{array\}/g;

function columnSums(math: string): string | null {
  const parts: string[] = [];
  const rest = math.replace(COLUMN_SUM, (_, a, op, b, r) => {
    parts.push(columnSum(a, op, b, r));
    return '';
  });
  if (!parts.length || rest.replace(/\\qquad|\\quad|\s/g, '') !== '') return null;
  return parts.join('<span class="column-gap"></span>');
}

function columnSum(a: string, op: string, b: string, r: string): string {
  const tex = (x: string) => katex.renderToString(x.trim(), { throwOnError: false });
  return (
    `<span class="column-sum"><table><tbody>` +
    `<tr><td class="cs-op" rowspan="2">${tex(op === '−' ? '-' : op)}</td><td class="cs-num">${tex(a)}</td></tr>` +
    `<tr><td class="cs-num">${tex(b)}</td></tr>` +
    `<tr><td></td><td class="cs-num cs-result">${tex(r)}</td></tr>` +
    `</tbody></table></span>`
  );
}

// **word** in the plain text is shown bold
function bold(html: string): string {
  return html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br />');
}
