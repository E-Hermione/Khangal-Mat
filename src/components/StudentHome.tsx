import React from 'react';
import { ArrowRight, Award, BookOpen, ClipboardCheck, CreditCard, Lock } from 'lucide-react';
import { AuthUser, GradeNumber } from '../types';
import {
  GRADES,
  learningPlan,
  placementSize,
  tiersPassed,
  topicMeta,
  useLearningPlanVersion,
} from '../services/learningPlan';
import { PaymentStatusCard } from './LearningPlanView';
import { ProgressRing } from './ProgressRing';

interface StudentHomeProps {
  uid: string;
  currentUser: AuthUser;
  onStartPlacement: (grade: GradeNumber) => void;
  onOpenPlan: () => void;
  onOpenLessons: () => void;
  onOpenExams: () => void;
  onOpenTopic: (topicId: string) => void;
}

const Card: React.FC<{
  icon: React.ReactNode;
  title: string;
  highlight?: boolean;
  children: React.ReactNode;
  action?: { label: string; onClick: () => void } | null;
  locked?: string;
  testId?: string;
}> = ({ icon, title, highlight, children, action, locked, testId }) => (
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
      <h2 className="font-black text-stone-900">{title}</h2>
    </div>
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
  </div>
);

/** A student's landing page: lessons, placement test and topic tests first, then getting access. */
export const StudentHome: React.FC<StudentHomeProps> = ({
  uid,
  currentUser,
  onStartPlacement,
  onOpenPlan,
  onOpenLessons,
  onOpenExams,
  onOpenTopic,
}) => {
  useLearningPlanVersion();
  const { results = [], grade, attempts } = learningPlan.state;
  const needsPlacement = learningPlan.needsPlacement();
  const hasPlan = learningPlan.hasPlan();
  const paid = learningPlan.isPaid();
  const plan = learningPlan.plan();
  // The test suggested first: the student's own grade if it can be taken, else any open one
  const suggested = [grade, ...GRADES].find((g): g is GradeNumber => !!g && learningPlan.canTakePlacement(g));
  const overall = plan.length
    ? Math.round(plan.reduce((sum, p) => sum + learningPlan.progress(p.topicId), 0) / plan.length)
    : 0;
  const next = plan.find((p) => !learningPlan.isDone(p.topicId));
  const testsPassed = plan.reduce((sum, p) => sum + tiersPassed(p.topicId, attempts), 0);
  const firstName = (currentUser.name || '').split(' ').pop();

  // The one thing to do now
  const nextStep = needsPlacement
    ? {
        text: 'Эхлээд түвшин тогтоох сорил өгнө үү (үнэгүй). Дүнгээр нь танд зориулсан сургалтын төлөвлөгөө гарна.',
        label: suggested ? `${suggested}-р ангийн сорил эхлэх` : null,
        onClick: suggested ? () => onStartPlacement(suggested) : null,
      }
    : hasPlan && !paid
    ? { text: 'Төлөвлөгөө тань бэлэн боллоо. Төлбөрөө төлж эрх аваад хичээлээ эхлээрэй.', label: null, onClick: null }
    : hasPlan && next
    ? { text: `Үргэлжлүүлэх: «${topicMeta(next.topicId).title}»`, label: 'Үргэлжлүүлэх', onClick: () => onOpenTopic(next.topicId) }
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="student-home">
      <div>
        <h1 className="text-2xl font-black text-stone-950">Сайн байна уу{firstName ? `, ${firstName}` : ''}!</h1>
        {nextStep && (
          <div className="mt-3 p-4 rounded-xl bg-stone-900 text-white flex flex-wrap items-center justify-between gap-3" data-testid="next-step">
            <span className="text-sm">{nextStep.text}</span>
            {nextStep.label && nextStep.onClick && (
              <button
                type="button"
                onClick={nextStep.onClick}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold cursor-pointer"
              >
                {nextStep.label}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card
          icon={<BookOpen className="w-5 h-5" />}
          title="Хичээл"
          testId="home-lessons"
          locked={needsPlacement ? 'Түвшин тогтоох сорилын дараа нээгдэнэ' : undefined}
          action={hasPlan ? { label: 'Миний төлөвлөгөө', onClick: onOpenPlan } : { label: 'Хичээл үзэх', onClick: onOpenLessons }}
        >
          {hasPlan ? (
            <div className="flex items-center gap-3">
              <ProgressRing percent={overall} size={40} />
              <span>
                Таны төлөвлөгөөнд <b>{plan.length}</b> сэдэв байна.
                {!paid && <span className="block text-amber-700 text-xs mt-0.5">Төлбөр төлсний дараа нээгдэнэ.</span>}
              </span>
            </div>
          ) : (
            'Онол, жишээ, дасгалтай сэдвүүд.'
          )}
        </Card>

        <Card
          icon={<ClipboardCheck className="w-5 h-5" />}
          title="Түвшин тогтоох сорил"
          highlight={needsPlacement}
          testId="home-placement"
          action={hasPlan ? { label: 'Дүн, төлөвлөгөө', onClick: onOpenPlan } : null}
        >
          <span className="inline-block text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 mb-2">
            Үнэгүй
          </span>
          <span className="block text-xs text-stone-500 mb-2">Ангиа сонгоод сорилоо өгнө. Анги бүрийнх нэг удаа.</span>
          <div className="grid grid-cols-2 gap-1.5" data-testid="placement-grades">
            {GRADES.map((g) => {
              const taken = learningPlan.resultFor(g);
              const open = learningPlan.canTakePlacement(g);
              const count = placementSize(g).questions;
              return (
                <button
                  key={g}
                  type="button"
                  disabled={!open}
                  onClick={() => onStartPlacement(g)}
                  className={`px-2 py-1.5 rounded-lg border text-left text-xs transition-colors ${
                    taken
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : open
                      ? `cursor-pointer hover:bg-amber-50 ${g === grade ? 'border-amber-400 bg-amber-50' : 'border-stone-200'}`
                      : 'border-stone-100 text-stone-400'
                  }`}
                >
                  <b>{g}-р анги</b>
                  {g === grade && !taken && <span className="text-amber-700"> (таны)</span>}
                  <span className="block text-[10px]">
                    {taken ? `✓ ${taken.correct}/${taken.total} зөв` : count ? `${count} бодлого` : 'Удахгүй'}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card
          icon={<Award className="w-5 h-5" />}
          title="Сэдэвчилсэн сорил"
          testId="home-exams"
          locked={needsPlacement ? 'Түвшин тогтоох сорилын дараа нээгдэнэ' : undefined}
          action={{ label: 'Сорил өгөх', onClick: onOpenExams }}
        >
          Сэдэв бүр дээр Анхан → Дунд → Ахисан. 85%-иас дээш авбал дараагийн шат нээгдэнэ.
          {hasPlan && (
            <span className="block mt-1 text-xs text-stone-500">
              Давсан шат: <b>{testsPassed}</b>/{plan.length * 3}
            </span>
          )}
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-black text-stone-800 flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-amber-600" /> Эрх авах
        </h2>
        {hasPlan ? (
          <PaymentStatusCard uid={uid} currentUser={currentUser} />
        ) : (
          <div className="p-4 rounded-xl border border-stone-200 bg-white text-sm text-stone-600">
            {needsPlacement
              ? 'Түвшин тогтоох сорил өгсний дараа төлбөрөө төлж хичээлийн эрх авна.'
              : 'Эрхийн талаар админд хандана уу.'}
          </div>
        )}
      </div>
    </div>
  );
};
