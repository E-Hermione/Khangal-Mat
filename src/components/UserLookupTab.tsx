import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Search, User, Smartphone, ShieldCheck, ClipboardList, Send, Laptop, Tablet } from 'lucide-react';
import { accessRequestService } from '../services/accessRequestService';
import { userPermissionsService } from '../services/userPermissionsService';
import { storageService } from '../services/storageService';
import { loadUserAttempts, AttemptMap, ExamAttempt } from '../services/examAttempts';
import { DeviceSession } from '../services/deviceSessions';
import { getDb } from '../services/firebase';
import { GRADE_TOPICS_CATALOG } from '../data/initialData';
import { ApprovedAccount } from '../types';

interface UserLookupTabProps {
  // Opens the permissions editor for this user id
  onEditPermissions: (userId: string) => void;
  // Pre-selects a user (e.g. from the registered users list)
  initialUid?: string | null;
}

const TIER_NAMES: Record<string, string> = { '1': 'Анхан', '2': 'Дунд', '3': 'Ахисан' };
const SECTION_NAMES: Record<string, string> = {
  theory: 'Онол',
  examples: 'Жишээ',
  practice: 'Дасгал',
  exams: 'Сорил',
};

function topicTitle(topicId: string): string {
  const saved = storageService.getTopics().find((t) => t.id === topicId);
  const catalog = Object.values(GRADE_TOPICS_CATALOG).flat().find((t) => t.id === topicId);
  return saved?.title || catalog?.title || topicId;
}

// "g6-divisibility-test2" -> { title: "Хуваагдах шинж", tier: "Дунд", maxPoints: 15 }
function examInfo(examId: string) {
  const m = examId.match(/^(.*)-test([123])$/);
  if (!m) return { title: examId, tier: '', maxPoints: 0 };
  const [, topicId, tier] = m;
  const saved = storageService.getTopics().find((t) => t.id === topicId);
  const pkg = saved?.[`test${tier}` as 'test1' | 'test2' | 'test3'];
  const fallbackMax = tier === '1' ? 10 : tier === '2' ? 15 : 20;
  return { title: topicTitle(topicId), tier: TIER_NAMES[tier], maxPoints: pkg?.totalPoints || fallbackMax };
}

function formatDate(ms?: number): string {
  return ms ? new Date(ms).toLocaleString() : '—';
}

function timeAgo(ms?: number): string {
  if (!ms) return 'Мэдээлэлгүй';
  const minutes = Math.floor((Date.now() - ms) / 60000);
  if (minutes < 10) return 'Саяхан идэвхтэй';
  if (minutes < 60) return `${minutes} минутын өмнө`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} өдрийн өмнө` : new Date(ms).toLocaleDateString();
}

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
    <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
      {icon}
      <span>{title}</span>
    </h4>
    {children}
  </div>
);

export const UserLookupTab: React.FC<UserLookupTabProps> = ({ onEditPermissions, initialUid }) => {
  const [query, setQuery] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(initialUid || null);
  const [accounts, setAccounts] = useState<ApprovedAccount[]>(() => accessRequestService.getApprovedAccounts());

  const [attempts, setAttempts] = useState<AttemptMap>({});
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setAccounts(accessRequestService.getApprovedAccounts());
    window.addEventListener('cloud-data-updated', refresh);
    return () => window.removeEventListener('cloud-data-updated', refresh);
  }, []);

  useEffect(() => {
    if (initialUid) setSelectedUid(initialUid);
  }, [initialUid]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        (a.userId || '').toLowerCase().includes(q) ||
        a.fullName.toLowerCase().includes(q) ||
        (a.phoneNumber || '').includes(q) ||
        a.email.toLowerCase().includes(q) ||
        (a.school || '').toLowerCase().includes(q)
    );
  }, [accounts, query]);

  const user = accounts.find((a) => a.uid === selectedUid) || null;

  // Load the per-user data that is not in the cloud mirror
  useEffect(() => {
    if (!selectedUid) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setAttempts({});
    setDevices([]);
    Promise.all([
      loadUserAttempts(selectedUid).catch(() => null),
      getDocs(collection(getDb(), 'users', selectedUid, 'devices'))
        .then((snap) => snap.docs.map((d) => d.data() as DeviceSession).filter((d) => !d.revoked))
        .catch(() => null),
    ]).then(([a, d]) => {
      if (cancelled) return;
      setAttempts(a || {});
      setDevices((d || []).sort((x, y) => y.lastActiveAt - x.lastActiveAt));
      if (!a || !d) setLoadError('Зарим мэдээллийг ачаалж чадсангүй. Firestore-ийн дүрмийг шинэчлэх шаардлагатай байж магадгүй.');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedUid]);

  const handleToggleActive = () => {
    if (!user) return;
    accessRequestService.toggleAccountStatus(user.phoneNumber || user.email);
    setAccounts(accessRequestService.getApprovedAccounts());
  };

  const handleDelete = async () => {
    if (!user || !window.confirm(`«${user.fullName}» хэрэглэгчийн бүртгэлийг бүрмөсөн устгах уу?`)) return;
    try {
      await accessRequestService.deleteAccount(user.phoneNumber || user.email);
      setSelectedUid(null);
      setAccounts(accessRequestService.getApprovedAccounts());
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Устгаж чадсангүй.');
    }
  };

  const finished = (Object.entries(attempts) as [string, ExamAttempt][])
    .filter(([, r]) => r.finishedAt)
    .sort(([, a], [, b]) => (b.finishedAt || 0) - (a.finishedAt || 0));
  const percents = finished.map(([id, r]) => {
    const max = examInfo(id).maxPoints;
    return max ? ((r.score || 0) / max) * 100 : 0;
  });
  const average = percents.length ? Math.round(percents.reduce((s, p) => s + p, 0) / percents.length) : null;

  const perms = user?.userId ? userPermissionsService.getUserPermissions(user.userId) : null;
  const requests = user ? accessRequestService.getRequests().filter((r) => r.requesterUid === user.uid) : [];
  const lastActive = devices.length ? devices[0].lastActiveAt : undefined;

  const deviceIcon = (type: DeviceSession['type']) =>
    type === 'mobile' ? <Smartphone className="w-4 h-4" /> : type === 'tablet' ? <Tablet className="w-4 h-4" /> : <Laptop className="w-4 h-4" />;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ID (USR-1234), утас, нэр, имэйл эсвэл сургуулиар хайх..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            autoFocus
          />
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
          {matches.length === 0 ? (
            <span className="text-xs text-stone-400">Хэрэглэгч олдсонгүй.</span>
          ) : (
            matches.map((a) => (
              <button
                key={a.uid}
                type="button"
                onClick={() => setSelectedUid(a.uid || null)}
                className={`px-2.5 py-1 rounded-lg text-xs border cursor-pointer transition-colors ${
                  a.uid === selectedUid
                    ? 'bg-stone-900 text-amber-400 border-stone-900'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-amber-400'
                }`}
              >
                <span className="font-mono font-bold">{a.userId}</span> • {a.fullName}
                {!a.active && <span className="ml-1 text-red-500">(хаагдсан)</span>}
              </button>
            ))
          )}
        </div>
      </div>

      {!user ? (
        <div className="text-center py-12 text-stone-400 text-xs bg-stone-50 rounded-2xl border border-stone-200/60">
          Хэрэглэгч сонгоход түүний бүх мэдээлэл энд харагдана.
        </div>
      ) : (
        <div className="space-y-3" data-testid="user-lookup-details">
          {loadError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">{loadError}</div>
          )}

          <Section icon={<User className="w-4 h-4 text-amber-600" />} title="Үндсэн мэдээлэл">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
              <div><span className="text-stone-500">Нэр:</span> <b>{user.fullName}</b></div>
              <div><span className="text-stone-500">ID:</span> <b className="font-mono">{user.userId}</b></div>
              <div><span className="text-stone-500">Утас:</span> {user.phoneNumber || '—'}</div>
              <div><span className="text-stone-500">Имэйл:</span> {user.email}</div>
              <div><span className="text-stone-500">Сургууль:</span> {user.school || '—'}</div>
              <div>
                <span className="text-stone-500">Төрөл:</span>{' '}
                {user.accountType === 'teacher' ? 'Багш' : user.grades?.length ? `Сурагч, ${user.grades.join(', ')}-р анги` : 'Сурагч'}
              </div>
              <div><span className="text-stone-500">Бүртгүүлсэн:</span> {formatDate(user.approvedAt)}</div>
              <div>
                <span className="text-stone-500">Төлөв:</span>{' '}
                <b className={user.active ? 'text-emerald-700' : 'text-red-600'}>{user.active ? 'Идэвхтэй' : 'Хаагдсан'}</b>
              </div>
            </div>
          </Section>

          <Section icon={<Smartphone className="w-4 h-4 text-purple-600" />} title="Идэвх ба төхөөрөмжүүд">
            <div className="text-xs">
              <span className="text-stone-500">Хамгийн сүүлд:</span> <b>{loading ? '...' : timeAgo(lastActive)}</b>
            </div>
            {!loading && devices.length === 0 ? (
              <div className="text-xs text-stone-400">Нэвтэрсэн төхөөрөмж алга.</div>
            ) : (
              <div className="space-y-1">
                {devices.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs text-stone-700">
                    <span className="flex items-center gap-1.5 text-stone-500">
                      {deviceIcon(d.type)} <span className="text-stone-800">{d.name}</span>
                    </span>
                    <span className="text-stone-500">{timeAgo(d.lastActiveAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />} title="Эрх">
            {perms && (
              <div className="text-xs space-y-1">
                <div>
                  <span className="text-stone-500">Үзэх ангиуд:</span>{' '}
                  {perms.allowedGrades.length ? perms.allowedGrades.sort((a, b) => a - b).join(', ') : 'Байхгүй'}
                </div>
                <div>
                  <span className="text-stone-500">Нээлттэй хэсгүүд:</span>{' '}
                  {Object.entries(perms.sections)
                    .filter(([, on]) => on)
                    .map(([k]) => SECTION_NAMES[k] || k)
                    .join(', ') || 'Байхгүй'}
                </div>
                {perms.isBlocked && <div className="text-red-600 font-bold">Хичээл үзэх эрх хаагдсан</div>}
              </div>
            )}
          </Section>

          <Section icon={<ClipboardList className="w-4 h-4 text-sky-600" />} title="Шалгалтын дүн">
            {loading ? (
              <div className="text-xs text-stone-400">Ачаалж байна...</div>
            ) : finished.length === 0 ? (
              <div className="text-xs text-stone-400">Шалгалт өгөөгүй байна.</div>
            ) : (
              <>
                <div className="text-xs">
                  <span className="text-stone-500">Нийт:</span> <b>{finished.length} сорил</b>
                  {average !== null && (
                    <>
                      {' '}
                      • <span className="text-stone-500">Дундаж:</span> <b>{average}%</b>
                    </>
                  )}
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-stone-100">
                    {finished.map(([id, r]) => {
                      const info = examInfo(id);
                      return (
                        <tr key={id}>
                          <td className="py-1 pr-2 text-stone-800">
                            {info.title} <span className="text-stone-400">— {info.tier}</span>
                          </td>
                          <td className="py-1 pr-2 font-bold whitespace-nowrap">
                            {r.score ?? 0}
                            {info.maxPoints ? ` / ${info.maxPoints}` : ''} оноо
                          </td>
                          <td className="py-1 text-stone-500 whitespace-nowrap text-right">{formatDate(r.finishedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </Section>

          <Section icon={<Send className="w-4 h-4 text-rose-600" />} title="Сэдэв нээлгэх хүсэлтүүд">
            {requests.length === 0 ? (
              <div className="text-xs text-stone-400">Хүсэлт илгээгээгүй.</div>
            ) : (
              <div className="space-y-1 text-xs">
                {requests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between">
                    <span className="text-stone-800">{r.requestedTopicTitle || r.requestedTopicId}</span>
                    <span className="text-stone-500">
                      {{ pending: 'Хүлээгдэж буй', approved: 'Зөвшөөрсөн', rejected: 'Татгалзсан', expired: 'Хугацаа дууссан' }[r.status]}
                      {' • '}
                      {new Date(r.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleToggleActive}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer border ${
                user.active
                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              {user.active ? 'Бүртгэлийг хаах' : 'Бүртгэлийг нээх'}
            </button>
            {user.userId && (
              <button
                type="button"
                onClick={() => onEditPermissions(user.userId!)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300"
              >
                Эрх тохируулах
              </button>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
            >
              Устгах
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
