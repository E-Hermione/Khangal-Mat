import { collection, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';

/**
 * Exam results, stored per account in users/{uid}/examAttempts/{examId} so they follow the user
 * across devices and the admin can review them.
 */

export interface ExamAttempt {
  answers: Record<string, string>;
  score?: number;
  // Highest score over all tries and what the test is out of (decides whether a topic is done)
  bestScore?: number;
  maxPoints?: number;
  finishedAt?: number;
}

export type AttemptMap = Record<string, ExamAttempt>;

export function subscribeAttempts(uid: string, onChange: (attempts: AttemptMap) => void, onError?: (err: unknown) => void) {
  return onSnapshot(
    collection(getDb(), 'users', uid, 'examAttempts'),
    (snap) => onChange(Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as ExamAttempt]))),
    (err) => {
      console.error('Exam results failed to load', err);
      onError?.(err);
    }
  );
}

export async function saveAttempt(uid: string, examId: string, attempt: ExamAttempt): Promise<void> {
  await setDoc(doc(getDb(), 'users', uid, 'examAttempts', examId), JSON.parse(JSON.stringify(attempt)));
}

/** Admin: one user's results. */
export async function loadUserAttempts(uid: string): Promise<AttemptMap> {
  const snap = await getDocs(collection(getDb(), 'users', uid, 'examAttempts'));
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as ExamAttempt]));
}
