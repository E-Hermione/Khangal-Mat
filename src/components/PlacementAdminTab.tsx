import React, { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { GradeNumber } from '../types';
import { cloud } from '../services/cloud';
import { placementSize } from '../services/learningPlan';

const GRADES: GradeNumber[] = [6, 7, 8, 9, 10, 11, 12];

/**
 * Admin: placement test settings. The test itself is drawn at random from the topics' basic and
 * middle tests, so there is nothing to write by hand.
 */
export const PlacementAdminTab: React.FC = () => {
  const [settings, setSettings] = useState(() => cloud.getAppSettings());

  useEffect(() => {
    const refresh = () => setSettings(cloud.getAppSettings());
    window.addEventListener('app-settings-updated', refresh);
    window.addEventListener('topics-updated', refresh);
    return () => {
      window.removeEventListener('app-settings-updated', refresh);
      window.removeEventListener('topics-updated', refresh);
    };
  }, []);

  const toggle = (on: boolean) => (
    <span
      className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${on ? 'bg-emerald-500' : 'bg-stone-300'}`}
      aria-hidden="true"
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-4">
        <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
          <ClipboardCheck className="w-4 h-4 text-amber-600" />
          <span>Түвшин тогтоох шалгалт</span>
        </h4>
        <p className="text-[11px] text-stone-500 leading-relaxed">
          Сурагч бүртгүүлээд анх орохдоо түвшин тогтоох шалгалт өгнө. Бодлогуудыг сэдвүүдийн Анхан ба Дунд шатны сорилын сонголттой бодлогуудаас
          санамсаргүйгээр сонгоно (сурагч бүрд өөр). Алдсан бодлогуудын сэдвүүдээр тухайн сурагчийн сургалтын төлөвлөгөө гарна.
          Зөвхөн сорилын бодлого оруулсан сэдвүүд хамрагдана.
        </p>

        <button
          type="button"
          onClick={() => cloud.setAppSettings({ placementEnabled: !settings.placementEnabled })}
          className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer"
          data-testid="placement-enabled"
        >
          <span className="text-sm font-bold text-stone-800">Шинэ сурагчдад түвшин тогтоох шалгалт өгүүлэх</span>
          {toggle(settings.placementEnabled)}
        </button>

        <button
          type="button"
          onClick={() => cloud.setAppSettings({ placementLowerGrades: !settings.placementLowerGrades })}
          className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer"
        >
          <span className="text-left">
            <span className="block text-sm font-bold text-stone-800">Доод ангиудын сэдвийг оруулах</span>
            <span className="block text-[11px] text-stone-500">
              Жишээ нь 8-р ангийн сурагчид 6, 7, 8-р ангийн сэдвүүдээс бодлого гарна
            </span>
          </span>
          {toggle(settings.placementLowerGrades)}
        </button>

        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-stone-200">
          <span className="text-left">
            <span className="block text-sm font-bold text-stone-800">Сэдэв бүрээс хэдэн бодлого авах</span>
            <span className="block text-[11px] text-stone-500">
              Дор хаяж 3. Сорилд үүнээс цөөн бодлоготой сэдвээс байгаа бүх бодлогыг нь авна.
            </span>
          </span>
          <div className="flex gap-1">
            {[3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => cloud.setAppSettings({ placementPerTopic: n })}
                className={`w-9 h-8 rounded-lg text-sm font-bold border cursor-pointer ${
                  Math.max(3, settings.placementPerTopic || 0) === n
                    ? 'bg-stone-900 text-amber-400 border-stone-900'
                    : 'bg-white text-stone-700 border-stone-200'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
        <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide">Анги тус бүрийн шалгалт</h4>
        <div className="grid sm:grid-cols-2 gap-1.5" data-testid="placement-sizes">
          {GRADES.map((g) => {
            const size = placementSize(g);
            return (
              <div key={g} className="flex justify-between text-xs px-3 py-2 rounded-lg bg-stone-50">
                <span className="font-bold text-stone-800">{g}-р анги</span>
                <span className={size.questions ? 'text-stone-700' : 'text-stone-400'}>
                  {size.questions ? `${size.questions} бодлого (${size.topics} сэдэв)` : 'Сорилтой сэдэв алга — шалгалтгүй'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
