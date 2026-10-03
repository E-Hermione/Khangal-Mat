import React, { useEffect, useMemo, useState } from 'react';
import { Megaphone, Send, Trash2, Users } from 'lucide-react';
import { cloud } from '../services/cloud';
import {
  Announcement,
  deleteAnnouncement,
  isExpired,
  updateAnnouncementExpiry,
  loadAnnouncementsWithReads,
  sendAnnouncement,
} from '../services/announcements';
import { ADMIN_EMAIL } from '../services/authService';
import { matchesUserToken } from '../services/userPermissionsService';
import { GradeNumber, UserProfile } from '../types';

type Audience = 'all' | 'grades' | 'users';

const GRADES: GradeNumber[] = [6, 7, 8, 9, 10, 11, 12];

// yyyy-mm-dd for date inputs, and the end of such a day
function dateInput(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayEnd(value: string): number | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString();
}

/** Admin: write an announcement and send it to everyone, whole grades or chosen users. */
export const AnnouncementsTab: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>(() => cloud.getUsers());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [grades, setGrades] = useState<GradeNumber[]>([]);
  const [idsInput, setIdsInput] = useState('');
  // Last day it is shown ('' = no end)
  const [untilDate, setUntilDate] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [sent, setSent] = useState<(Announcement & { readCount: number })[] | null>(null);

  useEffect(() => {
    const refresh = () => setUsers(cloud.getUsers());
    window.addEventListener('users-updated', refresh);
    return () => window.removeEventListener('users-updated', refresh);
  }, []);

  const reload = () =>
    loadAnnouncementsWithReads()
      .then(setSent)
      .catch((err) => {
        console.error(err);
        setSent([]);
      });
  useEffect(() => {
    reload();
  }, []);

  // Everyone except the admin
  const members = useMemo(() => users.filter((u) => u.email !== ADMIN_EMAIL), [users]);

  // Who the current choice reaches
  const target = useMemo(() => {
    if (audience === 'all') return { uids: [] as string[], label: 'Бүх хэрэглэгч', unknown: [] as string[], count: members.length };
    if (audience === 'grades') {
      const chosen = members.filter(
        (u) =>
          (u.grades || []).some((g) => grades.includes(g))
      );
      const parts = [...grades].sort((a, b) => a - b).map((g) => `${g}-р анги`);
      return { uids: chosen.map((u) => u.uid), label: parts.join(', '), unknown: [], count: chosen.length };
    }
    const tokens = idsInput.split(/[,\s;]+/).map((t) => t.trim()).filter(Boolean);
    const uids: string[] = [];
    const unknown: string[] = [];
    for (const token of tokens) {
      const user = members.find((u) => matchesUserToken(u.userId, u.phoneNumber, token));
      if (user) {
        if (!uids.includes(user.uid)) uids.push(user.uid);
      } else {
        unknown.push(token);
      }
    }
    const ids = uids.map((uid) => members.find((u) => u.uid === uid)!.userId);
    const label = ids.length <= 3 ? ids.join(', ') : `${ids.length} хэрэглэгч`;
    return { uids, label, unknown, count: uids.length };
  }, [audience, members, grades, idsInput]);

  const canSend = title.trim() !== '' && body.trim() !== '' && (audience === 'all' || target.count > 0) && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setStatus(null);
    try {
      await sendAnnouncement({
        title: title.trim(),
        body: body.trim(),
        audience: audience === 'all' ? 'all' : 'group',
        targetLabel: target.label,
        recipientUids: target.uids,
        expiresAt: dayEnd(untilDate),
      });
      setStatus({ ok: true, text: `Зарлал илгээгдлээ: ${target.label} (${target.count} хэрэглэгч)` });
      setTitle('');
      setBody('');
      setUntilDate('');
      reload();
    } catch (err) {
      console.error(err);
      setStatus({ ok: false, text: 'Илгээж чадсангүй. Дахин оролдоно уу.' });
    } finally {
      setSending(false);
    }
  };

  const handleExpiry = async (ann: Announcement, value: string) => {
    try {
      await updateAnnouncementExpiry(ann, dayEnd(value));
      reload();
    } catch (err) {
      console.error(err);
      alert('Хадгалж чадсангүй.');
    }
  };

  const handleDelete = async (ann: Announcement) => {
    if (!window.confirm(`"${ann.title}" зарлалыг устгах уу? Хэрэглэгчдэд харагдахаа болино.`)) return;
    try {
      await deleteAnnouncement(ann);
      reload();
    } catch (err) {
      console.error(err);
      alert('Устгаж чадсангүй.');
    }
  };

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
      active ? 'bg-stone-900 text-amber-400 border-stone-900' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
    }`;

  return (
    <div className="space-y-5">
      <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-3">
        <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
          <Megaphone className="w-4 h-4 text-amber-600" />
          <span>Шинэ зарлал</span>
        </h4>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Гарчиг"
          maxLength={120}
          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Зарлалын агуулга"
          rows={4}
          maxLength={4000}
          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />

        <div className="space-y-1.5">
          <div className="text-xs font-bold text-stone-600">Хэдийг хүртэл харуулах вэ?</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" className={chip(!untilDate)} onClick={() => setUntilDate('')}>
              Хугацаагүй
            </button>
            {[
              { label: '1 долоо хоног', days: 7 },
              { label: '1 сар', days: 30 },
            ].map((o) => (
              <button
                key={o.days}
                type="button"
                className={chip(untilDate === dateInput(Date.now() + o.days * 86400000))}
                onClick={() => setUntilDate(dateInput(Date.now() + o.days * 86400000))}
              >
                {o.label}
              </button>
            ))}
            <input
              type="date"
              value={untilDate}
              min={dateInput(Date.now())}
              onChange={(e) => setUntilDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
              data-testid="announce-until"
            />
          </div>
          <div className="text-[11px] text-stone-500">
            {untilDate
              ? `${new Date(dayEnd(untilDate)!).toLocaleDateString()} хүртэл харагдаад автоматаар алга болно.`
              : 'Устгах хүртэл харагдана.'}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-stone-600">Хэнд илгээх вэ?</div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={chip(audience === 'all')} onClick={() => setAudience('all')}>
              Бүгдэд
            </button>
            <button type="button" className={chip(audience === 'grades')} onClick={() => setAudience('grades')}>
              Ангиар
            </button>
            <button type="button" className={chip(audience === 'users')} onClick={() => setAudience('users')}>
              Сонгосон хэрэглэгчид
            </button>
          </div>

          {audience === 'grades' && (
            <div className="flex flex-wrap gap-1.5">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={chip(grades.includes(g))}
                  onClick={() => setGrades((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))}
                >
                  {g}-р анги
                </button>
              ))}
            </div>
          )}

          {audience === 'users' && (
            <div className="space-y-1">
              <input
                value={idsInput}
                onChange={(e) => setIdsInput(e.target.value)}
                placeholder="ID-ийн тоо эсвэл утас, таслалаар: 1234, 99112233"
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {target.unknown.length > 0 && (
                <div className="text-[11px] text-red-700">Олдсонгүй: {target.unknown.join(', ')}</div>
              )}
            </div>
          )}

          <div className="text-xs text-stone-500 flex items-center gap-1.5" data-testid="announce-target">
            <Users className="w-3.5 h-3.5" />
            <span>
              {audience === 'all'
                ? `Бүх хэрэглэгч (одоо ${target.count}), дараа бүртгүүлэх хүмүүст ч харагдана`
                : `${target.count} хэрэглэгчид очно`}
            </span>
          </div>
        </div>

        {status && (
          <div className={`text-xs font-medium ${status.ok ? 'text-emerald-700' : 'text-red-700'}`}>{status.text}</div>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="px-4 py-2 rounded-lg text-xs font-bold bg-stone-900 text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5 text-amber-400" />
          <span>{sending ? 'Илгээж байна…' : 'Илгээх'}</span>
        </button>
      </div>

      <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
        <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide">Илгээсэн зарлалууд</h4>
        {sent === null ? (
          <div className="text-xs text-stone-400">Ачаалж байна…</div>
        ) : sent.length === 0 ? (
          <div className="text-xs text-stone-400">Одоогоор зарлал илгээгээгүй.</div>
        ) : (
          <div className="space-y-2" data-testid="sent-announcements">
            {sent.map((a) => {
              const total = a.audience === 'all' ? members.length : a.recipientUids.length;
              return (
                <div key={a.id} className="p-3 rounded-lg border border-stone-200 bg-stone-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-stone-900">{a.title}</div>
                      <div className="text-[11px] text-stone-500">
                        {formatDate(a.createdAt)} • {a.targetLabel} • {Math.min(a.readCount, total)}/{total} уншсан
                      </div>
                      <div className="text-[11px] mt-1 flex items-center gap-1.5 flex-wrap">
                        {isExpired(a) ? (
                          <span className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-600 font-bold">Хугацаа дууссан</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Харагдаж байна</span>
                        )}
                        <span className="text-stone-500">хүртэл:</span>
                        <input
                          type="date"
                          value={typeof a.expiresAt === 'number' ? dateInput(a.expiresAt) : ''}
                          onChange={(e) => handleExpiry(a, e.target.value)}
                          className="px-1.5 py-0.5 rounded border border-stone-300 bg-white text-[11px]"
                          title="Харуулах эцсийн өдөр (хоосон бол хугацаагүй)"
                        />
                        {typeof a.expiresAt === 'number' && (
                          <button
                            type="button"
                            onClick={() => handleExpiry(a, '')}
                            className="text-stone-500 hover:text-stone-800 underline cursor-pointer"
                          >
                            хугацаагүй болгох
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(a)}
                      className="p-1.5 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                      title="Устгах"
                      aria-label="Устгах"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-stone-700 mt-1.5 whitespace-pre-wrap">{a.body}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
