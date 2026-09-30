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

  return [
    { letter: 'A', text: rightAns || 'Хариу 1' },
    { letter: 'B', text: 'Боломжгүй' },
    { letter: 'C', text: 'Тэгтэй тэнцүү' },
    { letter: 'D', text: 'Аль нь ч биш' },
  ];
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

export function isOptionCorrect(userAns: string, q: TestQuestion, options: { letter: string; text: string }[]): boolean {
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
