import React, { useEffect, useState } from 'react';
import { Copy, Eye, History, RotateCcw, Trash2, X } from 'lucide-react';
import { TopicPackage } from '../types';
import { deleteTopicVersion, ensureCurrentVersion, loadTopicVersions, partHash, topicJson, TopicVersion } from '../services/topicHistory';
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

// Each part has its own history too: the different contents it has had across the versions
const PARTS = [
  { key: 'theory', label: 'Онол', unit: 'дүрэм' },
  { key: 'examples', label: 'Жишээ', unit: 'жишээ' },
  { key: 'practice', label: 'Дасгал', unit: 'дасгал' },
  { key: 'test1', label: 'Анхан', unit: 'бодлого' },
  { key: 'test2', label: 'Дунд', unit: 'бодлого' },
  { key: 'test3', label: 'Ахисан', unit: 'бодлого' },
] as const;
type PartKey = (typeof PARTS)[number]['key'];
type Tab = 'all' | PartKey;

const partSize = (key: PartKey, value: unknown): number => {
  if (key.startsWith('test')) return (value as TopicPackage['test1'] | undefined)?.questions?.length || 0;
  return Array.isArray(value) ? value.length : 0;
};

interface PartVersion {
  hash: string;
  value: unknown;
  // When this content first appeared
  at: number;
}

/** The distinct contents a part has had, newest first, each under the date it first appeared. */
function partVersions(list: TopicVersion[], key: PartKey): PartVersion[] {
  const seen = new Map<string, PartVersion>();
  for (const v of [...list].reverse()) {
    const value = v.topic[key];
    if (value === undefined) continue;
    const hash = partHash(value);
    if (!seen.has(hash)) seen.set(hash, { hash, value, at: v.updatedAt ?? v.savedAt });
  }
  return [...seen.values()].reverse();
}

/** The topic's saved versions: view, switch to or delete any of them. */
export const TopicHistoryDialog: React.FC<{
  topic: TopicPackage;
  // The lesson as saved on the site (the editor may hold unsaved changes)
  saved: TopicPackage;
  onSwitch: (v: TopicVersion) => void;
  onSwitchPart: (key: PartKey, value: unknown) => void;
  onClose: () => void;
}> = ({ topic, saved, onSwitch, onSwitchPart, onClose }) => {
  const [tab, setTab] = useState<Tab>('all');
  const [list, setList] = useState<TopicVersion[] | null>(null);
  const [error, setError] = useState(false);
  // The JSON being viewed in full
  const [viewing, setViewing] = useState<{ title: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    ensureCurrentVersion(saved)
      .then(() => loadTopicVersions(topic.id))
      .then(setList)
      .catch((err) => {
        console.error('Topic history not loaded', err);
        setError(true);
      });
  }, [topic.id]);

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
        <div className="flex gap-1 p-2 border-b border-stone-200 overflow-x-auto" data-testid="history-tabs">
          {([{ key: 'all', label: 'Бүгд' }, ...PARTS] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                tab === t.key ? 'bg-stone-900 text-amber-400' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {t.label}
            </button>
          ))}
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
          ) : tab !== 'all' ? (
            (() => {
              const part = PARTS.find((p) => p.key === tab)!;
              const currentHash = partHash(topic[tab]);
              return partVersions(list, tab).map((pv) => (
                <div key={pv.hash} className="px-4 py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-stone-900">{when(pv.at)}</div>
                    <div className="text-[11px] text-stone-500">
                      {part.label}: {partSize(tab, pv.value)} {part.unit}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewing({ title: `${part.label} • ${when(pv.at)}`, text: JSON.stringify(pv.value, null, 2) })}
                    className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                    title="JSON-ийг бүтнээр нь харах"
                    aria-label="Харах"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {pv.hash === currentHash ? (
                    <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">Одоогийн</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(`${part.label}-ыг ${when(pv.at)}-ий хувилбар руу шилжүүлэх үү? Бусад хэсэг хэвээр үлдэнэ.`)) return;
                        onSwitchPart(tab, pv.value);
                      }}
                      className="px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Шилжих
                    </button>
                  )}
                </div>
              ));
            })()
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
                {!v.current && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`${when(v.updatedAt ?? v.savedAt)}-ий хувилбарыг устгах уу? Буцааж сэргээх боломжгүй.`)) return;
                      deleteTopicVersion(topic.id, v)
                        .then(() => setList((l) => l?.filter((x) => x.id !== v.id) ?? l))
                        .catch((err) => {
                          console.error('Version not deleted', err);
                          window.alert('Устгаж чадсангүй.');
                        });
                    }}
                    className="p-1.5 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    title="Устгах"
                    aria-label="Устгах"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
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
