import React, { useEffect, useState } from 'react';
import { CheckSquare, Gift, Square } from 'lucide-react';
import { GradeNumber } from '../types';
import { cloud } from '../services/cloud';
import { storageService } from '../services/storageService';
import { allTopicMetas, GRADES } from '../services/learningPlan';

// Topics taught in a grade: their own grade, or the other grades they are shown in
function gradeTopics(grade: GradeNumber) {
  const saved = storageService.getTopics();
  return allTopicMetas().filter(
    (t) => t.grade === grade || !!saved.find((s) => s.id === t.id)?.visibleGrades?.includes(grade)
  );
}

/** Admin: per grade, the topics open to everyone right after signing up (a free sample of the lessons). */
export const FreeTopicsTab: React.FC = () => {
  const [grade, setGrade] = useState<GradeNumber>(6);
  const [freeIds, setFreeIds] = useState<string[]>(() => cloud.getAppSettings().freeTopicIds || []);

  useEffect(() => {
    const refresh = () => setFreeIds(cloud.getAppSettings().freeTopicIds || []);
    window.addEventListener('app-settings-updated', refresh);
    return () => window.removeEventListener('app-settings-updated', refresh);
  }, []);

  const toggle = (id: string) => {
    const next = freeIds.includes(id) ? freeIds.filter((x) => x !== id) : [...freeIds, id];
    setFreeIds(next);
    cloud.setAppSettings({ freeTopicIds: next });
  };

  const topics = gradeTopics(grade);
  const categories = [...new Set(topics.map((t) => t.category))];

  return (
    <div className="space-y-4" data-testid="free-topics">
      <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-2.5">
        <Gift className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-900 leading-relaxed">
          Шинээр бүртгүүлсэн хүн төлбөр төлөөгүй байхдаа ч энд сонгосон сэдвүүдийг бүрэн үзнэ. Анги бүрт хичээл ямар
          байдгийг харуулах сэдвээ сонгоно уу.
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {GRADES.map((g) => {
          const count = gradeTopics(g).filter((t) => freeIds.includes(t.id)).length;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setGrade(g)}
              className={`py-2 rounded-lg border text-xs font-black cursor-pointer flex flex-col items-center gap-0.5 ${
                g === grade ? 'bg-stone-900 border-stone-900 text-amber-400' : 'bg-white border-stone-200 text-stone-700 hover:border-amber-400'
              }`}
            >
              <span>{g}-р</span>
              <span className={`text-[10px] font-bold ${count ? 'text-emerald-500' : 'text-stone-400'}`}>{count} үнэгүй</span>
            </button>
          );
        })}
      </div>

      {topics.length === 0 ? (
        <div className="text-xs text-stone-400">Энэ ангид сэдэв алга.</div>
      ) : (
        categories.map((cat) => (
          <div key={cat} className="space-y-1.5">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">{cat}</div>
            {topics
              .filter((t) => t.category === cat)
              .map((t) => {
                const on = freeIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left text-sm cursor-pointer ${
                      on ? 'border-emerald-400 bg-emerald-50 text-emerald-900 font-bold' : 'border-stone-200 hover:bg-stone-50 text-stone-800'
                    }`}
                    data-testid={`free-${t.id}`}
                  >
                    {on ? <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" /> : <Square className="w-4 h-4 text-stone-400 shrink-0" />}
                    <span className="flex-1">{t.title}</span>
                    {on && <span className="text-[10px] font-black uppercase text-emerald-700">Үнэгүй</span>}
                  </button>
                );
              })}
          </div>
        ))
      )}
    </div>
  );
};
