import React, { useEffect, useState } from 'react';
import { Copy, Eye, History, Trash2, X } from 'lucide-react';
import { TopicPackage } from '../types';
import { ensureCurrentVersion, loadTopicVersions, partHash, removePartFromVersion, TopicVersion } from '../services/topicHistory';
import { backdropClose } from '../utils/backdrop';

const when = (t: number) =>
  new Date(t).toLocaleString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

// Each part of the lesson has its own history
const PARTS = [
  { key: 'theory', label: 'Онол', unit: 'дүрэм' },
  { key: 'examples', label: 'Жишээ', unit: 'жишээ' },
  { key: 'practice', label: 'Дасгал', unit: 'дасгал' },
  { key: 'test1', label: 'Анхан', unit: 'бодлого' },
  { key: 'test2', label: 'Дунд', unit: 'бодлого' },
  { key: 'test3', label: 'Ахисан', unit: 'бодлого' },
] as const;
type PartKey = (typeof PARTS)[number]['key'];

const partSize = (key: PartKey, value: unknown): number => {
  if (key.startsWith('test')) return (value as TopicPackage['test1'] | undefined)?.questions?.length || 0;
  return Array.isArray(value) ? value.length : 0;
};

interface PartRow {
  version: TopicVersion;
  value: unknown;
  at: number;
}

/**
 * A part's history: a row for each file that brought it in (and the lesson as it first was),
 * newest first. Edits change a row in place, so the newest row is the part as it is on the site
 * now, under the time it last changed.
 */
function partRows(list: TopicVersion[], key: PartKey, site: TopicPackage): PartRow[] {
  const rows: PartRow[] = [];
  const oldestFirst = [...list].reverse();
  oldestFirst.forEach((v, i) => {
    const value = v.topic[key];
    // An empty part (nothing in it yet) is not a version of that part
    if (value === undefined || partSize(key, value) === 0) return;
    const brought = v.parts
      ? v.parts.includes(key)
      : i === 0 || partHash(value) !== partHash(oldestFirst[i - 1].topic[key]); // older versions: when it changed
    if (brought) rows.push({ version: v, value, at: v.updatedAt ?? v.savedAt });
  });
  if (rows.length) {
    const inUse = list.find((v) => v.current) ?? list[0];
    const last = rows[rows.length - 1];
    last.value = site[key];
    last.at = Math.max(last.at, inUse ? inUse.updatedAt ?? inUse.savedAt : 0);
  }
  return rows.reverse();
}

/** The history of each part of the topic: view or edit a version's JSON, or delete it. */
export const TopicHistoryDialog: React.FC<{
  topic: TopicPackage;
  // The lesson as saved on the site (the editor may hold unsaved changes)
  saved: TopicPackage;
  // JSON edited in the viewer goes on the site (true when it did)
  onApplyJson: (data: unknown, part: PartKey) => boolean;
  // The last row of a part was deleted: that part is emptied on the site
  onPartDeleted: (part: PartKey) => void;
  onClose: () => void;
}> = ({ topic, saved, onApplyJson, onPartDeleted, onClose }) => {
  const [tab, setTab] = useState<PartKey>('theory');
  const [list, setList] = useState<TopicVersion[] | null>(null);
  const [error, setError] = useState(false);
  // The JSON being viewed (and edited); an edit goes to that part on the site
  const [viewing, setViewing] = useState<{ title: string; text: string; part: PartKey } | null>(null);
  const [draft, setDraft] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const view = (v: { title: string; text: string; part: PartKey }) => {
    setViewing(v);
    setDraft(v.text);
    setJsonError(null);
  };
  const load = () =>
    loadTopicVersions(topic.id)
      .then(setList)
      .catch((err) => {
        console.error('Topic history not loaded', err);
        setError(true);
      });
  useEffect(() => {
    ensureCurrentVersion(saved).then(load, load);
  }, [topic.id]);

  const part = PARTS.find((p) => p.key === tab)!;
  const rows = list ? partRows(list, tab, saved) : [];

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
          {PARTS.map((t) => (
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
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-500">Түүх хоосон.</div>
          ) : (
            rows.map((r, i) => (
              // The newest row is what the site shows now
              <div key={r.version.id} className={`px-4 py-2.5 flex items-center gap-2 ${i === 0 ? 'bg-emerald-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-stone-900">
                    {when(r.at)}
                    {i === 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold align-middle">Одоогийн</span>
                    )}
                    {r.version.file && <span className="ml-1 font-semibold text-stone-500">{r.version.file}</span>}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {part.label}: {partSize(tab, r.value)} {part.unit}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => view({ title: `${part.label} • ${when(r.at)}`, text: JSON.stringify(r.value, null, 2), part: tab })}
                  className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                  title="JSON-ийг харах, засах"
                  aria-label="Харах"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const last = rows.length === 1;
                    const question = last
                      ? `Энэ бол «${part.label}»-ын үлдсэн цорын ганц мөр. Устгавал «${part.label}» сайтаас устна. Устгах уу?`
                      : `${part.label}: ${when(r.at)}-ий мөрийг устгах уу?`;
                    if (!window.confirm(question)) return;
                    removePartFromVersion(topic.id, r.version, tab)
                      .then(() => {
                        if (last) onPartDeleted(tab);
                        else load();
                      })
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
                  navigator.clipboard?.writeText(draft).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
                className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Хууллаа' : 'Хуулах'}
              </button>
              <button
                type="button"
                disabled={draft === viewing.text}
                onClick={() => {
                  let data: unknown;
                  try {
                    data = JSON.parse(draft);
                  } catch (e) {
                    setJsonError(`JSON алдаатай: ${(e as Error).message}`);
                    return;
                  }
                  if (onApplyJson(data, viewing.part)) setViewing(null);
                }}
                className="px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-default text-stone-950 text-[11px] font-bold cursor-pointer"
                data-testid="json-save"
              >
                Хадгалах
              </button>
              <button type="button" onClick={() => setViewing(null)} className="p-1 text-stone-400 hover:text-white cursor-pointer" aria-label="Хаах">
                <X className="w-4 h-4" />
              </button>
            </div>
            {jsonError && <div className="px-4 py-1.5 text-[11px] font-bold text-red-700 bg-red-50 border-b border-red-100">{jsonError}</div>}
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setJsonError(null);
              }}
              spellCheck={false}
              className="flex-1 overflow-auto p-4 text-[11px] leading-relaxed font-mono text-stone-800 bg-stone-50 resize-none outline-none"
              data-testid="json-editor"
            />
          </div>
        </div>
      )}
    </div>
  );
};
