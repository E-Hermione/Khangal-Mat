import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';

/**
 * A topic test's ranking, open to every member: leaderboards/{examId}/entries/{uid} holds the
 * student's user ID and best result in percent (no names).
 */
export interface LeaderboardEntry {
  uid: string;
  userId: string;
  pct: number;
}

export async function saveLeaderboardEntry(examId: string, uid: string, userId: string, pct: number): Promise<void> {
  await setDoc(doc(getDb(), 'leaderboards', examId, 'entries', uid), { userId, pct, at: Date.now() });
}

/** Best result first. */
export async function loadLeaderboard(examId: string): Promise<LeaderboardEntry[]> {
  const snap = await getDocs(collection(getDb(), 'leaderboards', examId, 'entries'));
  return snap.docs
    .map((d) => ({ uid: d.id, userId: String(d.data().userId || ''), pct: Number(d.data().pct || 0) }))
    .sort((a, b) => b.pct - a.pct || a.userId.localeCompare(b.userId));
}
