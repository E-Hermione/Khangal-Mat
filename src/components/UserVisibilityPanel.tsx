import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, ShieldCheck, Unlock } from 'lucide-react';
import { visibilityService, TopicAccessMode } from '../services/visibilityService';

interface UserVisibilityPanelProps {
  topicId: string;
  topicTitle: string;
  onPreviewAsUser: () => void;
}

export const UserVisibilityPanel: React.FC<UserVisibilityPanelProps> = ({
  topicId,
  topicTitle,
  onPreviewAsUser,
}) => {
  const [accessMode, setAccessMode] = useState<TopicAccessMode>(() =>
    visibilityService.getTopicAccessMode(topicId)
  );

  useEffect(() => {
    setAccessMode(visibilityService.getTopicAccessMode(topicId));
  }, [topicId]);

  const handleSetMode = (mode: TopicAccessMode) => {
    setAccessMode(mode);
    visibilityService.setTopicAccessMode(topicId, mode);
  };

  return (
    <div className="no-print mb-5 bg-gradient-to-r from-amber-500/10 via-amber-50/50 to-stone-50 border-2 border-amber-300/80 rounded-2xl p-4 md:p-5 shadow-xs transition-all space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-200/80">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-xs">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs md:text-sm font-black text-stone-900 tracking-tight">
                Хэрэглэгчдэд харагдах эрхийн тохиргоо
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                Админ удирдлага
              </span>
            </div>
            <p className="text-[11px] text-stone-600 mt-0.5">
              «{topicTitle}» хичээлийг хэрэглэгчдэд нээлттэй, түгжээтэй (хүсэлт гаргах), эсвэл бүрэн нууц байхаар тохируулна
            </p>
          </div>
        </div>

        {/* Right Preview button */}
        <button
          type="button"
          onClick={onPreviewAsUser}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-900 hover:bg-black text-amber-400 flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
          title="Хэрэглэгчдэд яг одоо яаж харагдаж байгааг шалгах"
        >
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Хэрэглэгчийн харагдацаар шалгах</span>
        </button>
      </div>

      {/* 3-State Access Control for Topic */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Сэдвийн хандалтын түвшин:
          </span>
          <span className="text-[11px] text-stone-500">
            (Сурагчдын цэсэнд хэрхэн харагдах)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* 1. Visible */}
          <button
            type="button"
            onClick={() => handleSetMode('visible')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2.5 ${
              accessMode === 'visible'
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 shadow-2xs font-bold'
                : 'bg-stone-50 border-stone-200 hover:bg-white text-stone-700'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${accessMode === 'visible' ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-600'}`}>
              <Unlock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold">1. Нээлттэй</div>
              <div className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                Хэрэглэгч онол, жишээ, дасгал, сорилыг бүгдийг үзнэ
              </div>
            </div>
          </button>

          {/* 2. Locked with Request */}
          <button
            type="button"
            onClick={() => handleSetMode('locked')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2.5 ${
              accessMode === 'locked'
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 shadow-2xs font-bold'
                : 'bg-stone-50 border-stone-200 hover:bg-white text-stone-700'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${accessMode === 'locked' ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-600'}`}>
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold">2. Түгжээтэй (Нэр нь харагдана)</div>
              <div className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                Цэсэнд нэр нь харагдах ба дарвал "Багшаар нээлгэх" хүсэлт илгээнэ
              </div>
            </div>
          </button>

          {/* 3. Hidden */}
          <button
            type="button"
            onClick={() => handleSetMode('hidden')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-2.5 ${
              accessMode === 'hidden'
                ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 text-rose-950 shadow-2xs font-bold'
                : 'bg-stone-50 border-stone-200 hover:bg-white text-stone-700'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${accessMode === 'hidden' ? 'bg-rose-500 text-white' : 'bg-stone-200 text-stone-600'}`}>
              <EyeOff className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold">3. Бүрэн нуух</div>
              <div className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                Хэрэглэгчийн цэсэнд энэ сэдвийн нэр ч харагдахгүй
              </div>
            </div>
          </button>
        </div>
      </div>

    </div>
  );
};
