/**
 * Compares a student's typed answer with a stored answer written in LaTeX.
 * Numbers are compared by value, so 0.5, 1/2 and ½ all match $\frac{1}{2}$, and 2 1/3 matches $2\frac{1}{3}$.
 * When the answer has several values ("$3$ ба $-3$"), all of them must be given, in any order.
 * Words like units ("см", "төгрөг") may be left out.
 */

type Frac = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const norm = (f: Frac): Frac => {
  if (f.d < 0n) f = { n: -f.n, d: -f.d };
  const g = gcd(f.n, f.d) || 1n;
  return { n: f.n / g, d: f.d / g };
};
const key = (f: Frac) => `${f.n}/${f.d}`;

/** LaTeX → plain text a student would type */
function plain(s: string): string {
  let t = s
    .replace(/\$/g, ' ')
    .replace(/\\left|\\right|\\displaystyle|\\,|\\;|\\!|\\quad|\\qquad|~/g, ' ')
    .replace(/\\text\{([^}]*)\}/g, ' $1 ')
    .replace(/\{,\}/g, '.')
    .replace(/\\cdot|\\times|·|×/g, '*')
    .replace(/[−–]/g, '-')
    .replace(/\\%/g, '%');
  // mixed numbers and fractions: 2\frac{1}{3} → 2 1/3, \frac{a}{b} → a/b
  for (let i = 0; i < 3; i++) t = t.replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, ' ($1)/($2) ');
  t = t.replace(/\(\s*(-?\d+(?:\.\d+)?)\s*\)/g, '$1');
  return t.replace(/[{}]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** A plain number: 12, -3.5, 2/3, 2 1/3, -1 3/4 */
function parseNumber(s: string): Frac | null {
  s = s.trim().replace(/\s+/g, ' ').replace(/,/g, '.');
  let m = s.match(/^(-?)(\d+) (\d+)\/(\d+)$/);
  if (m) {
    const w = BigInt(m[2]), a = BigInt(m[3]), b = BigInt(m[4]);
    if (b === 0n) return null;
    const v = norm({ n: w * b + a, d: b });
    return m[1] ? { n: -v.n, d: v.d } : v;
  }
  m = s.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (m) {
    const a = parseNumber(m[1]), b = parseNumber(m[2]);
    if (!a || !b || b.n === 0n) return null;
    return norm({ n: a.n * b.d, d: a.d * b.n });
  }
  m = s.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (m) {
    const frac = m[3] || '';
    const v = norm({ n: BigInt(m[2] + frac), d: 10n ** BigInt(frac.length) });
    return m[1] ? { n: -v.n, d: v.d } : v;
  }
  return null;
}

/** The numbers in a text, in order (each as a value) */
function numbersIn(s: string): string[] {
  const out: string[] = [];
  const re = /-?\d+(?:\.\d+)?(?: \d+\/\d+|\s*\/\s*-?\d+(?:\.\d+)?)?/g;
  for (const m of s.replace(/(\d)\s+(?=\d{3}\b)/g, '$1').matchAll(re)) {
    const v = parseNumber(m[0].replace(/\s*\/\s*/, '/'));
    if (v) out.push(key(v));
  }
  return out;
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-zа-яөүё0-9%<>=+\-*/^.]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** true: right, false: wrong, null: the stored answer cannot be checked automatically */
export function checkAnswer(typed: string, stored: string): boolean | null {
  if (!typed.trim() || !stored.trim()) return null;
  // "x = 5" and "5" are the same answer
  const unvar = (t: string) => t.replace(/^[a-zA-Z](?:_\{?\d\}?)?\s*=\s*(?=[-\d(])/, '');
  const a = unvar(plain(stored));
  const b = unvar(plain(typed.replace(/½/g, '1/2')));
  // Same text after clean up (also covers words like "Анхны тоо")
  if (words(a) === words(b)) return true;
  const na = numbersIn(a);
  if (na.length === 0) return words(a).replace(/\s/g, '') === words(b).replace(/\s/g, '');
  const nb = numbersIn(b);
  // Answers with letters as well as numbers (expressions such as 3x + 2) are compared as text
  if (/[a-z]/i.test(a.replace(/\\[a-z]+/gi, ''))) return words(a).replace(/\s/g, '') === words(b).replace(/\s/g, '');
  if (na.length !== nb.length) return false;
  return [...na].sort().join('|') === [...nb].sort().join('|');
}
