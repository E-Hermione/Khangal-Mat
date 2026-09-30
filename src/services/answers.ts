import { TopicPackage, TestPackage, TestQuestion } from '../types';

/**
 * Answers and solutions are kept out of the public topic documents (topics/{id}) and stored in
 * topicAnswers/{id}, which the security rules only let the admin read, or members when the admin
 * has made that topic's answers visible. Test questions keep a hashed answer key so exams can
 * still be graded in the browser without the plain answer.
 */

export interface TopicAnswers {
  practice: Record<string, { answer: string; solution?: string }>;
  tests: Record<string, { answer: string; solution?: string }>;
}

const TEST_KEYS = ['test1', 'test2', 'test3'] as const;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Small synchronous string hash (cyrb53); obscures the key, it is not cryptographic
function hash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function answerKeyHash(questionId: string, key: string): string {
  return hash(`${questionId}|${key.trim().toLowerCase()}`);
}

/** The value graded against: the correct option's letter, or the answer text itself. */
function correctKey(answer: string, options: { letter: string; text: string }[]): string {
  const a = answer.trim();
  if (LETTERS.includes(a.toUpperCase()) && options.some((o) => o.letter === a.toUpperCase())) return a.toUpperCase();
  const match = options.find((o) => o.text.trim().toLowerCase() === a.toLowerCase());
  return match ? match.letter : a;
}

/** Keys a user's choice may match: the letter, and the text of the chosen option. */
export function candidateKeys(userAns: string, options: { letter: string; text: string }[]): string[] {
  const u = userAns.trim();
  const keys = [u, u.toUpperCase()];
  const byText = options.find((o) => o.text.trim().toLowerCase() === u.toLowerCase());
  if (byText) keys.push(byText.letter);
  return keys;
}

type OptionsOf = (q: TestQuestion) => { letter: string; text: string }[];

/** Splits a full topic into its public document and its answers document. */
export function splitTopic(topic: TopicPackage, optionsOf: OptionsOf): { publicTopic: TopicPackage; answers: TopicAnswers } {
  const answers: TopicAnswers = { practice: {}, tests: {} };

  const practice = (topic.practice || []).map((p) => {
    if (p.answer || p.solution) answers.practice[p.id] = { answer: p.answer || '', solution: p.solution };
    return { ...p, answer: '', solution: undefined };
  });

  const stripTest = (test: TestPackage | undefined): TestPackage | undefined => {
    if (!test) return test;
    return {
      ...test,
      questions: (test.questions || []).map((q) => {
        if (!q.answer && !q.solution) return q;
        // Store the options explicitly: some are generated from the answer itself
        const options = optionsOf(q);
        answers.tests[q.id] = { answer: q.answer || '', solution: q.solution };
        return {
          ...q,
          options: options.map((o) => o.text),
          answer: '',
          solution: undefined,
          answerHash: q.answer ? answerKeyHash(q.id, correctKey(q.answer, options)) : undefined,
        };
      }),
    };
  };

  const publicTopic: TopicPackage = { ...topic, practice };
  for (const key of TEST_KEYS) {
    (publicTopic as unknown as Record<string, unknown>)[key] = stripTest(topic[key]);
  }
  return { publicTopic, answers };
}

/** Puts answers back into a public topic document (when the user may see them). */
export function mergeAnswers(topic: TopicPackage, answers: TopicAnswers | undefined): TopicPackage {
  if (!answers) return topic;
  const fillTest = (test: TestPackage | undefined) =>
    test && {
      ...test,
      questions: (test.questions || []).map((q) => (answers.tests[q.id] ? { ...q, ...answers.tests[q.id] } : q)),
    };
  const merged: TopicPackage = {
    ...topic,
    practice: (topic.practice || []).map((p) => (answers.practice[p.id] ? { ...p, ...answers.practice[p.id] } : p)),
  };
  for (const key of TEST_KEYS) {
    (merged as unknown as Record<string, unknown>)[key] = fillTest(topic[key]);
  }
  return merged;
}

/** True if a public topic document still contains plain answers (saved before the split). */
export function hasInlineAnswers(topic: TopicPackage): boolean {
  if ((topic.practice || []).some((p) => p.answer || p.solution)) return true;
  return TEST_KEYS.some((k) => (topic[k]?.questions || []).some((q) => q.answer || q.solution));
}

/** Mirrors answersVisible() in firestore.rules. */
export function answersVisibleFor(topicId: string, visibility: Record<string, any> | null): boolean {
  if (!visibility) return false;
  const override = visibility.topicOverrides?.[topicId] || {};
  const value = 'answers' in override ? override.answers : visibility.defaultSections?.answers;
  return value === true;
}
