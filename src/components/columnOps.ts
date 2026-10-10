/**
 * Decimal multiplication and division written in columns, the way the textbook does them.
 *
 *   \colmul{57,46}{24}   →   57,46        the factors right-aligned, multiplied as natural numbers:
 *                          ×    24        one row per digit of the lower factor, each shifted one
 *                           ‾‾‾‾‾‾‾       place further left, then added; the comma of the product
 *                            22984        is counted from the right (as many places as both
 *                          + 11492        factors have after their commas together)
 *                           ‾‾‾‾‾‾‾
 *                           1379,04
 *
 *   \coldiv{1,3}{2,5}    →   both commas move right until the divisor is a natural number (the old
 *                            comma struck out in grey, the new one red), then the usual long division
 *                            in steps; zeros written on to the end of the dividend are shown in grey.
 *
 * Digits sit one per cell so that the rows line up by place; a comma rides on the right edge of
 * its digit's cell and takes no width. Fractional digits are blue and commas red.
 */

const COMMA = '<span class="co-comma">,</span>';
const OLD_COMMA = '<span class="co-comma co-old">,</span>';

type Cell = { text: string; cls?: string };

function parse(s: string): { digits: string; places: number } {
  const t = s.replace(/\{,\}|\./g, ',').replace(/\s/g, '');
  if (!/^\d+(,\d+)?$/.test(t)) throw new Error(`bad number ${s}`);
  const [w, f = ''] = t.split(',');
  return { digits: w + f, places: f.length };
}

/** a number's cells: its digits with the comma after the (len - places)th, fractional digits blue */
function numberCells(digits: string, places: number, blue = true): Cell[] {
  return digits.split('').map((d, i) => {
    const frac = i >= digits.length - places;
    const comma = places > 0 && i === digits.length - places - 1;
    return { text: d + (comma ? COMMA : ''), cls: frac && blue ? 'co-frac' : undefined };
  });
}

function row(width: number, cells: Cell[], end: number, sign = '', rowCls = '', signLeft = false): string {
  // cells end at column `end` (0-based digit column); column -1 is the sign column. The sign stands
  // just before the first cell, or in the sign column when signLeft
  const out: string[] = [];
  const start = end - cells.length + 1;
  for (let c = -1; c < width; c++) {
    if (sign && c === (signLeft ? -1 : start - 1)) out.push(`<td class="co-sign">${sign}</td>`);
    else if (c >= start && c <= end) {
      const x = cells[c - start];
      out.push(`<td class="co-d${x.cls ? ' ' + x.cls : ''}${rowCls ? ' ' + rowCls : ''}">${x.text}</td>`);
    } else out.push('<td></td>');
  }
  return out.join('');
}

export function colMul(aText: string, bText: string): string {
  const a = parse(aText);
  const b = parse(bText);
  const A = BigInt(a.digits);
  const B = BigInt(b.digits);
  const places = a.places + b.places;
  // one partial product per digit of the lower factor (zeros skipped, their shift kept)
  const partials: { value: string; shift: number }[] = [];
  const bd = String(B);
  for (let i = 0; i < bd.length; i++) {
    const d = BigInt(bd[bd.length - 1 - i]);
    if (d !== 0n) partials.push({ value: String(A * d), shift: i });
  }
  let product = String(A * B);
  if (product.length <= places) product = product.padStart(places + 1, '0');
  const width = Math.max(
    a.digits.length,
    b.digits.length,
    product.length,
    ...partials.map((p) => p.value.length + p.shift)
  );
  const last = width - 1;
  const rows: string[] = [];
  rows.push(`<tr>${row(width, numberCells(a.digits, a.places), last)}</tr>`);
  rows.push(`<tr class="co-line">${row(width, numberCells(b.digits, b.places), last, '<span class="co-up">×</span>', '', true)}</tr>`);
  if (partials.length > 1) {
    partials.forEach((p, i) => {
      const cells = p.value.split('').map((d) => ({ text: d }));
      const cls = i === partials.length - 1 ? ' class="co-line"' : '';
      rows.push(`<tr${cls}>${row(width, cells, last - p.shift, i === 1 ? '<span class="co-up">+</span>' : '', '', true)}</tr>`);
    });
  }
  rows.push(`<tr class="co-result">${row(width, numberCells(product, places), last)}</tr>`);
  return `<span class="col-op col-mul" title="${aText} · ${bText}"><table><tbody>${rows.join('')}</tbody></table></span>`;
}

export function colDiv(aText: string, bText: string): string {
  const a = parse(aText);
  const b = parse(bText);
  const shift = b.places;
  // the dividend's digits after the commas moved: zeros added when it has fewer places than the divisor
  let digits = a.digits;
  let added = 0;
  if (a.places < shift) {
    added = shift - a.places;
    digits += '0'.repeat(added);
  }
  const intDigits = digits.length - Math.max(a.places - shift, 0);
  const D = BigInt(b.digits);
  if (D === 0n) throw new Error('division by zero');
  // long division, writing zeros on to the end while there is a remainder (at most 8)
  const q: number[] = [];
  const steps: { col: number; take: bigint; product: bigint; rest: bigint }[] = [];
  let cur = 0n;
  let j = 0;
  for (; ; j++) {
    if (j >= digits.length) {
      if ((cur === 0n && j >= intDigits) || added > 8 + shift) break;
      digits += '0';
      added++;
    }
    cur = cur * 10n + BigInt(digits[j]);
    const d = cur / D;
    q.push(Number(d));
    if (d > 0n) steps.push({ col: j, take: cur, product: d * D, rest: cur - d * D });
    cur -= d * D;
  }
  const lastCol = j - 1;
  // quotient: integer part without leading zeros, then the fractional digits without trailing zeros
  const qInt = q.slice(0, intDigits).join('').replace(/^0+(?=\d)/, '') || '0';
  const qFrac = q.slice(intDigits).join('').replace(/0+$/, '');
  const quotient = qInt + (qFrac ? COMMA + `<span class="co-frac">${qFrac}</span>` : '');
  const width = Math.max(digits.length, lastCol + 1);

  // top row: the dividend as written, the commas shown before and after moving
  const top: Cell[] = digits.split('').map((d, i) => {
    let text = d;
    const origComma = a.places > 0 && i === a.digits.length - a.places - 1;
    const newComma = i === intDigits - 1 && intDigits < digits.length;
    if (origComma && !newComma) text += OLD_COMMA;
    if (newComma) text += COMMA;
    return { text, cls: i >= a.digits.length ? 'co-added' : undefined };
  });
  const divisor =
    b.places > 0
      ? b.digits
          .split('')
          .map((d, i) => {
            const lead = i < b.digits.length - String(D).length;
            const comma = i === b.digits.length - b.places - 1 ? OLD_COMMA : '';
            return `<span class="${lead ? 'co-old' : ''}">${d}</span>${comma}`;
          })
          .join('')
      : b.digits;

  const rows: string[] = [];
  const cells = (n: bigint) => String(n).split('').map((d) => ({ text: d }));
  rows.push(`<tr>${row(width, top, width - 1, '−', '', true)}<td class="co-divisor">${divisor}</td></tr>`);
  steps.forEach((s, i) => {
    rows.push(
      `<tr>${row(width, cells(s.product), s.col, '', 'co-under')}${i === 0 ? `<td class="co-quot">${quotient}</td>` : '<td></td>'}</tr>`
    );
    const next = steps[i + 1];
    if (next) {
      rows.push(`<tr>${row(width, cells(next.take), next.col, '−')}<td></td></tr>`);
    } else {
      rows.push(`<tr>${row(width, cells(s.rest), s.col, '', 'co-rest')}<td></td></tr>`);
    }
  });
  if (!steps.length) rows.push(`<tr>${row(width, [{ text: '0' }], width - 1)}<td class="co-quot">0</td></tr>`);
  return `<span class="col-op col-div" title="${aText} : ${bText}"><table><tbody>${rows.join('')}</tbody></table></span>`;
}
