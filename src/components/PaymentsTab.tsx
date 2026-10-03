import React, { useEffect, useState } from 'react';
import { Check, CreditCard, Plus, Trash2, X } from 'lucide-react';
import {
  approvePayment,
  EMPTY_PAYMENT_SETTINGS,
  formatMoney,
  PaymentRequest,
  PaymentSettings,
  rejectPayment,
  savePaymentSettings,
  subscribeAllPaymentRequests,
  subscribePaymentSettings,
} from '../services/payments';

const input =
  'w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

/** Admin: bank account and prices, and the students' "I paid" requests to confirm. */
export const PaymentsTab: React.FC = () => {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => subscribeAllPaymentRequests(setRequests), []);

  const handleApprove = async (r: PaymentRequest) => {
    setBusy(r.id);
    try {
      await approvePayment(r);
    } catch (err) {
      console.error(err);
      alert('Баталгаажуулж чадсангүй.');
    }
    setBusy(null);
  };

  const handleReject = async (r: PaymentRequest) => {
    if (!window.confirm(`${r.userId}-ийн ${formatMoney(r.amount)} төлбөрийг татгалзах уу?`)) return;
    setBusy(r.id);
    try {
      await rejectPayment(r);
    } catch (err) {
      console.error(err);
    }
    setBusy(null);
  };

  const shown = filter === 'pending' ? requests.filter((r) => r.status === 'pending') : requests;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-5">
      <PaymentSettingsForm />

      <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide">Төлбөрийн хүсэлтүүд</h4>
          <div className="flex gap-1">
            {(['pending', 'all'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${
                  filter === f ? 'bg-stone-900 text-amber-400' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {f === 'pending' ? `Хүлээгдэж буй (${pendingCount})` : 'Бүгд'}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-stone-500">
          Банкны хуулгаас гүйлгээний утга (ID, утас) болон дүнг шалгаад баталгаажуулна уу. Баталгаажуулахад тухайн сурагчийн
          эрхийн хугацаа сонгосон сараар сунгагдана.
        </p>
        {shown.length === 0 ? (
          <div className="text-xs text-stone-400">Хүсэлт алга.</div>
        ) : (
          <div className="space-y-2" data-testid="payment-requests">
            {shown.map((r) => (
              <div key={r.id} className="p-3 rounded-lg border border-stone-200 bg-stone-50 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px] text-xs">
                  <div className="text-sm font-bold text-stone-900">
                    {r.fullName || r.userId} • {r.months} сар • {formatMoney(r.amount)}
                  </div>
                  <div className="text-stone-500">
                    {new Date(r.createdAt).toLocaleString()} • Гүйлгээний утга: <b className="text-stone-800">{r.note}</b>
                  </div>
                  {r.status === 'approved' && r.paidUntil && (
                    <div className="text-emerald-700 font-bold">
                      Баталгаажсан: {new Date(r.paidUntil).toLocaleDateString()} хүртэл
                    </div>
                  )}
                  {r.status === 'rejected' && <div className="text-red-600 font-bold">Татгалзсан</div>}
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApprove(r)}
                      disabled={busy === r.id}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Баталгаажуулах
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(r)}
                      disabled={busy === r.id}
                      className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-white text-xs font-bold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Татгалзах
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/** Bank account and prices students pay with (used on the payments tab and the home page). */
export const PaymentSettingsForm: React.FC<{ onSaved?: () => void }> = ({ onSaved }) => {
  const [settings, setSettings] = useState<PaymentSettings>(EMPTY_PAYMENT_SETTINGS);
  const [draft, setDraft] = useState<PaymentSettings | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => subscribePaymentSettings(setSettings), []);

  const form = draft ?? settings;
  const edit = (patch: Partial<PaymentSettings>) => setDraft({ ...form, ...patch });

  const handleSave = async () => {
    const options = form.options
      .filter((o) => o.months > 0 && o.price > 0)
      .sort((a, b) => a.months - b.months);
    try {
      await savePaymentSettings({ ...form, options });
      setDraft(null);
      setSaveMsg('Хадгалагдлаа.');
      onSaved?.();
    } catch (err) {
      console.error(err);
      setSaveMsg('Хадгалж чадсангүй.');
    }
    setTimeout(() => setSaveMsg(null), 2500);
  };

  return (
      <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-3">
        <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-amber-600" />
          <span>Төлбөр шилжүүлэх данс ба үнэ</span>
        </h4>
        <div className="grid sm:grid-cols-3 gap-2">
          <input className={input} placeholder="Банк (жишээ: Хаан банк)" value={form.bankName} onChange={(e) => edit({ bankName: e.target.value })} />
          <input className={input} placeholder="Дансны дугаар" value={form.accountNumber} onChange={(e) => edit({ accountNumber: e.target.value })} />
          <input className={input} placeholder="Хүлээн авагчийн нэр" value={form.accountName} onChange={(e) => edit({ accountName: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-stone-600">Сунгах хугацаа ба үнэ</div>
          {form.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                className={`${input} w-24`}
                value={o.months || ''}
                onChange={(e) =>
                  edit({ options: form.options.map((x, j) => (j === i ? { ...x, months: Number(e.target.value) } : x)) })
                }
              />
              <span className="text-xs text-stone-500">сар</span>
              <input
                type="number"
                min={0}
                className={`${input} w-36`}
                value={o.price || ''}
                onChange={(e) =>
                  edit({ options: form.options.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)) })
                }
              />
              <span className="text-xs text-stone-500">₮</span>
              <button
                type="button"
                onClick={() => edit({ options: form.options.filter((_, j) => j !== i) })}
                className="p-1.5 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                aria-label="Устгах"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => edit({ options: [...form.options, { months: 0, price: 0 }] })}
            className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Хугацаа нэмэх
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!draft}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-stone-900 text-white hover:bg-black disabled:opacity-40 cursor-pointer"
          >
            Хадгалах
          </button>
          {saveMsg && <span className="text-xs text-emerald-700">{saveMsg}</span>}
        </div>
      </div>
  );
};
