import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Search, User, Smartphone, ShieldCheck, ClipboardList, Send, Laptop, Tablet, History, Route } from 'lucide-react';
import { accessRequestService } from '../services/accessRequestService';
import { userPermissionsService } from '../services/userPermissionsService';
import { storageService } from '../services/storageService';
import { loadUserAttempts, AttemptMap, ExamAttempt } from '../services/examAttempts';
import { DeviceSession } from '../services/deviceSessions';
import { getDb } from '../services/firebase';
import { GRADE_TOPICS_CATALOG } from '../data/initialData';
import { ApprovedAccount, GradeNumber, TestPackage } from '../types';
import { generateTopicTests } from './ExamsHub';
import { getQuestionOptions, isOptionCorrect } from '../utils/examGrading';
import { MathRenderer } from './MathRenderer';
import { ProgressRing } from './ProgressRing';
import {
  loadPlacementResult,
  PlacementResult,
  resetPlacementResult,
  topicMeta,
  topicProgress,
} from '../services/learningPlan';

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

/** The test an exam id refers to, as the exams page builds it (saved topic or generated). */
function examPackage(examId: string): { topicId: string; pkg: TestPackage } | null {
  const m = examId.match(/^(.*)-test([123])$/);
  if (!m) return null;
  const [, topicId, tier] = m;
  const key = `test${tier}` as 'test1' | 'test2' | 'test3';
  const saved = storageService.getTopics().find((t) => t.id === topicId);
  if (saved?.test1?.questions?.length && saved.test2?.questions?.length && saved.test3?.questions?.length) {
    return { topicId, pkg: saved[key] };
  }
  const gradeEntry = Object.entries(GRADE_TOPICS_CATALOG).find(([, items]) => items.some((t) => t.id === topicId));
  const catalog = gradeEntry?.[1].find((t) => t.id === topicId);
  const grade = (saved?.grade || Number(gradeEntry?.[0]) || 6) as GradeNumber;
  const tests = generateTopicTests(topicId, saved?.title || catalog?.title || topicId, grade, saved?.category || catalog?.category);
  return { topicId, pkg: tests[key] };
}

interface QuestionReview {
  number: number;
  question: string;
  chosen: string;
  correct: string;
  ok: boolean;
}

/** Question-by-question check of an attempt against the current answer key. */
function reviewAttempt(examId: string, answers: Record<string, string>): QuestionReview[] {
  const found = examPackage(examId);
  if (!found) return [];
  return found.pkg.questions.map((q, i) => {
    const options = getQuestionOptions(q);
    const chosen = answers[q.id] || '';
    const correct = options.find((o) => isOptionCorrect(o.letter, q, options));
    return {
      number: q.number || i + 1,
      question: q.question,
      chosen: chosen ? `${chosen}${options.find((o) => o.letter === chosen) ? ') ' + options.find((o) => o.letter === chosen)!.text : ''}` : 'Хариулаагүй',
      correct: correct ? `${correct.letter}) ${correct.text}` : q.answer || '—',
      ok: isOptionCorrect(chosen, q, options),
    };
  });
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
  const [openExamId, setOpenExamId] = useState<string | null>(null);
  // undefined while loading, null if the student has not taken the placement test
  const [placement, setPlacement] = useState<PlacementResult | null | undefined>(undefined);

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
    // Search by user ID or phone number only
    return accounts.filter((a) => (a.userId || '').toLowerCase().includes(q) || (a.phoneNumber || '').includes(q));
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
    setPlacement(undefined);
    loadPlacementResult(selectedUid)
      .then((r) => !cancelled && setPlacement(r))
      .catch(() => !cancelled && setPlacement(null));
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

  const handleResetPlacement = async () => {
    if (!selectedUid || !window.confirm('Түвшин тогтоох шалгалтын дүнг устгаж, дахин өгүүлэх үү? Төлөвлөгөө нь шинээр гарна.')) return;
    try {
      await resetPlacementResult(selectedUid);
      setPlacement(null);
    } catch (err) {
      console.error(err);
      alert('Устгаж чадсангүй.');
    }
  };

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

  // Mistakes per exam, and the topics with the most wrong answers overall
  const reviews = Object.fromEntries(finished.map(([id, r]) => [id, reviewAttempt(id, r.answers || {})]));
  const wrongByTopic = new Map<string, { wrong: number; total: number }>();
  for (const [id] of finished) {
    const title = examInfo(id).title;
    const list = reviews[id];
    const entry = wrongByTopic.get(title) || { wrong: 0, total: 0 };
    entry.wrong += list.filter((q) => !q.ok).length;
    entry.total += list.length;
    wrongByTopic.set(title, entry);
  }
  const weakTopics = [...wrongByTopic.entries()]
    .filter(([, v]) => v.wrong > 0)
    .sort(([, a], [, b]) => b.wrong / b.total - a.wrong / a.total);

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
            placeholder="ID (USR-1234) эсвэл утасны дугаараар хайх..."
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
                <div>
                  <span className="text-stone-500">Хугацаа:</span>{' '}
                  {typeof perms.expiresAt === 'number' ? (
                    Date.now() > perms.expiresAt ? (
                      <b className="text-red-600">{new Date(perms.expiresAt).toLocaleDateString()}-нд дууссан</b>
                    ) : (
                      <b>
                        {new Date(perms.expiresAt).toLocaleDateString()} хүртэл (
                        {Math.ceil((perms.expiresAt - Date.now()) / 86400000)} өдөр үлдсэн)
                      </b>
                    )
                  ) : (
                    'Хязгааргүй'
                  )}
                </div>
                {perms.isBlocked && <div className="text-red-600 font-bold">Хичээл үзэх эрх хаагдсан</div>}
              </div>
            )}
          </Section>

          {user.accountType === 'student' && (
            <Section icon={<Route className="w-4 h-4 text-blue-600" />} title="Түвшин тогтоох ба төлөвлөгөө">
              {placement === undefined ? (
                <div className="text-xs text-stone-400">Ачаалж байна…</div>
              ) : placement === null ? (
                <div className="text-xs text-stone-500">Түвшин тогтоох шалгалт өгөөгүй.</div>
              ) : (
                <div className="space-y-2" data-testid="lookup-plan">
                  <div className="text-xs text-stone-700">
                    {placement.grade}-р ангийн шалгалт, {formatDate(placement.takenAt)}:{' '}
                    <b>
                      {placement.correct}/{placement.total}
                    </b>{' '}
                    зөв
                  </div>
                  {placement.plan.length === 0 ? (
                    <div className="text-xs text-stone-500">Бүх бодлогыг зөв бодсон.</div>
                  ) : (
                    <div className="space-y-1">
                      {placement.plan.map((p) => (
                        <div key={p.topicId} className="flex items-center gap-2 text-xs">
                          <ProgressRing percent={topicProgress(p.topicId, attempts)} size={18} />
                          <span className="font-bold text-stone-900">{topicMeta(p.topicId).title}</span>
                          <span className="text-stone-500">
                            ({topicMeta(p.topicId).grade}-р анги • алдсан: {p.missed.join(', ')})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleResetPlacement}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
                  >
                    Шалгалтыг дахин өгүүлэх
                  </button>
                </div>
              )}
            </Section>
          )}

          <Section icon={<History className="w-4 h-4 text-stone-600" />} title="Эрхийн түүх">
            {!perms?.history?.length ? (
              <div className="text-xs text-stone-400">Эрх өөрчилсөн түүх алга.</div>
            ) : (
              <div className="space-y-1.5 text-xs max-h-64 overflow-y-auto" data-testid="permission-history">
                {[...perms.history].reverse().map((h, i) => (
                  <div key={i} className="flex gap-3 border-b border-stone-100 pb-1.5 last:border-0">
                    <span className="text-stone-500 whitespace-nowrap">{formatDate(h.at)}</span>
                    {h.kind === 'account' ? (
                      <span className={h.active ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                        {h.active ? 'Бүртгэлийг нээсэн' : 'Бүртгэлийг хаасан'}
                      </span>
                    ) : (
                      <span className="text-stone-800">
                        Ангиуд: <b>{h.allowedGrades?.length ? [...h.allowedGrades].sort((a, b) => a - b).join(', ') : 'байхгүй'}</b>
                        {' • '}
                        Хэсэг:{' '}
                        <b>
                          {Object.entries(h.sections || {})
                            .filter(([, on]) => on)
                            .map(([k]) => SECTION_NAMES[k] || k)
                            .join(', ') || 'байхгүй'}
                        </b>
                        {' • '}
                        Хугацаа:{' '}
                        <b>{typeof h.expiresAt === 'number' ? `${new Date(h.expiresAt).toLocaleDateString()} хүртэл` : 'хязгааргүй'}</b>
                        {h.isBlocked && <b className="text-red-600"> • Хаагдсан</b>}
                      </span>
                    )}
                  </div>
                ))}
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
                {weakTopics.length > 0 && (
                  <div className="text-xs">
                    <span className="text-stone-500">Хамгийн их алдсан сэдвүүд:</span>{' '}
                    {weakTopics.slice(0, 3).map(([title, v], i) => (
                      <span key={title}>
                        {i > 0 && ', '}
                        <b>{title}</b> ({v.wrong}/{v.total} алдсан)
                      </span>
                    ))}
                  </div>
                )}
                <div className="divide-y divide-stone-100">
                  {finished.map(([id, r]) => {
                    const info = examInfo(id);
                    const review = reviews[id];
                    const wrong = review.filter((q) => !q.ok);
                    const open = openExamId === id;
                    return (
                      <div key={id} className="py-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-stone-800">
                            {info.title} <span className="text-stone-400">— {info.tier}</span>
                          </span>
                          <span className="font-bold whitespace-nowrap">
                            {r.score ?? 0}
                            {info.maxPoints ? ` / ${info.maxPoints}` : ''} оноо
                          </span>
                          <button
                            type="button"
                            onClick={() => setOpenExamId(open ? null : id)}
                            disabled={review.length === 0}
                            className={`px-2 py-0.5 rounded-md border font-bold cursor-pointer whitespace-nowrap disabled:opacity-40 ${
                              wrong.length ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {wrong.length ? `${wrong.length} алдаа` : 'Алдаагүй'}
                          </button>
                          <span className="text-stone-500 whitespace-nowrap hidden sm:inline">{formatDate(r.finishedAt)}</span>
                        </div>
                        {open && (
                          <div className="mt-2 space-y-1.5" data-testid="attempt-review">
                            {review.map((q) => (
                              <div
                                key={q.number}
                                className={`p-2 rounded-lg border ${q.ok ? 'border-emerald-100 bg-emerald-50/40' : 'border-red-200 bg-red-50/60'}`}
                              >
                                <div className="flex gap-1.5">
                                  <b className={q.ok ? 'text-emerald-700' : 'text-red-700'}>{q.ok ? '✓' : '✗'} {q.number}.</b>
                                  <MathRenderer content={q.question} className="flex-1 text-stone-800" />
                                </div>
                                {!q.ok && (
                                  <div className="mt-1 pl-5 text-stone-600">
                                    Сонгосон: <b className="text-red-700">{q.chosen}</b> • Зөв хариулт:{' '}
                                    <b className="text-emerald-700">{q.correct}</b>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
