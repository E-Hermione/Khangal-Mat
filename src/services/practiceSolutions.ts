import { useEffect, useState } from 'react';
import { deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { TopicPackage } from '../types';

/**
 * Practice answers and solutions are hidden from users; the admin opens them per topic for chosen
 * users. Firestore:
 * - practiceGrants/{topicId}: { uids } – who has them (admin only)
 * - users/{uid}/practiceSolutions/{topicId}: { practice: { [problemId]: { answer, solution } } } – the
 *   copy each of those users reads (rewritten when the admin saves the topic)
 */

export type PracticeAnswers = Record<string, { answer: string; solution?: string }>;

function practiceAnswersOf(topic: TopicPackage): PracticeAnswers {
  return Object.fromEntries(
    (topic.practice || [])
      .filter((p) => p.answer || p.solution)
      .map((p) => [p.id, { answer: p.answer || '', ...(p.solution ? { solution: p.solution } : {}) }])
  );
}

export async function loadPracticeGrants(topicId: string): Promise<string[]> {
  const snap = await getDoc(doc(getDb(), 'practiceGrants', topicId));
  return (snap.data()?.uids as string[] | undefined) || [];
}

/** Admin: who sees this topic's practice solutions (the topic must carry its answers). */
export async function savePracticeGrants(topic: TopicPackage, uids: string[]): Promise<void> {
  const db = getDb();
  const before = await loadPracticeGrants(topic.id);
  const practice = practiceAnswersOf(topic);
  await Promise.all([
    ...uids.map((uid) => setDoc(doc(db, 'users', uid, 'practiceSolutions', topic.id), { practice, updatedAt: Date.now() })),
    ...before.filter((uid) => !uids.includes(uid)).map((uid) => deleteDoc(doc(db, 'users', uid, 'practiceSolutions', topic.id))),
  ]);
  await setDoc(doc(db, 'practiceGrants', topic.id), { uids });
}

/** Admin: after editing a topic, refresh the copies of the users who have its solutions. */
export async function syncPracticeSolutions(topic: TopicPackage): Promise<void> {
  const uids = await loadPracticeGrants(topic.id);
  if (uids.length === 0) return;
  const practice = practiceAnswersOf(topic);
  await Promise.all(
    uids.map((uid) => setDoc(doc(getDb(), 'users', uid, 'practiceSolutions', topic.id), { practice, updatedAt: Date.now() }))
  );
}

/** User: this topic's practice answers if the admin opened them for them, else null. */
export function usePracticeSolutions(uid: string | undefined, topicId: string): PracticeAnswers | null {
  const [answers, setAnswers] = useState<PracticeAnswers | null>(null);
  useEffect(() => {
    setAnswers(null);
    if (!uid) return;
    return onSnapshot(
      doc(getDb(), 'users', uid, 'practiceSolutions', topicId),
      (snap) => setAnswers(snap.exists() ? ((snap.data().practice as PracticeAnswers) || {}) : null),
      () => setAnswers(null)
    );
  }, [uid, topicId]);
  return answers;
}
