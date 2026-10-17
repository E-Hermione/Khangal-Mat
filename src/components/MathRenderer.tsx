import React, { useMemo } from 'react';
import katex from 'katex';
import { braceArgs, colDiv, colMul, eqPair, expandBracket, numberLine, partLine, placeTable, proportion } from './columnOps';

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
    const hasLongDiv = /\\(longdiv|colmul|coldiv|proportion|expandbr|placetable|numline|partline|eqpair)\{/.test(content);
    if (block && !content.includes('$') && !hasLongDiv) {
      const columns = columnSums(content);
      if (columns) return columns;
      try {
        return katex.renderToString(content.trim(), {
          displayMode: true,
          throwOnError: false,
          macros: { ...DRAW_MACROS },
          trust: drawTrust, strict: 'ignore' as const,
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
      
      // A line with words (Mongolian letters) is text, even with __italic__ or a _ in it
      if (looksLikePureFormula && !/[А-Яа-яЁёӨөҮү]/.test(content)) {
        try {
          const html = katex.renderToString(content.trim(), {
            displayMode: block,
            throwOnError: false,
            macros: block ? { ...DRAW_MACROS } : { ...INLINE_MACROS, ...DRAW_MACROS },
            trust: drawTrust, strict: 'ignore' as const,
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
      katex.renderToString(math.trim(), { displayMode, throwOnError: false, macros: displayMode ? { ...DRAW_MACROS } : { ...INLINE_MACROS, ...DRAW_MACROS }, trust: drawTrust, strict: 'ignore' as const });

    // 0. Division with a remainder, written out in columns: \longdiv{23}{5}, and the older
    //    "$23 : 5 = 4$, үлдэгдэл $3$" sentences (only when the numbers add up)
    //    It always stands centred on its own line; the dollars around it are taken with it,
    //    or a lone leftover $ pair would turn the placeholder into a red KaTeX error.
    let processed0 = content.replace(/(\$\$|\$)?\s*\\longdiv\{\s*(\d+)\s*\}\{\s*(\d+)\s*\}\s*(\$\$|\$)?/g, (whole, open, a, b) =>
      Number(b) > 0
        ? keep(centred(longDivision(Number(a), Number(b)))) + BLOCK
        : whole
    );
    // Decimal multiplication and division in columns: \colmul{57,46}{24}, \coldiv{1,3}{2,5}
    processed0 = processed0.replace(
      /(\$\$|\$)?\s*\\(colmul|coldiv)\{\s*([\d.,]+)\s*\}\{\s*([\d.,]+)\s*\}\s*(\$\$|\$)?/g,
      (whole, open, op, a, b) => {
        try {
          const html = op === 'colmul' ? colMul(a, b) : colDiv(a, b);
          return keep(centred(html)) + BLOCK;
        } catch {
          return whole;
        }
      }
    );
    // Opening a bracket, drawn with coloured lines from the factor to each term: \expandbr{4}{x}{+}{3}.
    // The rest of the same formula is set around it.
    processed0 = replaceExpandBrackets(processed0, (html, display) =>
      keep(display ? `<div class="my-2 flex justify-center">${html}</div>` : html)
    );
    // Number lines: the distance of each point from 0, $$\numline{-4}{4}{-2;3}$$, or a number's
    // whole and fractional part, $$\partline{-4}{4}{-3,4;1,23}$$
    processed0 = processed0.replace(/(\$\$|\$)\s*\\(numline|partline)([^$]*?)\s*(\$\$|\$)/g, (whole, open, kind, body) => {
      const parsed = braceArgs(body, 3);
      const html = parsed && (kind === 'numline' ? numberLine(parsed.args) : partLine(parsed.args));
      if (!html) return whole;
      return keep(open === '$$' ? `<div class="my-2 overflow-x-auto scrollbar-none"><div class="w-max mx-auto">${html}</div></div>` : html);
    });
    // A table of headings over values in a rounded frame: $$\placetable{Мянгат;Зуут}{2;3}$$
    processed0 = processed0.replace(/(\$\$|\$)\s*\\placetable([^$]*?)\s*(\$\$|\$)/g, (whole, open, body) => {
      const parsed = braceArgs(body, 2);
      if (!parsed) return whole;
      // a cell with words is set as plain text, otherwise as a formula
      const tex = (s: string) =>
        !s ? '' : /[А-Яа-яЁёӨөҮү]/.test(s) ? s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!) : katex.renderToString(s, { throwOnError: false });
      const html = placeTable(parsed.args, tex);
      return keep(open === '$$' ? `<div class="my-2 overflow-x-auto scrollbar-none"><div class="w-max mx-auto">${html}</div></div>` : html);
    });
    // Two equations solved side by side in small cards: $$\eqpair{x + 7 = 10; …}{3 + x = 8; …}$$
    processed0 = processed0.replace(/(\$\$|\$)\s*\\eqpair([^$]*?)\s*(\$\$|\$)/g, (whole, _open, body) => {
      const parsed = braceArgs(body, 2);
      if (!parsed) return whole;
      return keep(eqPair(parsed.args, (m) => katex.renderToString(m, { throwOnError: false })));
    });
    // A proportion with its outer and middle terms joined by coloured lines: \proportion{x}{12}{5}{4}
    processed0 = replaceProportions(processed0, (html, display) =>
      keep(display ? `<div class="my-2 flex justify-center">${html}</div>` : html)
    );
    processed0 = processed0.replace(
      /\$\s*(\d+)\s*(?::|\\div)\s*(\d+)\s*=\s*(\d+)\s*\$\s*,?\s*\(?\s*үлдэгдэл\s*\$\s*(\d+)\s*\$\s*\)?\.?/g,
      (whole, a, b, q, r) => {
        const [A, B, Q, R] = [a, b, q, r].map(Number);
        return B > 0 && Q === Math.floor(A / B) && R === A % B ? keep(centred(longDivision(A, B))) + BLOCK : whole;
      }
    );
    // Around a centred working: no space or line break before it, and the words after it start their
    // own line without a leading space, comma or $\\qquad$ gap, with a capital letter
    processed0 = processed0
      .replace(/[ \t]*\n?[ \t]*(\u0000\d+\u0000\u0001)/g, '$1')
      .replace(/\u0001(?:[ \t]*\n)?[ \t]*(?:[,;.:][ \t]*)?(?:\$\s*(?:\\q?quad\s*)+\$[ \t]*)?(\S?)/g, (_, c: string) => c.toUpperCase());

    // 1. Replace $$...$$ block math
    let processed = processed0.replace(/\$\$([\s\S]+?)\$\$/g, (whole, math) => {
      const columns = columnSums(math);
      if (columns) return keep(`<div class="my-2 flex justify-center">${columns}</div>`);
      try {
        // A chain of equalities may break onto the next line at its = signs when it is too wide
        const parts = chainParts(math);
        if (parts) {
          const piece = (t: string) =>
            katex.renderToString('\\displaystyle ' + t, { throwOnError: false, macros: { ...DRAW_MACROS }, trust: drawTrust, strict: 'ignore' as const });
          return keep(
            `<div class="my-2 flex flex-wrap justify-center items-baseline gap-y-1 print:flex-nowrap">${parts.map((t) => `<span class="max-w-full">${piece(t)}</span>`).join('')}</div>`
          );
        }
        return keep(`<div class="my-2 overflow-x-auto overflow-y-hidden scrollbar-none print:overflow-visible flex justify-center">${render(math, true)}</div>`);
      } catch {
        return whole;
      }
    });

    // 2. Replace \[...\] block math
    processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (whole, math) => {
      try {
        // A chain of equalities may break onto the next line at its = signs when it is too wide
        const parts = chainParts(math);
        if (parts) {
          const piece = (t: string) =>
            katex.renderToString('\\displaystyle ' + t, { throwOnError: false, macros: { ...DRAW_MACROS }, trust: drawTrust, strict: 'ignore' as const });
          return keep(
            `<div class="my-2 flex flex-wrap justify-center items-baseline gap-y-1 print:flex-nowrap">${parts.map((t) => `<span class="max-w-full">${piece(t)}</span>`).join('')}</div>`
          );
        }
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

/** Swaps each \proportion{a}{b}{c}{d} (with the $$ or $ around it, if any) for its drawing. */
function replaceExpandBrackets(text: string, put: (html: string, display: boolean) => string): string {
  return text.replace(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g, (whole, block, inline) => {
    const math: string = block ?? inline;
    if (!math.includes('\\expandbr{')) return whole;
    const display = block !== undefined;
    // A piece cut at a drawn bracket keeps its + and − as operations ({} on the open side)
    const tex = (s: string) => {
      let t = s.trim();
      if (!t) return '';
      if (/^[+\-=]/.test(t)) t = '{}' + t;
      if (/[+\-=]$/.test(t)) t += '{}';
      return katex.renderToString((display ? '\\displaystyle ' : '') + t, { throwOnError: false, macros: { ...INLINE_MACROS, ...DRAW_MACROS }, trust: drawTrust, strict: 'ignore' as const });
    };
    let html = '';
    let rest = math;
    for (;;) {
      const at = rest.indexOf('\\expandbr{');
      if (at < 0) break;
      const parsed = braceArgs(rest.slice(at + '\\expandbr'.length), 4);
      if (!parsed) return whole;
      html += tex(rest.slice(0, at)) + expandBracket(parsed.args, tex);
      rest = rest.slice(at + '\\expandbr'.length + parsed.end);
    }
    return put(`<span class="expand-row">${html + tex(rest)}</span>`, display);
  });
}

function replaceProportions(text: string, put: (html: string, display: boolean) => string): string {
  let out = '';
  let rest = text;
  for (;;) {
    const at = rest.indexOf('\\proportion{');
    if (at < 0) return out + rest;
    const parsed = braceArgs(rest.slice(at + '\\proportion'.length), 4);
    if (!parsed) return out + rest;
    let before = rest.slice(0, at);
    let after = rest.slice(at + '\\proportion'.length + parsed.end);
    const open = /(\$\$|\$)\s*$/.exec(before);
    const close = open && new RegExp(`^\\s*${open[1].replace(/\$/g, '\\$')}`).exec(after);
    if (open && close) {
      before = before.slice(0, open.index);
      after = after.slice(close[0].length);
    }
    const tex = (s: string) => katex.renderToString(s.trim(), { throwOnError: false, macros: INLINE_MACROS });
    out += before + put(proportion(parsed.args, tex), open?.[1] === '$$');
    rest = after;
  }
}

// Fractions inside a line of text are drawn full height (\dfrac) with slightly smaller digits
// (see .inline-math in index.css), so 4/7 reads clearly instead of as tiny stacked digits
/** «a = b = c» split before each = that stands outside braces, brackets and environments; null when there is no such = */
function chainParts(math: string): string[] | null {
  if (/\\begin\{(?:aligned|cases|align|gather)|&|\\\\(?![\[])/.test(math.replace(/\\begin\{array\}[\s\S]*?\\end\{array\}/g, ''))) return null;
  const out: string[] = [];
  let depth = 0, env = 0, lr = 0, start = 0;
  for (let i = 0; i < math.length; i++) {
    const c = math[i];
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+)/.exec(math.slice(i));
      if (m) {
        if (m[1] === 'begin') env++;
        else if (m[1] === 'end') env--;
        else if (m[1] === 'left') lr++;
        else if (m[1] === 'right') lr--;
        i += m[0].length - 1;
      } else i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '=' && depth === 0 && env === 0 && lr === 0 && i > start) {
      out.push(math.slice(start, i).trim());
      start = i;
    }
  }
  out.push(math.slice(start).trim());
  // the pieces after the first start with = ; a {} keeps the space before it
  return out.length > 1 && out.every(Boolean) ? out.map((t, k) => (k ? '{}' + t : t)) : null;
}

const INLINE_MACROS = { '\\frac': '\\dfrac' };
// Thin lines drawn with CSS (see .fk and .xm in index.css), so they are all equally thick and meet in one point:
// \fk is the half triangle under a denominator split into factors, \xm{3} the multiplier written over a fraction
const DRAW_MACROS = { '\\fk': '\\htmlClass{fk}{\\rule{0pt}{0.45em}}', '\\xm': '\\htmlClass{xm}{#1}' };
const drawTrust = (c: { command: string }) => c.command === '\\htmlClass';

// Working in columns always stands centred on its own line; the words after it start a new line
const centred = (html: string) => `<div class="co-wrap my-2 flex justify-center">${html}</div>`;
// Marks a placeholder as a centred working (see the clean up around it)
const BLOCK = '\u0001';

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

// **word** in the plain text is shown bold, __word__ italic
function bold(html: string): string {
  return html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>').replace(/__([^_\n]+?)__/g, '<em class="font-semibold">$1</em>');
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
