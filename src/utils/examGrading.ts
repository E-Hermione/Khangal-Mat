import { TestQuestion } from '../types';
import { answerKeyHash, candidateKeys } from '../services/answers';

// Helper to get multiple-choice options for any test question
export function getQuestionOptions(q: TestQuestion): { letter: string; text: string }[] {
  if (Array.isArray(q.options) && q.options.length > 0) {
    return q.options.map((opt, i) => {
      const letter = ['A', 'B', 'C', 'D'][i] || String.fromCharCode(65 + i);
      const cleanText = opt.replace(/^[A-D]\)\s*/, '');
      return { letter, text: cleanText };
    });
  }

  // If question text contains options like A) ... B) ... C) ... D)
  const regex = /([A-D])\)\s*([^A-D\n]+)/g;
  const matches = [...q.question.matchAll(regex)];
  if (matches.length >= 2) {
    return matches.map((m) => ({ letter: m[1], text: m[2].trim() }));
  }

  // Fallback options based on correct answer
  const rightAns = (q.answer || '').trim();
  const num = parseFloat(rightAns);
  if (!isNaN(num)) {
    return [
      { letter: 'A', text: String(num) },
      { letter: 'B', text: String(num + 2) },
      { letter: 'C', text: String(Math.max(1, num - 2)) },
      { letter: 'D', text: String(num * 2) },
    ];
  }

  return [{ letter: 'A', text: rightAns || 'Хариу 1' }, ...FILLER_OPTIONS.map((text, i) => ({ letter: 'BCD'[i], text }))];
}

// Wrong choices made up for open questions (the right answer is always A)
const FILLER_OPTIONS = ['Боломжгүй', 'Тэгтэй тэнцүү', 'Аль нь ч биш'];

/** True if the question's choices were made up from its answer rather than written by the teacher. */
export function hasMadeUpOptions(q: TestQuestion): boolean {
  const texts = getQuestionOptions(q).map((o) => o.text.trim());
  if (FILLER_OPTIONS.every((f, i) => texts[i + 1] === f)) return true;
  // Numeric answers get n, n+2, n-2, 2n
  const n = parseFloat(texts[0]);
  return texts.length === 4 && !isNaN(n) && texts.join('|') === [n, n + 2, Math.max(1, n - 2), n * 2].map(String).join('|');
}

/** The option letter an answer names explicitly ("B", "B)", "B) 428", "B. 428"), if any. */
export function answerLetter(answer: string): string | null {
  const m = answer.trim().match(/^([A-Fa-f])(?:[).:]|\s*$)/);
  return m ? m[1].toUpperCase() : null;
}

/** For answers that start with a number, the first option whose text is exactly that number. */
export function numericAnswerLetter(answer: string, options: { letter: string; text: string }[]): string | null {
  const num = parseFloat(answer.trim());
  if (isNaN(num)) return null;
  const match = options.find((o) => o.text.trim() === String(num));
  return match ? match.letter : null;
}

/** Open questions (no choices written by the teacher) are answered by typing the answer. */
export function isOpenQuestion(q: TestQuestion): boolean {
  return hasMadeUpOptions(q);
}

// A typed answer matches the expected one ignoring case, spaces, $ and a final period; numbers
// match by value, and a bare number matches an answer with just that one number ("x = 4", "Үлдэгдэл 1")
export function sameAnswer(expected: string, typed: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\$|\\[,;! ]|\s/g, '').replace(/\.$/, '');
  const x = norm(expected);
  const y = norm(typed);
  if (!x || !y) return false;
  if (x === y) return true;
  const ny = Number(y.replace(',', '.'));
  if (isNaN(ny)) return false;
  const numbers = x.match(/-?\d+(?:[.,]\d+)?/g);
  return numbers?.length === 1 && Number(numbers[0].replace(',', '.')) === ny && !/[\\^/]/.test(x);
}

export function isOptionCorrect(userAns: string, q: TestQuestion, options: { letter: string; text: string }[]): boolean {
  if (!userAns) return false;
  if (isOpenQuestion(q)) {
    // A typed answer counts only through the option showing that answer, never as a bare letter
    const match = options.find((o) => sameAnswer(o.text, userAns));
    return !!match && isChoiceCorrect(match.letter, q, options);
  }
  return isChoiceCorrect(userAns, q, options);
}

/** The correct option (for open questions, the one holding the answer). */
export function correctOption(q: TestQuestion, options: { letter: string; text: string }[]) {
  return options.find((o) => isChoiceCorrect(o.letter, q, options));
}

function isChoiceCorrect(userAns: string, q: TestQuestion, options: { letter: string; text: string }[]): boolean {
  if (!userAns) return false;

  // Answer withheld from this user: compare against the hashed answer key
  if (!q.answer) {
    return !!q.answerHash && candidateKeys(userAns, options).some((k) => answerKeyHash(q.id, k) === q.answerHash);
  }

  const u = userAns.trim().toUpperCase();
  const r = q.answer.trim().toUpperCase();

  // If user selected letter directly matches answer letter (A, B, C, D)
  if (u === r) return true;

  // Answers written with their option label, e.g. "B) 428" or "B. 428"
  const labelled = answerLetter(q.answer);
  if (labelled && u === labelled) return true;

  // Find the option letter that corresponds to the answer text
  const matchOpt = options.find((opt) => opt.text.trim().toLowerCase() === q.answer.trim().toLowerCase());
  if (matchOpt && u === matchOpt.letter) return true;

  // If user choice equals correct answer text
  if (userAns.trim().toLowerCase() === q.answer.trim().toLowerCase()) return true;

  // Descriptive numeric answers ("33 ширхэг тоо"): the first option showing that number
  const numericLetter = numericAnswerLetter(q.answer, options);
  if (numericLetter && u === numericLetter) return true;

  return false;
}
