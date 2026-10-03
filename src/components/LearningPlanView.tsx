import React, { useEffect, useState } from 'react';
import { Award, BookOpen, Check, CheckCircle2, Copy, CreditCard, Lock, Route, X } from 'lucide-react';
import { AuthUser } from '../types';
import {
  learningPlan,
  PASS_PERCENT,
  tierPercent,
  topicMeta,
  useLearningPlanVersion,
} from '../services/learningPlan';
import { ProgressRing } from './ProgressRing';
import {
  EMPTY_PAYMENT_SETTINGS,
  formatMoney,
  paymentOptions,
  PaymentRequest,
  PaymentSettings,
  submitPaymentRequest,
  subscribeMyPaymentRequests,
  subscribePaymentSettings,
  transferNote,
} from '../services/payments';

const TIER_NAMES = ['Анхан', 'Дунд', 'Ахисан'];

interface LearningPlanViewProps {
  uid: string;
  currentUser: AuthUser;
  onOpenTopic: (topicId: string) => void;
  onOpenExam: (topicId: string) => void;
}

/** The student's own plan: topics from the placement test, payment and progress. */
export const LearningPlanView: React.FC<LearningPlanViewProps> = ({ uid, currentUser, onOpenTopic, onOpenExam }) => {
  useLearningPlanVersion();
  const results = learningPlan.state.results || [];
  if (results.length === 0) return null;
  const plan = learningPlan.plan();

  const attempts = learningPlan.state.attempts;
  const paid = learningPlan.isPaid();
  const doneCount = plan.filter((p) => learningPlan.isDone(p.topicId)).length;
  const total = plan.length;
  const overall = total ? Math.round(plan.reduce((sum, p) => sum + learningPlan.progress(p.topicId), 0) / total) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5" data-testid="learning-plan">
      <div>
        <h1 className="text-2xl font-black text-stone-950 flex items-center gap-2">
          <Route className="w-6 h-6 text-amber-600" />
          Миний сургалтын төлөвлөгөө
        </h1>
        <p className="text-sm text-stone-600 mt-1">
          Түвшин тогтоох сорил:{' '}
          {results.map((r, i) => (
            <span key={r.grade}>
              {i > 0 && ', '}
              {r.grade}-р анги{' '}
              <b>
                {r.correct}/{r.total}
              </b>
            </span>
          ))}{' '}
          зөв. Алдсан бодлогуудаас нь харахад танд доорх сэдвүүдийг үзэхийг зөвлөж байна.
        </p>
      </div>

      <PaymentStatusCard uid={uid} currentUser={currentUser} />

      {/* Progress */}
      {total > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex justify-between text-xs font-bold text-stone-600 mb-1.5">
            <span>Явц</span>
            <span>
              {overall}% • {doneCount}/{total} сэдэв үзсэн
            </span>
          </div>
          <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${overall}%` }} />
          </div>
          <p className="text-[11px] text-stone-500 mt-1.5">
            Сэдэв бүр дээр эхлээд Анхан шатны сорил өгнө. {PASS_PERCENT}%-иас дээш авбал Дунд шат нээгдэж сэдэв 35%, Дунд шатанд{' '}
            {PASS_PERCENT}%-иас дээш авбал Ахисан шат нээгдэж 70%, Ахисан шатанд {PASS_PERCENT}%-иас дээш авбал 100% болж үзсэнд
            тооцогдоно.
          </p>
        </div>
      )}

      {/* Topics */}
      {total === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-sm text-stone-600">
          Та бүх бодлогыг зөв бодсон байна. Багштайгаа зөвлөлдөж дараагийн сэдвээ сонгоорой.
        </div>
      ) : (
        <div className="space-y-2" data-testid="plan-topics">
          {plan.map((p, i) => {
            const meta = topicMeta(p.topicId);
            const done = learningPlan.isDone(p.topicId);
            const progress = learningPlan.progress(p.topicId);
            const tierResults = ([1, 2, 3] as const)
              .map((t) => ({ t, pct: tierPercent(p.topicId, t, attempts) }))
              .filter((x) => x.pct !== null)
              .map((x) => `${TIER_NAMES[x.t - 1]} ${x.pct}%${x.pct! >= PASS_PERCENT ? ' ✓' : ''}`);
            return (
              <div
                key={p.topicId}
                className={`bg-white rounded-xl border p-4 flex flex-wrap items-center gap-3 ${
                  done ? 'border-emerald-300' : 'border-stone-200'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                    done ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {done ? <Check className="w-4 h-4" /> : i + 1}
                </span>
                <div className="flex-1 min-w-[180px]">
                  <div className="font-bold text-stone-900 flex items-center gap-2 flex-wrap">
                    {meta.title}
                    <ProgressRing percent={progress} />
                    {done && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black">
                        Үзсэн
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {meta.grade}-р анги • {meta.category} • {p.grade}-р ангийн сорилын {p.missed.join(', ')}-р бодлого алдсан
                    {tierResults.length > 0 && ` • ${tierResults.join(', ')}`}
                  </div>
                </div>
                {paid ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenTopic(p.topicId)}
                      className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 flex items-center gap-1 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Үзэх
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenExam(p.topicId)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-stone-950 flex items-center gap-1 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" /> Сорил өгөх
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-stone-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Төлбөрийн дараа нээгдэнэ
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

/** The student's payment status with a button to pay or extend. */
export const PaymentStatusCard: React.FC<{ uid: string; currentUser: AuthUser }> = ({ uid, currentUser }) => {
  useLearningPlanVersion();
  const [settings, setSettings] = useState<PaymentSettings>(EMPTY_PAYMENT_SETTINGS);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [payOpen, setPayOpen] = useState(false);

  useEffect(() => subscribePaymentSettings(setSettings), []);
  useEffect(() => subscribeMyPaymentRequests(uid, setRequests), [uid]);

  const paid = learningPlan.isPaid();
  const paidUntil = learningPlan.paidUntil();
  const pending = requests.find((r) => r.status === 'pending');
  const lastRejected = requests[0]?.status === 'rejected' ? requests[0] : null;

  return (
    <>
      <div
        className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
          paid ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
        }`}
        data-testid="plan-payment"
      >
        <div className="text-sm">
          {paid ? (
            <span className="text-emerald-900">
              <b>Төлбөр төлөгдсөн.</b> Хичээлүүд {new Date(paidUntil!).toLocaleDateString()} хүртэл нээлттэй.
            </span>
          ) : pending ? (
            <span className="text-amber-900">
              <b>Төлбөрийг шалгаж байна</b> ({pending.months} сар, {formatMoney(pending.amount)}). Админ баталгаажуулмагц
              хичээлүүд нээгдэнэ.
            </span>
          ) : (
            <span className="text-amber-900">
              {paidUntil ? <b>Төлбөрийн хугацаа дууссан. </b> : null}
              Төлбөр төлсний дараа төлөвлөгөөний хичээлүүд нээгдэнэ.
              {lastRejected && <span className="block text-red-700 mt-0.5">Сүүлийн төлбөр баталгаажаагүй. Админд хандана уу.</span>}
            </span>
          )}
        </div>
        {!pending && (
          <button
            type="button"
            onClick={() => setPayOpen(true)}
            className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            {paid ? 'Хугацаа сунгах' : 'Төлбөр төлөх'}
          </button>
        )}
      </div>
      {payOpen && <PaymentDialog uid={uid} currentUser={currentUser} settings={settings} onClose={() => setPayOpen(false)} />}
    </>
  );
};

const PaymentDialog: React.FC<{
  uid: string;
  currentUser: AuthUser;
  settings: PaymentSettings;
  onClose: () => void;
}> = ({ uid, currentUser, settings, onClose }) => {
  const [months, setMonths] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = paymentOptions(settings);
  const option = options.find((o) => o.months === months);
  const note = transferNote(currentUser.userId || '', currentUser.phoneNumber || '');
  const configured = settings.accountNumber && options.length > 0;

  const copy = (key: string, text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const handlePaid = async () => {
    if (!option) return;
    setSending(true);
    setError(null);
    try {
      await submitPaymentRequest({
        uid,
        userId: currentUser.userId || '',
        phoneNumber: currentUser.phoneNumber || '',
        fullName: currentUser.name || '',
        months: option.months,
        amount: option.price,
        note,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Илгээж чадсангүй. Дахин оролдоно уу.');
      setSending(false);
    }
  };

  const Row: React.FC<{ label: string; value: string; k: string }> = ({ label, value, k }) => (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-stone-100 last:border-0">
      <span className="text-xs text-stone-500">{label}</span>
      <span className="flex items-center gap-1.5">
        <b className="text-sm text-stone-900 select-all">{value}</b>
        <button
          type="button"
          onClick={() => copy(k, value)}
          className="p-1 rounded hover:bg-stone-100 text-stone-400 cursor-pointer"
          aria-label="Хуулах"
        >
          {copied === k ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="payment-dialog"
      >
        <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
          <h3 className="font-extrabold text-stone-900">Төлбөр төлөх</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-stone-100 cursor-pointer" aria-label="Хаах">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {!configured ? (
          <div className="p-5 text-sm text-stone-600">Төлбөрийн мэдээлэл хараахан оруулаагүй байна. Админд хандана уу.</div>
        ) : (
          <div className="p-5 space-y-4">
            <div>
              <div className="text-xs font-bold text-stone-600 mb-2">Хэдэн сараар сунгах вэ?</div>
              <div className="grid grid-cols-3 gap-2" data-testid="payment-options">
                {options.map((o) => (
                  <button
                    key={o.months}
                    type="button"
                    onClick={() => setMonths(o.months)}
                    className={`p-3 rounded-xl border text-left cursor-pointer ${
                      months === o.months ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-400' : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <div className="text-sm font-black text-stone-900">{o.months} сар</div>
                    <div className="text-xs text-stone-600">{formatMoney(o.price)}</div>
                  </button>
                ))}
              </div>
            </div>

            {option && (
              <div className="space-y-3" data-testid="payment-instructions">
                <p className="text-sm text-stone-800">
                  <b>{formatMoney(option.price)}</b>-ийг доорх дансанд шилжүүлнэ үү.
                </p>
                <div className="rounded-xl border border-stone-200 px-3">
                  {settings.bankName && <Row label="Банк" value={settings.bankName} k="bank" />}
                  <Row label="Дансны дугаар" value={settings.accountNumber} k="acc" />
                  {settings.accountName && <Row label="Хүлээн авагч" value={settings.accountName} k="name" />}
                  <Row label="Дүн" value={String(option.price)} k="amount" />
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-300 p-3">
                  <div className="text-xs text-amber-900 font-bold mb-1">Гүйлгээний утга дээр заавал бичнэ үү:</div>
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-base text-stone-950 select-all" data-testid="transfer-note">
                      {note}
                    </b>
                    <button
                      type="button"
                      onClick={() => copy('note', note)}
                      className="p-1 rounded hover:bg-amber-100 text-amber-800 cursor-pointer"
                      aria-label="Хуулах"
                    >
                      {copied === 'note' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="text-[11px] text-amber-800 mt-1">(таны ID болон утасны дугаар)</div>
                </div>
                {error && <div className="text-xs text-red-700">{error}</div>}
                <button
                  type="button"
                  onClick={handlePaid}
                  disabled={sending}
                  className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-sm font-bold disabled:opacity-50 cursor-pointer"
                >
                  {sending ? 'Илгээж байна…' : 'Шилжүүлсэн'}
                </button>
                <p className="text-[11px] text-stone-500 text-center">
                  Админ шилжүүлгийг шалгаж баталгаажуулмагц хичээлүүд нээгдэнэ.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
