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
const PART_NAME: Record<PartKey, string> = {
  theory: 'Онол',
  examples: 'Жишээ',
  practice: 'Дасгал',
  test1: 'Анхан сорил',
  test2: 'Дунд сорил',
  test3: 'Ахисан сорил',
};
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

/**
 * What a version shows: for a file import, only the parts the file brought in (older imports, saved
 * before this was recorded: the parts that differ from the version before); otherwise the parts
 * that are not empty.
 */
function summary(v: TopicVersion, older?: TopicVersion): string {
  const brought = (key: PartKey) =>
    v.parts ? v.parts.includes(key) : older ? partHash(v.topic[key]) !== partHash(older.topic[key]) : partSize(key, v.topic[key]) > 0;
  const shown = PARTS.filter((p) => (v.kind === 'import' ? brought(p.key) : partSize(p.key, v.topic[p.key]) > 0));
  return shown.map((p) => `${PART_NAME[p.key]} ${partSize(p.key, v.topic[p.key])} ${p.unit}`).join(' • ');
}

/**
 * A part's own history: a row for each time a file brought it in (and the lesson's first
 * version), newest first. Hand edits do not add rows: the newest row is the part as it is on the
 * site now, under the time it last changed.
 */
function partVersions(list: TopicVersion[], key: PartKey, site: TopicPackage): PartVersion[] {
  const rows: PartVersion[] = [];
  const oldestFirst = [...list].reverse();
  oldestFirst.forEach((v, i) => {
    const value = v.topic[key];
    // An empty part (nothing in it yet) is not a version of that part
    if (value === undefined || partSize(key, value) === 0) return;
    const brought = v.parts
      ? v.parts.includes(key)
      : i === 0 || partHash(value) !== partHash(oldestFirst[i - 1].topic[key]); // older versions: when it changed
    if (!brought && rows.length) return;
    rows.push({ hash: partHash(value), value, at: v.updatedAt ?? v.savedAt });
  });
  if (rows.length) {
    // The newest row holds what the site has now, dated by the version in use
    const inUse = list.find((v) => v.current) ?? list[0];
    const last = rows[rows.length - 1];
    last.value = site[key];
    last.hash = partHash(site[key]);
    last.at = Math.max(last.at, inUse ? inUse.updatedAt ?? inUse.savedAt : 0);
  }
  // Same content twice: shown once
  const seen = new Set<string>();
  return rows.reverse().filter((r) => !seen.has(r.hash) && seen.add(r.hash));
}

/** The topic's saved versions: view, switch to or delete any of them. */
export const TopicHistoryDialog: React.FC<{
  topic: TopicPackage;
  // The lesson as saved on the site (the editor may hold unsaved changes)
  saved: TopicPackage;
  onSwitchPart: (key: PartKey, value: unknown) => void;
  // The last version, the one in use, was deleted: the lesson is emptied on the site
  onLessonDeleted: () => void;
  // JSON edited in the viewer goes on the site (true when it did)
  onApplyJson: (data: unknown, part: 'all' | PartKey, versionId?: string) => boolean;
  onClose: () => void;
}> = ({ topic, saved, onSwitchPart, onLessonDeleted, onApplyJson, onClose }) => {
  const [tab, setTab] = useState<Tab>('all');
  const [list, setList] = useState<TopicVersion[] | null>(null);
  const [error, setError] = useState(false);
  // The JSON being viewed in full
  // The JSON being viewed (and edited); `part` and `current` say where an edit goes
  const [viewing, setViewing] = useState<{ title: string; text: string; part: 'all' | PartKey; current: boolean; versionId?: string } | null>(null);
  const [draft, setDraft] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const view = (v: { title: string; text: string; part: 'all' | PartKey; current: boolean; versionId?: string }) => {
    setViewing(v);
    setDraft(v.text);
    setJsonError(null);
  };
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
              const currentHash = partHash(saved[tab]);
              return partVersions(list, tab, saved).map((pv) => (
                <div key={pv.hash} className="px-4 py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-stone-900">{when(pv.at)}</div>
                    <div className="text-[11px] text-stone-500">
                      {part.label}: {partSize(tab, pv.value)} {part.unit}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => view({ title: `${part.label} • ${when(pv.at)}`, text: JSON.stringify(pv.value, null, 2), part: tab, current: pv.hash === currentHash })}
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
            list.map((v, i) => (
              <div key={v.id} className="px-4 py-2.5 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-stone-900">
                    {when(v.updatedAt ?? v.savedAt)} <span className="ml-1 font-semibold text-stone-500">{v.file || KIND_LABEL[v.kind]}</span>
                  </div>
                  <div className="text-[11px] text-stone-500">{summary(v, list[i + 1])}</div>
                </div>
                <button
                  type="button"
                  onClick={() => view({ title: `${when(v.updatedAt ?? v.savedAt)} • ${KIND_LABEL[v.kind]}`, text: topicJson(v.topic), part: 'all', current: !!v.current, versionId: v.id })}
                  className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                  title="JSON-ийг бүтнээр нь харах"
                  aria-label="Харах"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const last = list.length === 1;
                    const question = last
                      ? 'Энэ бол үлдсэн цорын ганц мөр. Устгавал энэ хичээлийн агуулга (онол, жишээ, дасгал, сорил) сайтаас бүрэн устна. Устгах уу?'
                      : `${when(v.updatedAt ?? v.savedAt)}-ий мөрийг устгах уу? Сайт дээрх хичээл өөрчлөгдөхгүй.`;
                    if (!window.confirm(question)) return;
                    deleteTopicVersion(topic.id, v, true)
                      .then(() => {
                        setList((l) => l?.filter((x) => x.id !== v.id) ?? l);
                        if (last) onLessonDeleted();
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
                  // The edited version's row is updated (and goes in use); no new row
                  if (onApplyJson(data, viewing.part, viewing.versionId)) setViewing(null);
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
