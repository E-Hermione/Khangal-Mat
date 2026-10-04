import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, ClipboardCheck, CreditCard, Lock, Pencil, Settings, X } from 'lucide-react';
import { AuthUser, GradeNumber } from '../types';
import {
  GRADES,
  learningPlan,
  placementSize,
  tiersPassed,
  topicMeta,
  useLearningPlanVersion,
} from '../services/learningPlan';
import { HomeContent, saveHomeContent, useHomeContent } from '../services/homeContent';
import {
  EMPTY_PAYMENT_SETTINGS,
  formatMoney,
  PaymentSettings,
  subscribePaymentSettings,
} from '../services/payments';
import { PaymentStepContent, PlanSteps } from './LearningPlanView';
import { PaymentSettingsForm } from './PaymentsTab';
import { PlacementAdminTab } from './PlacementAdminTab';
import { ProgressRing } from './ProgressRing';

interface StudentHomeProps {
  uid?: string;
  currentUser: AuthUser;
  // Admin: every text and setting on the page gets a pencil to edit it
  editable?: boolean;
  onStartPlacement: (grade: GradeNumber) => void;
  onOpenPlan: () => void;
  onOpenLessons: () => void;
  onOpenExams: () => void;
  onOpenTopic: (topicId: string) => void;
}

const input =
  'w-full px-3 py-2 rounded-lg border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

const EditButton: React.FC<{ onClick: () => void; title?: string }> = ({ onClick, title = 'Засах' }) => (
  <button
    type="button"
    onClick={onClick}
    className="p-1.5 rounded-lg text-stone-400 hover:text-amber-700 hover:bg-amber-50 cursor-pointer shrink-0"
    title={title}
    aria-label={title}
    data-testid="home-edit"
  >
    <Pencil className="w-4 h-4" />
  </button>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
    <div
      className="bg-stone-50 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-5 py-3.5 border-b border-stone-200 bg-white flex items-center justify-between sticky top-0">
        <h3 className="font-extrabold text-stone-900">{title}</h3>
        <button type="button" onClick={onClose} className="p-1 rounded-md hover:bg-stone-100 cursor-pointer" aria-label="Хаах">
          <X className="w-5 h-5 text-stone-500" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

/** Inline editor for one title + text pair (or a single text). */
const TextEditor: React.FC<{
  fields: { key: keyof HomeContent; label: string; multiline?: boolean }[];
  content: HomeContent;
  onDone: () => void;
}> = ({ fields, content, onDone }) => {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, content[f.key]])));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await saveHomeContent(values);
      onDone();
    } catch (err) {
      console.error(err);
      alert('Хадгалж чадсангүй.');
      setSaving(false);
    }
  };
  return (
    <div className="space-y-2" data-testid="home-text-editor">
      {fields.map((f) => (
        <label key={f.key} className="block space-y-1">
          <span className="text-[11px] font-bold text-stone-500">{f.label}</span>
          {f.multiline ? (
            <textarea
              className={input}
              rows={3}
              value={values[f.key]}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            />
          ) : (
            <input className={input} value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
          )}
        </label>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
        >
          Хадгалах
        </button>
        <button type="button" onClick={onDone} className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold cursor-pointer">
          Болих
        </button>
      </div>
    </div>
  );
};

const Card: React.FC<{
  icon: React.ReactNode;
  title: string;
  highlight?: boolean;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void } | null;
  locked?: string;
  testId?: string;
  onEdit?: () => void;
  editor?: React.ReactNode;
}> = ({ icon, title, highlight, children, action, locked, testId, onEdit, editor }) => (
  <div
    className={`bg-white rounded-2xl border p-5 flex flex-col gap-3 ${
      highlight ? 'border-amber-400 ring-2 ring-amber-200 shadow-sm' : 'border-stone-200'
    }`}
    data-testid={testId}
  >
    <div className="flex items-center gap-2.5">
      <span
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          highlight ? 'bg-amber-500 text-stone-950' : 'bg-stone-100 text-stone-700'
        }`}
      >
        {icon}
      </span>
      <h2 className="font-black text-stone-900 flex-1">{title}</h2>
      {onEdit && !editor && <EditButton onClick={onEdit} />}
    </div>
    {editor || (
      <>
        <div className="text-sm text-stone-600 flex-1">{children}</div>
        {locked ? (
          <div className="text-xs text-stone-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> {locked}
          </div>
        ) : (
          action && (
            <button
              type="button"
              onClick={action.onClick}
              className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                highlight ? 'bg-amber-500 hover:bg-amber-400 text-stone-950' : 'bg-stone-900 hover:bg-black text-white'
              }`}
            >
              {action.label} <ArrowRight className="w-4 h-4" />
            </button>
          )
        )}
      </>
    )}
  </div>
);

type EditTarget = 'intro' | 'lessons' | 'placement' | 'exams' | 'access' | 'payment' | 'placement-settings' | null;

/** The landing page: lessons, placement test and topic tests first, then getting access. */
export const StudentHome: React.FC<StudentHomeProps> = ({
  uid,
  currentUser,
  editable = false,
  onStartPlacement,
  onOpenPlan,
  onOpenLessons,
  onOpenExams,
  onOpenTopic,
}) => {
  useLearningPlanVersion();
  const content = useHomeContent();
  const [editing, setEditing] = useState<EditTarget>(null);
  const [payment, setPayment] = useState<PaymentSettings>(EMPTY_PAYMENT_SETTINGS);
  useEffect(() => (editable ? subscribePaymentSettings(setPayment) : undefined), [editable]);

  const { grade, attempts } = learningPlan.state;
  const needsPlacement = learningPlan.needsPlacement();
  const hasPlan = learningPlan.hasPlan();
  const paid = learningPlan.isPaid();
  const plan = learningPlan.plan();
  // The test suggested first: the user's own grade if it can be taken, else any open one
  const suggested = [grade, ...GRADES].find((g): g is GradeNumber => !!g && learningPlan.canTakePlacement(g));
  const overall = plan.length
    ? Math.round(plan.reduce((sum, p) => sum + learningPlan.progress(p.topicId), 0) / plan.length)
    : 0;
  const next = plan.find((p) => !learningPlan.isDone(p.topicId));
  const firstName = (currentUser.name || '').split(' ').pop();
  // Retaking replaces that grade's result, so ask first
  const startPlacement = (g: GradeNumber) => {
    if (learningPlan.resultFor(g) && !window.confirm(`${g}-р ангийн түвшин тогтоох сорилыг дахин өгөх үү?`)) return;
    onStartPlacement(g);
  };
  // "Take it again" opens the user's own grade, else the last grade they took
  const retakeGrade = hasPlan
    ? ([grade, ...[...(learningPlan.state.results || [])].sort((x, y) => y.takenAt - x.takenAt).map((r) => r.grade)].find(
        (g): g is GradeNumber => !!g && learningPlan.canTakePlacement(g)
      ) ?? null)
    : null;
  const edit = (target: EditTarget) => (editable ? () => setEditing(target) : undefined);
  const done = () => setEditing(null);

  // The step cards on the home page take the user to each step
  const goToStep = (step: number) => {
    if (step === 1) {
      if (suggested) startPlacement(suggested);
      else if (hasPlan) onOpenPlan();
    } else if (step === 2) {
      document.getElementById('home-access')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (step === 3) {
      onOpenPlan();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="student-home">
      <div>
        <h1 className="text-2xl font-black text-stone-950">Сайн байна уу{firstName ? `, ${firstName}` : ''}!</h1>
        {editing === 'intro' ? (
          <div className="mt-3 bg-white rounded-xl border border-stone-200 p-4">
            <TextEditor fields={[{ key: 'intro', label: 'Танилцуулга (хоосон бол харагдахгүй)', multiline: true }]} content={content} onDone={done} />
          </div>
        ) : (
          (content.intro || editable) && (
            <div className="mt-2 flex items-start gap-2">
              <p className="text-sm text-stone-600 whitespace-pre-wrap flex-1" data-testid="home-intro">
                {content.intro || <span className="text-stone-400 italic">Танилцуулга бичвэр нэмэх</span>}
              </p>
              {editable && <EditButton onClick={() => setEditing('intro')} />}
            </div>
          )
        )}
        <div className="mt-4">
          <PlanSteps
            placementDone={hasPlan}
            paid={paid}
            onStep={goToStep}
            paymentContent={
              !editable && uid ? <PaymentStepContent uid={uid} currentUser={currentUser} enabled={hasPlan} /> : undefined
            }
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card
          icon={<ClipboardCheck className="w-5 h-5" />}
          title={content.placementTitle}
          highlight={needsPlacement}
          testId="home-placement"
          onEdit={edit('placement')}
          editor={
            editing === 'placement' && (
              <TextEditor
                fields={[
                  { key: 'placementTitle', label: 'Гарчиг' },
                  { key: 'placementText', label: 'Тайлбар', multiline: true },
                ]}
                content={content}
                onDone={done}
              />
            )
          }
          action={retakeGrade ? { label: 'Дахин түвшин тест бөглөх', onClick: () => startPlacement(retakeGrade) } : null}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs text-stone-500 whitespace-pre-wrap">{content.placementText}</span>
            <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
              Үнэгүй
            </span>
          </div>
          <div className="rounded-xl bg-stone-50 border border-stone-100 p-2.5">
            <div className="grid grid-cols-7 gap-1.5" data-testid="placement-grades">
              {GRADES.filter((g) => !grade || g <= grade).map((g) => {
                const taken = learningPlan.resultFor(g);
                const open = learningPlan.canTakePlacement(g);
                const count = placementSize(g).questions;
                const mine = g === grade;
                return (
                  <button
                    key={g}
                    type="button"
                    disabled={!open}
                    onClick={() => startPlacement(g)}
                    title={
                      taken
                        ? `${g}-р анги: ${taken.correct}/${taken.total} зөв • дахин өгөх`
                        : open
                        ? `${g}-р анги: ${count} бодлого • сорил эхлэх`
                        : `${g}-р анги: удахгүй`
                    }
                    className={`aspect-square rounded-lg border flex items-center justify-center text-sm font-black transition-all ${
                      taken
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-500 cursor-pointer'
                        : open
                        ? 'border-stone-300 bg-white text-stone-900 hover:border-amber-400 hover:bg-amber-50 cursor-pointer'
                        : 'border-transparent bg-transparent text-stone-300'
                    } ${mine ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-stone-50' : ''}`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
          {editable && (
            <button
              type="button"
              onClick={() => setEditing('placement-settings')}
              className="mt-2 text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" /> Сорилын тохиргоо
            </button>
          )}
        </Card>

        <Card
          icon={<BookOpen className="w-5 h-5" />}
          title={content.lessonsTitle}
          testId="home-lessons"
          onEdit={edit('lessons')}
          editor={
            editing === 'lessons' && (
              <TextEditor
                fields={[
                  { key: 'lessonsTitle', label: 'Гарчиг' },
                  { key: 'lessonsText', label: 'Тайлбар', multiline: true },
                ]}
                content={content}
                onDone={done}
              />
            )
          }
          locked={needsPlacement ? 'Түвшин тогтоох сорилын дараа нээгдэнэ' : undefined}
          action={hasPlan ? { label: 'Миний төлөвлөгөө', onClick: onOpenPlan } : { label: 'Хичээл үзэх', onClick: onOpenLessons }}
        >
          {hasPlan ? (
            <div className="flex items-center gap-3">
              <ProgressRing percent={overall} size={40} />
              <span>
                Таны төлөвлөгөөнд <b>{plan.length}</b> сэдэв байна.
              </span>
            </div>
          ) : (
            <span className="whitespace-pre-wrap">{content.lessonsText}</span>
          )}
        </Card>
      </div>

      {/* Admin: bank account, prices and texts (users pay from the step card above) */}
      {editable && (
      <div className="space-y-2" id="home-access">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-black text-stone-800 flex items-center gap-1.5 flex-1">
            <CreditCard className="w-4 h-4 text-amber-600" /> {content.accessTitle}
          </h2>
          <EditButton onClick={() => setEditing('payment')} title="Төлбөрийн данс, үнэ засах" />
        </div>
        {
          <div className="p-4 rounded-xl border border-stone-200 bg-white text-sm text-stone-700 space-y-2" data-testid="home-payment-admin">
            {editing === 'access' ? (
              <TextEditor
                fields={[
                  { key: 'accessTitle', label: 'Гарчиг' },
                  { key: 'accessText', label: 'Сорил өгөөгүй хэрэглэгчид харагдах бичвэр', multiline: true },
                ]}
                content={content}
                onDone={done}
              />
            ) : (
              <div className="flex items-start gap-2">
                <p className="flex-1 whitespace-pre-wrap">{content.accessText}</p>
                <EditButton onClick={() => setEditing('access')} title="Бичвэр засах" />
              </div>
            )}
            <div className="text-xs text-stone-500 border-t border-stone-100 pt-2">
              {payment.accountNumber ? (
                <>
                  {payment.bankName} {payment.accountNumber} {payment.accountName && `(${payment.accountName})`} •{' '}
                  {payment.options.map((o) => `${o.months} сар ${formatMoney(o.price)}`).join(', ') || 'үнэ оруулаагүй'}
                </>
              ) : (
                'Төлбөрийн данс оруулаагүй байна.'
              )}
            </div>
          </div>
        }
      </div>
      )}

      {editing === 'payment' && (
        <Modal title="Төлбөрийн данс ба үнэ" onClose={done}>
          <PaymentSettingsForm onSaved={done} />
        </Modal>
      )}
      {editing === 'placement-settings' && (
        <Modal title="Түвшин тогтоох сорилын тохиргоо" onClose={done}>
          <PlacementAdminTab />
        </Modal>
      )}
    </div>
  );
};
