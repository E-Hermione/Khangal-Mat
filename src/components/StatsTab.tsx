import React, { useEffect, useMemo, useState } from 'react';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { BarChart3 } from 'lucide-react';
import { getDb } from '../services/firebase';
import { cloud } from '../services/cloud';
import { ADMIN_EMAIL } from '../services/authService';
import { combinedPlan, currentResults, GRADES, PASS_PERCENT, PlacementResult, tierPercent, topicsInGrade } from '../services/learningPlan';
import { AttemptMap, ExamAttempt } from '../services/examAttempts';
import { GradeNumber } from '../types';

interface Data {
  // uid -> that student's placement results
  placement: Map<string, PlacementResult[]>;
  // uid -> that student's topic test results
  attempts: Map<string, AttemptMap>;
}

const pctClass = (p: number | null) =>
  p === null ? 'text-stone-300' : p >= PASS_PERCENT ? 'text-emerald-700' : p >= 60 ? 'text-amber-700' : 'text-rose-700';

/** Admin: which topics students find hardest, from placement tests and topic tests. */
export const StatsTab: React.FC = () => {
  const [grade, setGrade] = useState<GradeNumber>(8);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getDb();
    const owner = (path: { parent: { parent: { id: string } | null } }) => path.parent.parent?.id || '';
    Promise.all([getDocs(collectionGroup(db, 'placement')), getDocs(collectionGroup(db, 'examAttempts'))])
      .then(([pl, ex]) => {
        const placement = new Map<string, PlacementResult[]>();
        pl.docs.forEach((d) => placement.set(owner(d.ref), [...(placement.get(owner(d.ref)) || []), d.data() as PlacementResult]));
        const attempts = new Map<string, AttemptMap>();
        ex.docs.forEach((d) => attempts.set(owner(d.ref), { ...(attempts.get(owner(d.ref)) || {}), [d.id]: d.data() as ExamAttempt }));
        setData({ placement, attempts });
      })
      .catch((err) => {
        console.error(err);
        setError('Мэдээлэл уншиж чадсангүй. Firestore-ийн дүрмийг шинэчилсэн эсэхээ шалгана уу.');
      });
  }, []);

  // Students only (the admin's own test runs are left out)
  const members = useMemo(() => cloud.getUsers().filter((u) => u.email !== ADMIN_EMAIL), []);

  const rows = useMemo(() => {
    if (!data) return [];
    const gradeStudents = members.filter((u) => (u.grades?.[0] ?? null) === grade);
    const tookPlacement = gradeStudents.filter((u) => (data.placement.get(u.uid) || []).length > 0);
    return topicsInGrade(grade)
      .map((t) => {
        // Students whose plan has the topic (they missed its placement questions)
        const missed = tookPlacement.filter((u) =>
          combinedPlan(currentResults(data.placement.get(u.uid) || [], grade)).some((p) => p.topicId === t.id)
        ).length;
        // Average best score on each topic test, over the students who took it
        const tiers = ([1, 2, 3] as const).map((tier) => {
          const scores = members
            .map((u) => tierPercent(t.id, tier, data.attempts.get(u.uid) || {}))
            .filter((p): p is number => p !== null);
          return scores.length ? { avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), n: scores.length } : null;
        });
        return { topic: t, missed, takers: tookPlacement.length, tiers };
      })
      .sort((a, b) => b.missed / Math.max(1, b.takers) - a.missed / Math.max(1, a.takers) || (a.tiers[0]?.avg ?? 101) - (b.tiers[0]?.avg ?? 101));
  }, [data, members, grade]);

  return (
    <div className="space-y-4" data-testid="stats-tab">
      <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/60 flex items-start gap-2.5">
        <BarChart3 className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <p className="text-xs text-sky-900 leading-relaxed">
          Сэдэв бүрээр: түвшин тогтоох сорилд хэдэн хүүхэд алдсан, сэдэвчилсэн сорилуудын дундаж дүн. Хамгийн хүндрэлтэй
          сэдвүүд дээрээ гарна.
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {GRADES.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGrade(g)}
            className={`py-2 rounded-lg border text-xs font-black cursor-pointer ${
              g === grade ? 'bg-stone-900 border-stone-900 text-amber-400' : 'bg-white border-stone-200 text-stone-700 hover:border-amber-400'
            }`}
          >
            {g}-р
          </button>
        ))}
      </div>

      {error ? (
        <div className="text-xs text-red-700">{error}</div>
      ) : !data ? (
        <div className="text-xs text-stone-400">Ачаалж байна…</div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-stone-400">Энэ ангид сэдэв алга.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-xs">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="text-left font-bold px-3 py-2">Сэдэв</th>
                <th className="font-bold px-2 py-2 whitespace-nowrap">Түвшин тогтоох</th>
                <th className="font-bold px-2 py-2">Анхан</th>
                <th className="font-bold px-2 py-2">Дунд</th>
                <th className="font-bold px-2 py-2">Ахисан</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ topic, missed, takers, tiers }) => (
                <tr key={topic.id} className="border-t border-stone-100">
                  <td className="px-3 py-2 font-bold text-stone-900">{topic.title}</td>
                  <td className="px-2 py-2 text-center whitespace-nowrap">
                    {takers ? (
                      <span className={missed / takers >= 0.5 ? 'text-rose-700 font-black' : 'text-stone-700'}>
                        {missed}/{takers} алдсан
                      </span>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                  {tiers.map((t, i) => (
                    <td key={i} className="px-2 py-2 text-center whitespace-nowrap">
                      {t ? (
                        <span className={`font-black ${pctClass(t.avg)}`} title={`${t.n} хүүхэд өгсөн`}>
                          {t.avg}%<span className="font-normal text-stone-400"> ({t.n})</span>
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-stone-400">
        «Түвшин тогтоох»: тухайн ангийн сорил өгсөн хүүхдүүдээс хэд нь энэ сэдэвт алдсан. Сорилын дүн: хүүхэд бүрийн
        хамгийн өндөр дүнгийн дундаж (хаалтанд хэдэн хүүхэд өгсөн).
      </p>
    </div>
  );
};
