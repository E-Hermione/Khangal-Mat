import React, { useEffect, useState } from 'react';
import { Copy, Download, Eye, History, RotateCcw, X } from 'lucide-react';
import { TopicPackage } from '../types';
import { downloadTopicJson, loadTopicVersions, topicJson, TopicVersion } from '../services/topicHistory';
import { backdropClose } from '../utils/backdrop';

const KIND_LABEL: Record<TopicVersion['kind'], string> = {
  save: 'Хадгалсан',
  import: 'Файлаас оруулсан',
  original: 'Анхны хувилбар',
  restore: 'Хадгалсан',
};

const when = (t: number) =>
  new Date(t).toLocaleString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

const counts = (t: TopicPackage) =>
  `Онол ${t.theory?.length || 0} • Жишээ ${t.examples?.length || 0} • Дасгал ${t.practice?.length || 0}`;

/** The topic's saved versions: download any of them, or load one back into the editor. */
export const TopicHistoryDialog: React.FC<{
  topic: TopicPackage;
  onSwitch: (v: TopicVersion) => void;
  onClose: () => void;
}> = ({ topic, onSwitch, onClose }) => {
  const [list, setList] = useState<TopicVersion[] | null>(null);
  const [error, setError] = useState(false);
  // The JSON being viewed in full
  const [viewing, setViewing] = useState<{ title: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    loadTopicVersions(topic.id)
      .then(setList)
      .catch((err) => {
        console.error('Topic history not loaded', err);
        setError(true);
      });
  }, [topic.id]);
  const fileName = (suffix: string) => `${topic.title}-${suffix}`.replace(/[\\/:*?"<>|]/g, '');

  return (
    <div {...backdropClose(onClose)} className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-stone-950/60">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" data-testid="topic-history">
        <div className="px-4 py-3 bg-stone-900 text-white flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          <div className="font-bold text-sm flex-1 truncate">Түүх: {topic.title}</div>
          <button type="button" onClick={onClose} className="p-1 text-stone-400 hover:text-white cursor-pointer" aria-label="Хаах">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3 border-b border-stone-200 flex gap-2">
          <button
            type="button"
            onClick={() => setViewing({ title: 'Засаж буй хувилбар', text: topicJson(topic) })}
            className="px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-800 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Харах
          </button>
          <button
            type="button"
            onClick={() => downloadTopicJson(topic, fileName('одоогийн'))}
            className="flex-1 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-800 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Засаж буй хувилбарыг файл болгож татах
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
          {error ? (
            <div className="p-6 text-center text-xs text-red-700">Түүх ачаалж чадсангүй.</div>
          ) : !list ? (
            <div className="p-6 text-center text-xs text-stone-500">Ачаалж байна...</div>
          ) : list.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-500">
              Түүх хоосон. Сэдвийг хадгалахад энд хадгалагдана.
            </div>
          ) : (
            list.map((v) => (
              <div key={v.id} className="px-4 py-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-stone-900">
                    {when(v.updatedAt ?? v.savedAt)} <span className="ml-1 font-semibold text-stone-500">{KIND_LABEL[v.kind]}</span>
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {counts(v.topic)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewing({ title: `${when(v.updatedAt ?? v.savedAt)} • ${KIND_LABEL[v.kind]}`, text: topicJson(v.topic) })}
                  className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                  title="JSON-ийг бүтнээр нь харах"
                  aria-label="Харах"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => downloadTopicJson(v.topic, fileName(new Date(v.updatedAt ?? v.savedAt).toISOString().slice(0, 16).replace(':', '-')))}
                  className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                  title="Файл болгож татах"
                  aria-label="Файл болгож татах"
                >
                  <Download className="w-4 h-4" />
                </button>
                {v.current ? (
                  <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">Одоогийн</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`${when(v.updatedAt ?? v.savedAt)}-ий хувилбар руу шилжих үү? Сайт дээр шууд солигдоно.`)) return;
                      onSwitch(v);
                    }}
                    className="px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Шилжих
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      {viewing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-stone-950/60" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-2.5 bg-stone-900 text-white flex items-center gap-2">
              <div className="font-bold text-xs flex-1 truncate">{viewing.title}</div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(viewing.text).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
                className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Хууллаа' : 'Хуулах'}
              </button>
              <button type="button" onClick={() => setViewing(null)} className="p-1 text-stone-400 hover:text-white cursor-pointer" aria-label="Хаах">
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-[11px] leading-relaxed font-mono text-stone-800 bg-stone-50 whitespace-pre-wrap break-words select-text">
              {viewing.text}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
