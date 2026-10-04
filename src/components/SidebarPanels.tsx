import React, { useEffect, useState } from 'react';
import { collectionGroup, getDocs } from 'firebase/firestore';
import { ChevronRight, ClipboardCheck, CreditCard, Users } from 'lucide-react';
import { learningPlan, topicMeta, useLearningPlanVersion } from '../services/learningPlan';
import { subscribeAllPaymentRequests } from '../services/payments';
import { cloud } from '../services/cloud';
import { getDb } from '../services/firebase';
import { ADMIN_EMAIL } from '../services/authService';
import { ProgressRing } from './ProgressRing';

// Exams page: all tests of a grade, or only the user's plan topics
export type ExamFilter = 'all' | 'plan';

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

const MemberHome: React.FC<{ uid?: string; userId?: string; onOpenPlan: () => void }> = ({ onOpenPlan }) => {
  useLearningPlanVersion();
  const plan = learningPlan.plan();
  const hasPlan = learningPlan.hasPlan();
  const overall = plan.length
    ? Math.round(plan.reduce((sum, p) => sum + learningPlan.progress(p.topicId), 0) / plan.length)
    : 0;
  const done = plan.filter((p) => learningPlan.isDone(p.topicId)).length;
  const next = plan.find((p) => !learningPlan.isDone(p.topicId));

  return (
    <div className="p-3 space-y-3" data-testid="home-panel">
      <Label>Миний төлөвлөгөө</Label>
      {hasPlan ? (
        <Panel className="space-y-3">
          <div className="flex items-center gap-3">
            <ProgressRing percent={overall} size={44} />
            <div className="text-xs text-stone-300 leading-snug">
              <b className="text-white text-sm">
                {done}/{plan.length}
              </b>{' '}
              сэдэв үзсэн
              <span className="block text-stone-500">
                {learningPlan.isPaid() ? 'Хичээлүүд нээлттэй' : 'Төлбөрийн дараа нээгдэнэ'}
              </span>
            </div>
          </div>
          {next && (
            <div className="text-[11px] text-stone-400">
              Дараагийн сэдэв: <span className="text-stone-200 font-bold">{topicMeta(next.topicId).title}</span>
            </div>
          )}
          <button
            type="button"
            onClick={onOpenPlan}
            className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold cursor-pointer"
            data-testid="open-plan"
          >
            Миний төлөвлөгөө харах
          </button>
        </Panel>
      ) : (
        <Panel className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-stone-400">
            <ClipboardCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            Түвшин тогтоох сорил өгөхөд танд зориулсан сургалтын төлөвлөгөө гарна.
          </div>
          <button
            type="button"
            onClick={onOpenPlan}
            className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold cursor-pointer"
            data-testid="open-plan"
          >
            Миний төлөвлөгөө харах
          </button>
        </Panel>
      )}
    </div>
  );
};

const AdminOverview: React.FC<{ onOpenAccessRequests?: () => void }> = ({ onOpenAccessRequests }) => {
  const [pending, setPending] = useState(0);
  const [users, setUsers] = useState(() => cloud.getUsers());
  const [placementUids, setPlacementUids] = useState<Set<string> | null>(null);

  useEffect(() => subscribeAllPaymentRequests((list) => setPending(list.filter((r) => r.status === 'pending').length)), []);
  useEffect(() => {
    const refresh = () => setUsers(cloud.getUsers());
    window.addEventListener('users-updated', refresh);
    return () => window.removeEventListener('users-updated', refresh);
  }, []);
  useEffect(() => {
    getDocs(collectionGroup(getDb(), 'placement'))
      .then((snap) => setPlacementUids(new Set(snap.docs.map((d) => d.ref.parent.parent?.id || ''))))
      .catch(() => setPlacementUids(null));
  }, []);

  const members = users.filter((u) => u.email !== ADMIN_EMAIL);
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const newToday = members.filter((u) => u.createdAt >= startOfToday).length;
  // People, not attempts; the admin's own test runs ("view as user") are left out
  const placementTakers = placementUids ? members.filter((u) => placementUids.has(u.uid)).length : null;

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
