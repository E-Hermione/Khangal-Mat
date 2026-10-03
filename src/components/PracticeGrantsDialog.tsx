import React, { useEffect, useMemo, useState } from 'react';
import { CheckSquare, Search, Square, X } from 'lucide-react';
import { TopicPackage } from '../types';
import { cloud } from '../services/cloud';
import { ADMIN_EMAIL } from '../services/authService';
import { loadPracticeGrants, savePracticeGrants } from '../services/practiceSolutions';

/** Admin: choose the users who see this topic's practice answers and solutions. */
export const PracticeGrantsDialog: React.FC<{ topic: TopicPackage; onClose: () => void; onSaved: (count: number) => void }> = ({
  topic,
  onClose,
  onSaved,
}) => {
  const users = useMemo(
    () =>
      cloud
        .getUsers()
        .filter((u) => u.email !== ADMIN_EMAIL)
        .sort((a, b) => a.userId.localeCompare(b.userId)),
    []
  );
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPracticeGrants(topic.id)
      .then((uids) => setSelected(new Set(uids)))
      .catch(() => setSelected(new Set()));
  }, [topic.id]);

  const q = query.trim().toLowerCase();
  const shown = users.filter(
    (u) =>
      !q ||
      u.userId.toLowerCase().includes(q) ||
      u.phoneNumber.includes(q) ||
      u.fullName.toLowerCase().includes(q)
  );

  const toggle = (uid: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });

  const allShownSelected = !!selected && shown.length > 0 && shown.every((u) => selected.has(u.uid));
  const toggleAllShown = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      shown.forEach((u) => (allShownSelected ? next.delete(u.uid) : next.add(u.uid)));
      return next;
    });

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await savePracticeGrants(topic, [...selected]);
      onSaved(selected.size);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Хадгалж чадсангүй. Firestore-ийн дүрмийг шинэчилсэн эсэхээ шалгана уу.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 no-print" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        data-testid="practice-grants"
      >
        <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-stone-900">Дасгалын бодолт нээх</h3>
            <p className="text-[11px] text-stone-500">«{topic.title}» сэдвийн дасгалын хариу, бодолтыг харах хэрэглэгчид</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-stone-100 cursor-pointer" aria-label="Хаах">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        <div className="px-5 pt-3 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ID-ийн тоо, утас эсвэл нэрээр хайх"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <button type="button" onClick={toggleAllShown} className="font-bold text-amber-700 hover:text-amber-800 cursor-pointer">
              {allShownSelected ? 'Харагдаж буйг арилгах' : 'Харагдаж буйг бүгдийг сонгох'}
            </button>
            <span className="text-stone-500">{selected ? selected.size : '…'} хэрэглэгч сонгосон</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1">
          {selected === null ? (
            <div className="text-xs text-stone-400 py-4">Ачаалж байна…</div>
          ) : shown.length === 0 ? (
            <div className="text-xs text-stone-400 py-4">Хэрэглэгч олдсонгүй.</div>
          ) : (
            shown.map((u) => {
              const on = selected.has(u.uid);
              return (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => toggle(u.uid)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left cursor-pointer ${
                    on ? 'border-amber-400 bg-amber-50' : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {on ? <CheckSquare className="w-4 h-4 text-amber-600 shrink-0" /> : <Square className="w-4 h-4 text-stone-400 shrink-0" />}
                  <span className="text-sm font-bold text-stone-900">{u.userId}</span>
                  <span className="text-xs text-stone-600 truncate">
                    {u.fullName} • {u.phoneNumber}
                    {u.grades?.length ? ` • ${u.grades.join(', ')}-р анги` : ''}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-stone-200 flex items-center justify-end gap-2">
          {error && <span className="text-xs text-red-700 mr-auto">{error}</span>}
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-stone-300 text-sm font-bold cursor-pointer">
            Болих
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selected}
            className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-black text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Хадгалж байна…' : 'Хадгалах'}
          </button>
        </div>
      </div>
    </div>
  );
};
