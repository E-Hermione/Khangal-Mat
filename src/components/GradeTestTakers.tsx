import React, { useEffect, useState } from 'react';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { getDb } from '../services/firebase';
import { cloud } from '../services/cloud';
import { ExamAttempt } from '../services/examAttempts';
import { attemptPercent, PASS_PERCENT } from '../services/learningPlan';

const TIER = ['', 'Анхан', 'Дунд', 'Ахисан'];

/** Admin: the students who took this grade's topic tests, by user ID, with their results. */
export const GradeTestTakers: React.FC<{ topics: { id: string; title: string }[] }> = ({ topics }) => {
  // uid -> examId -> attempt
  const [byUser, setByUser] = useState<Record<string, Record<string, ExamAttempt>> | null>(null);

  useEffect(() => {
    getDocs(collectionGroup(getDb(), 'examAttempts'))
      .then((snap) => {
        const next: Record<string, Record<string, ExamAttempt>> = {};
        snap.docs.forEach((d) => {
          const uid = d.ref.parent.parent?.id;
          if (uid) next[uid] = { ...(next[uid] || {}), [d.id]: d.data() as ExamAttempt };
        });
        setByUser(next);
      })
      .catch(() => setByUser({}));
  }, []);

  if (!byUser) return null;
  const titleOf = new Map(topics.map((t) => [t.id, t.title]));
  const users = cloud.getUsers();
  const rows = Object.entries(byUser)
    .map(([uid, attempts]) => {
      const results = Object.entries(attempts)
        .map(([examId, a]) => {
          const m = examId.match(/^(.*)-test([123])$/);
          return m && titleOf.has(m[1]) ? { topic: titleOf.get(m[1])!, tier: Number(m[2]), pct: attemptPercent(examId, a) } : null;
        })
        .filter((r): r is { topic: string; tier: number; pct: number } => !!r)
        .sort((x, y) => x.topic.localeCompare(y.topic) || x.tier - y.tier);
      const user = users.find((u) => u.uid === uid);
      return { uid, userId: user?.userId || '—', name: user?.fullName || '', results };
    })
    .filter((r) => r.results.length > 0)
    .sort((a, b) => a.userId.localeCompare(b.userId));

  return (
    <div className="mt-6 space-y-2" data-testid="grade-test-takers">
      <h3 className="text-base font-black text-stone-900">Сорил өгсөн сурагчид ({rows.length})</h3>
      {rows.length === 0 ? (
        <div className="text-xs text-stone-500">Энэ ангийн сорилыг одоогоор хэн ч өгөөгүй байна.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="text-left font-bold px-3 py-2 whitespace-nowrap">ID</th>
                <th className="text-left font-bold px-3 py-2">Нэр</th>
                <th className="text-left font-bold px-3 py-2">Сорилын дүн</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.uid} className="border-t border-stone-100 align-top">
                  <td className="px-3 py-2 font-mono font-bold text-stone-900 whitespace-nowrap">{r.userId}</td>
                  <td className="px-3 py-2 text-stone-800">{r.name}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      {r.results.map((x) => (
                        <span
                          key={`${x.topic}-${x.tier}`}
                          className={`px-2 py-0.5 rounded-full font-bold ${
                            x.pct >= PASS_PERCENT ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {x.topic} · {TIER[x.tier]} {x.pct}%
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
