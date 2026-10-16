import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cloud } from '../services/cloud';

const PARTS = ['theory', 'examples', 'practice', 'test1', 'test2', 'test3'];

/**
 * General view only: marks the whole topic as looked over (all its parts), the same marks the
 * general home page's topic check list shows.
 */
export const TopicCheckButton: React.FC<{ topicId: string }> = ({ topicId }) => {
  const read = () => cloud.getAppSettings().contentChecks || {};
  const [checks, setChecks] = useState<Record<string, string[]>>(read);
  useEffect(() => {
    const refresh = () => setChecks(read());
    window.addEventListener('app-settings-updated', refresh);
    return () => window.removeEventListener('app-settings-updated', refresh);
  }, []);
  const own = checks[topicId] || [];
  const done = PARTS.every((p) => own.includes(p));
  const toggle = () => {
    const next = { ...checks };
    if (done) delete next[topicId];
    else next[topicId] = PARTS;
    setChecks(next);
    cloud.setAppSettings({ contentChecks: next });
  };
  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="topic-check"
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border transition-all cursor-pointer shrink-0 ${
        done
          ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'
          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
      }`}
      title={done ? 'Шалгасан тэмдгийг арилгах' : 'Сэдвийг бүхэлд нь шалгасан гэж тэмдэглэх'}
    >
      <Check className="w-4 h-4" />
      <span>{done ? 'Шалгасан' : 'Шалгаж дууссан'}</span>
    </button>
  );
};
