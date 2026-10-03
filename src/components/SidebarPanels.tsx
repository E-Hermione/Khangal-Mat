import React, { useEffect, useMemo, useState } from 'react';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { Bell, CalendarClock, ChevronRight, ClipboardCheck, CreditCard, Megaphone, Users, X } from 'lucide-react';
import { GradeNumber } from '../types';
import {
  attemptPercent,
  learningPlan,
  PASS_PERCENT,
  topicMeta,
  useLearningPlanVersion,
} from '../services/learningPlan';
import { userPermissionsService } from '../services/userPermissionsService';
import { InboxItem, markAnnouncementsRead, subscribeMyAnnouncements } from '../services/announcements';
import { subscribeAllPaymentRequests } from '../services/payments';
import { cloud } from '../services/cloud';
import { getDb } from '../services/firebase';
import { ADMIN_EMAIL } from '../services/authService';
import { ProgressRing } from './ProgressRing';

export type ExamFilter = 'all' | 'plan' | 'untaken' | 'passed';

const TIER_NAMES = ['Анхан', 'Дунд', 'Ахисан'];
const DAY = 24 * 60 * 60 * 1000;

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-1 mb-1.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">{children}</div>
);

const Panel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-stone-800 bg-stone-950/40 p-3 ${className}`}>{children}</div>
);

/* ------------------------------- home ------------------------------- */

/** Sidebar on the home page: progress, access period and recent announcements (admin: an overview). */
export const HomePanel: React.FC<{
  uid?: string;
  userId?: string;
  isAdmin: boolean;
  onOpenPlan: () => void;
  onOpenAccessRequests?: () => void;
}> = ({ uid, userId, isAdmin, onOpenPlan, onOpenAccessRequests }) =>
  isAdmin ? <AdminOverview onOpenAccessRequests={onOpenAccessRequests} /> : <MemberHome uid={uid} userId={userId} onOpenPlan={onOpenPlan} />;

const MemberHome: React.FC<{ uid?: string; userId?: string; onOpenPlan: () => void }> = ({ uid, userId, onOpenPlan }) => {
  useLearningPlanVersion();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<InboxItem | null>(null);

  useEffect(
    () =>
      uid
        ? subscribeMyAnnouncements(uid, (list, reads) => {
            setItems(list);
            setReadIds(reads);
          })
        : undefined,
    [uid]
  );

  const plan = learningPlan.plan();
  const overall = plan.length
    ? Math.round(plan.reduce((sum, p) => sum + learningPlan.progress(p.topicId), 0) / plan.length)
    : 0;
  const done = plan.filter((p) => learningPlan.isDone(p.topicId)).length;

  const expiresAt = userId ? userPermissionsService.getUserPermissions(userId).expiresAt : null;
  const daysLeft = typeof expiresAt === 'number' ? Math.ceil((expiresAt - Date.now()) / DAY) : null;

  const openItem = (a: InboxItem) => {
    setOpen(a);
    if (uid && !readIds.has(a.id)) markAnnouncementsRead(uid, [a.id]).catch(() => {});
  };

  return (
    <div className="p-3 space-y-4" data-testid="home-panel">
      <div>
        <Label>Миний явц</Label>
        {learningPlan.hasPlan() ? (
          <button
            type="button"
            onClick={onOpenPlan}
            className="w-full text-left rounded-xl border border-stone-800 bg-stone-950/40 p-3 flex items-center gap-3 hover:bg-stone-800/60 cursor-pointer"
          >
            <ProgressRing percent={overall} size={44} />
            <span className="text-xs text-stone-300 leading-snug">
              <b className="text-white text-sm">
                {done}/{plan.length}
              </b>{' '}
              сэдэв үзсэн
              <span className="block text-stone-500">Төлөвлөгөө харах →</span>
            </span>
          </button>
        ) : (
          <Panel>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <ClipboardCheck className="w-4 h-4 text-amber-400 shrink-0" />
              Түвшин тогтоох сорил өгсний дараа явц энд харагдана.
            </div>
          </Panel>
        )}
      </div>

      <div>
        <Label>Эрхийн хугацаа</Label>
        <Panel>
          <div className="flex items-center gap-2.5">
            <CalendarClock
              className={`w-5 h-5 shrink-0 ${
                daysLeft === null ? 'text-stone-500' : daysLeft > 7 ? 'text-emerald-400' : daysLeft > 0 ? 'text-amber-400' : 'text-red-400'
              }`}
            />
            <div className="text-xs text-stone-300" data-testid="access-days">
              {daysLeft === null ? (
                learningPlan.isGated() ? 'Эрх аваагүй байна' : 'Хугацаагүй'
              ) : daysLeft > 0 ? (
                <>
                  <b className="text-white text-sm">{daysLeft}</b> хоног үлдсэн
                  <span className="block text-stone-500">{new Date(expiresAt!).toLocaleDateString()} хүртэл</span>
                </>
              ) : (
                <span className="text-red-300">Хугацаа дууссан</span>
              )}
            </div>
          </div>
        </Panel>
      </div>

      <div>
        <Label>Сүүлийн зарлалууд</Label>
        {items.length === 0 ? (
          <Panel>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              <Bell className="w-4 h-4 shrink-0" /> Зарлал алга
            </div>
          </Panel>
        ) : (
          <div className="space-y-1.5" data-testid="recent-announcements">
            {items.slice(0, 3).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => openItem(a)}
                className="w-full text-left rounded-xl border border-stone-800 bg-stone-950/40 px-3 py-2 hover:bg-stone-800/60 cursor-pointer flex items-start gap-2"
              >
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${readIds.has(a.id) ? 'bg-stone-600' : 'bg-amber-400'}`}
                />
                <span className="min-w-0">
                  <span className={`block text-xs truncate ${readIds.has(a.id) ? 'text-stone-300' : 'text-white font-bold'}`}>
                    {a.title}
                  </span>
                  <span className="block text-[10px] text-stone-500">{new Date(a.createdAt).toLocaleDateString()}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-extrabold text-stone-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-600" /> {open.title}
              </h3>
              <button type="button" onClick={() => setOpen(null)} className="p-1 rounded-md hover:bg-stone-100 cursor-pointer" aria-label="Хаах">
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>
            <div className="p-5">
              <div className="text-[11px] text-stone-500 mb-2">{new Date(open.createdAt).toLocaleString()}</div>
              <div className="text-sm text-stone-800 whitespace-pre-wrap">{open.body}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminOverview: React.FC<{ onOpenAccessRequests?: () => void }> = ({ onOpenAccessRequests }) => {
  const [pending, setPending] = useState(0);
  const [users, setUsers] = useState(() => cloud.getUsers());
  const [placementTakers, setPlacementTakers] = useState<number | null>(null);

  useEffect(() => subscribeAllPaymentRequests((list) => setPending(list.filter((r) => r.status === 'pending').length)), []);
  useEffect(() => {
    const refresh = () => setUsers(cloud.getUsers());
    window.addEventListener('users-updated', refresh);
    return () => window.removeEventListener('users-updated', refresh);
  }, []);
  useEffect(() => {
    getDocs(collectionGroup(getDb(), 'placement'))
      .then((snap) => setPlacementTakers(new Set(snap.docs.map((d) => d.ref.parent.parent?.id)).size))
      .catch(() => setPlacementTakers(null));
  }, []);

  const members = users.filter((u) => u.email !== ADMIN_EMAIL);
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const newToday = members.filter((u) => u.createdAt >= startOfToday).length;

  const Stat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; onClick?: () => void; alert?: boolean }> = ({
    icon,
    label,
    value,
    onClick,
    alert,
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-full text-left rounded-xl border px-3 py-2.5 flex items-center gap-3 ${
        alert ? 'border-amber-500/60 bg-amber-500/10' : 'border-stone-800 bg-stone-950/40'
      } ${onClick ? 'hover:bg-stone-800/60 cursor-pointer' : ''}`}
    >
      <span className={alert ? 'text-amber-400' : 'text-stone-400'}>{icon}</span>
      <span className="flex-1 text-xs text-stone-300">{label}</span>
      <b className={`text-sm ${alert ? 'text-amber-300' : 'text-white'}`}>{value}</b>
      {onClick && <ChevronRight className="w-3.5 h-3.5 text-stone-500" />}
    </button>
  );

  return (
    <div className="p-3 space-y-1.5" data-testid="admin-overview">
      <Label>Шуурхай тойм</Label>
      <Stat
        icon={<CreditCard className="w-4 h-4" />}
        label="Хүлээгдэж буй төлбөр"
        value={pending}
        alert={pending > 0}
        onClick={onOpenAccessRequests}
      />
      <Stat icon={<Users className="w-4 h-4" />} label="Нийт хэрэглэгч" value={members.length} />
      <Stat icon={<Users className="w-4 h-4" />} label="Өнөөдөр бүртгүүлсэн" value={newToday} />
      <Stat
        icon={<ClipboardCheck className="w-4 h-4" />}
        label="Түвшин тогтоох сорил өгсөн"
        value={placementTakers ?? '—'}
      />
    </div>
  );
};

/* ------------------------------- exams ------------------------------- */

/** Sidebar on the exams page (under the grade picker): filters, tier summary and recent results. */
export const ExamsPanel: React.FC<{
  filter: ExamFilter;
  onFilter: (f: ExamFilter) => void;
  onSelectGrade: (g: GradeNumber) => void;
}> = ({ filter, onFilter, onSelectGrade }) => {
  useLearningPlanVersion();
  const attempts = learningPlan.state.attempts;
  const hasPlan = learningPlan.hasPlan();

  const recent = useMemo(
    () =>
      Object.entries(attempts)
        .filter(([, a]) => a.finishedAt)
        .sort((x, y) => (y[1].finishedAt || 0) - (x[1].finishedAt || 0))
        .slice(0, 5)
        .map(([examId, a]) => {
          const m = examId.match(/^(.*)-test([123])$/);
          const topicId = m ? m[1] : examId;
          return { examId, topicId, tier: m ? Number(m[2]) : 1, pct: attemptPercent(examId, a) };
        }),
    [attempts]
  );

  const passedByTier = [1, 2, 3].map(
    (tier) =>
      Object.entries(attempts).filter(([examId, a]) => {
        if (!examId.endsWith(`-test${tier}`)) return false;
        return attemptPercent(examId, { score: a.bestScore ?? a.score, maxPoints: a.maxPoints }) >= PASS_PERCENT;
      }).length
  );

  const filters: { key: ExamFilter; label: string }[] = [
    { key: 'all', label: 'Бүгд' },
    ...(hasPlan ? [{ key: 'plan' as ExamFilter, label: 'Миний төлөвлөгөө' }] : []),
    { key: 'untaken', label: 'Өгөөгүй' },
    { key: 'passed', label: 'Давсан' },
  ];

  return (
    <div className="p-3 space-y-4" data-testid="exams-panel">
      <div>
        <Label>Шүүлтүүр</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilter(f.key)}
              className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                filter === f.key ? 'bg-amber-500 text-stone-950' : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Давсан шат</Label>
        <div className="grid grid-cols-3 gap-1.5" data-testid="tier-summary">
          {TIER_NAMES.map((name, i) => (
            <div key={name} className="rounded-xl border border-stone-800 bg-stone-950/40 py-2 text-center">
              <div className="text-base font-black text-white">{passedByTier[i]}</div>
              <div className="text-[10px] text-stone-400">{name} ✓</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Сүүлийн дүнгүүд</Label>
        {recent.length === 0 ? (
          <Panel>
            <div className="text-xs text-stone-500">Сорил өгөөгүй байна.</div>
          </Panel>
        ) : (
          <div className="space-y-1.5" data-testid="recent-results">
            {recent.map((r) => {
              const meta = topicMeta(r.topicId);
              const passed = r.pct >= PASS_PERCENT;
              return (
                <button
                  key={r.examId}
                  type="button"
                  onClick={() => onSelectGrade(meta.grade)}
                  className="w-full text-left rounded-xl border border-stone-800 bg-stone-950/40 px-3 py-2 hover:bg-stone-800/60 cursor-pointer flex items-center gap-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-stone-200 truncate">{meta.title}</span>
                    <span className="block text-[10px] text-stone-500">
                      {meta.grade}-р анги • {TIER_NAMES[r.tier - 1]}
                    </span>
                  </span>
                  <span
                    className={`text-xs font-black px-1.5 py-0.5 rounded ${
                      passed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {r.pct}%
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
