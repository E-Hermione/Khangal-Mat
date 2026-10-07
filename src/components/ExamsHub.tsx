import React, { useState, useMemo } from 'react';
import { GradeNumber, TopicPackage, TestPackage } from '../types';
import { GradeTestTakers } from './GradeTestTakers';
import { MathRenderer } from './MathRenderer';
import {
  Award,
  Clock,
  Play,
  CheckCircle2,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { backdropClose } from '../utils/backdrop';
import { generateTopicTests } from '../utils/topicTests';
import { correctOption, getQuestionOptions, isOpenQuestion, isOptionCorrect, questionStem, testForGrade } from '../utils/examGrading';
import { visibilityService } from '../services/visibilityService';
import { catalogTopics, isGroupTopic, learningPlan } from '../services/learningPlan';
import type { ExamFilter } from './SidebarPanels';
import { userPermissionsService } from '../services/userPermissionsService';
import { subscribeAttempts, saveAttempt as saveAttemptCloud, AttemptMap, ExamAttempt } from '../services/examAttempts';

interface ExamsHubProps {
  topics: TopicPackage[];
  selectedGrade: GradeNumber;
  onSelectGrade: (grade: GradeNumber) => void;
  isAdmin?: boolean;
  // Signed-in user's permission id (USR-####); non-admins only see what the admin allows
  userId?: string;
  // Firebase uid, to keep each user's exam results apart on a shared device
  uid?: string;
  // Which topics to list (chosen in the sidebar)
  filter?: ExamFilter;
}

type ExamTier = 'all' | 1 | 2 | 3;

interface ExamRowItem {
  id: string;
  topicId: string;
  topicTitle: string;
  grade: GradeNumber;
  tier: 1 | 2 | 3;
  tierName: string;
  tierBadgeClass: string;
  examTitle: string;
  duration: string; // e.g. "00:20" or "00:30" or "00:40"
  questionCount: number;
  totalPoints: number;
  testPackage: TestPackage;
}

export { generateTopicTests };

export const ExamsHub: React.FC<ExamsHubProps> = ({
  topics,
  selectedGrade,
  onSelectGrade,
  isAdmin = false,
  userId,
  uid,
  filter = 'all',
}) => {
  const [topicTiers, setTopicTiers] = useState<Record<string, 1 | 2 | 3>>({});

  // Re-render when the admin changes visibility or permissions
  const [, setSettingsVersion] = useState(0);
  React.useEffect(() => {
    const bump = () => setSettingsVersion((v) => v + 1);
    window.addEventListener('visibility-settings-updated', bump);
    window.addEventListener('user-permissions-updated', bump);
    window.addEventListener('learning-plan-updated', bump);
    return () => {
      window.removeEventListener('learning-plan-updated', bump);
      window.removeEventListener('visibility-settings-updated', bump);
      window.removeEventListener('user-permissions-updated', bump);
    };
  }, []);

  // Tiers the user may take for a topic: the admin sees all; others only visible topics and
  // the tests the admin switched on for them
  const allowedTiers = (topicId: string): (1 | 2 | 3)[] => {
    if (isAdmin) return [1, 2, 3];
    // Students with a learning plan: paid plan topics only, each tier after passing the previous one
    const gate = learningPlan.topicGate(topicId);
    if (gate) return gate === 'open' ? learningPlan.unlockedTiers(topicId) : [];
    // An open topic has all its tests
    return visibilityService.getTopicAccessMode(topicId) === 'visible' ? [1, 2, 3] : [];
  };
  const examsAllowed =
    isAdmin ||
    learningPlan.isGated() ||
    (userPermissionsService.isGradeAllowed(userId, selectedGrade, false) &&
      userPermissionsService.hasAccess(userId, false));

  // Active taking exam modal
  const [activeExam, setActiveExam] = useState<ExamRowItem | null>(null);
  // View solution modal
  const [viewSolutionExam, setViewSolutionExam] = useState<ExamRowItem | null>(null);
  // View score modal
  const [viewScoreExam, setViewScoreExam] = useState<{ exam: ExamRowItem; score: number; maxScore: number } | null>(null);
  // Error check modal
  const [viewErrorCheckExam, setViewErrorCheckExam] = useState<ExamRowItem | null>(null);
  // Info notice modal for untaken exams
  const [unTakenNoticeExam, setUnTakenNoticeExam] = useState<{ exam: ExamRowItem; actionType: 'score' | 'error' } | null>(null);

  // Exam results: kept in Firestore per account (users/{uid}/examAttempts), with a copy in this
  // browser so results still show if Firestore is unreachable
  const attemptsKey = `math_app_exam_attempts_v1:${uid || 'guest'}`;
  const [attempts, setAttempts] = useState<AttemptMap>(() => {
    try {
      const data = localStorage.getItem(attemptsKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  });

  React.useEffect(() => {
    if (!uid) return;
    let firstSnapshot = true;
    return subscribeAttempts(uid, (cloudAttempts) => {
      if (firstSnapshot) {
        firstSnapshot = false;
        // Upload results saved only in this browser (before results were stored online)
        let local: AttemptMap = {};
        try {
          local = JSON.parse(localStorage.getItem(attemptsKey) || '{}');
        } catch {
          // ignore
        }
        for (const [examId, attempt] of Object.entries(local)) {
          if (!cloudAttempts[examId]) {
            cloudAttempts[examId] = attempt;
            saveAttemptCloud(uid, examId, attempt).catch(() => {});
          }
        }
      }
      setAttempts(cloudAttempts);
      try {
        localStorage.setItem(attemptsKey, JSON.stringify(cloudAttempts));
      } catch {
        // ignore
      }
    });
  }, [uid, attemptsKey]);

  const saveAttempt = (examId: string, data: ExamAttempt) => {
    const updated = { ...attempts, [examId]: data };
    setAttempts(updated);
    try {
      localStorage.setItem(attemptsKey, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    if (uid) saveAttemptCloud(uid, examId, data).catch((err) => console.error('Exam result not saved online', err));
  };

  // Build complete list of all topics for the selected grade:
  // combines catalog items + saved storage items to guarantee every topic is present
  const allGradeTopics = useMemo(() => {
    const catalog = catalogTopics(selectedGrade);
    const topicMap = new Map<string, TopicPackage>();

    // 1. Add saved topics for this grade
    topics.forEach((t) => {
      const belongs = t.grade === selectedGrade || (Array.isArray(t.visibleGrades) && t.visibleGrades.includes(selectedGrade));
      if (belongs) {
        topicMap.set(t.id, t);
      }
    });

    // 2. Ensure every catalog item exists in the map with tests
    catalog.forEach((catItem) => {
      const existing = topicMap.get(catItem.id);
      if (!existing) {
        const tests = generateTopicTests(catItem.id, catItem.title, selectedGrade, catItem.category);
        topicMap.set(catItem.id, {
          id: catItem.id,
          grade: selectedGrade,
          category: catItem.category,
          title: catItem.title,
          description: `${selectedGrade}-р ангийн «${catItem.title}» сэдвийн 3 түвшний шалгалтын сорилууд.`,
          theory: [],
          examples: [],
          practice: [],
          test1: tests.test1,
          test2: tests.test2,
          test3: tests.test3,
        });
      } else {
        // If existing has no test questions, attach generated tests
        let updated = false;
        const copy = { ...existing };
        if (!copy.test1 || !copy.test1.questions || copy.test1.questions.length === 0) {
          const generated = generateTopicTests(copy.id, copy.title, selectedGrade, copy.category);
          copy.test1 = generated.test1;
          copy.test2 = generated.test2;
          copy.test3 = generated.test3;
          updated = true;
        }
        if (updated) {
          topicMap.set(catItem.id, copy);
        }
      }
    });

    // Topics that group subtopics have no tests of their own; their subtopics are listed instead
    return Array.from(topicMap.values()).filter((t) => !isGroupTopic(t.id));
  }, [topics, selectedGrade]);

  const visibleExamTopics = allGradeTopics
    .filter((t) => allowedTiers(t.id).length > 0)
    .filter((t) => filter !== 'plan' || learningPlan.inPlan(t.id));

  return (
    <div className="w-full animate-in fade-in duration-150">
      <h2 className="text-lg font-black text-stone-900 mb-3">{selectedGrade}-р ангийн сорилууд</h2>

      {/* Styled Table: One row per topic, clean level selector, centered action buttons, fits without cut off */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200/90 overflow-hidden ring-1 ring-stone-900/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-900 text-white text-xs font-black uppercase tracking-wider">
                <th className="py-2.5 px-3 text-center w-10 border-r border-stone-800">#</th>
                <th className="py-2.5 px-3">Сэдвийн нэр</th>
                <th className="py-2.5 px-2 text-center w-44">Түвшин</th>
                <th className="py-2.5 px-2 text-center w-20">Хугацаа</th>
                <th className="py-2.5 px-3 text-center w-72"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-xs md:text-sm">
              {!examsAllowed || visibleExamTopics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-stone-400">
                    {!examsAllowed ? 'Танд энэ ангийн сорил өгөх эрх олгогдоогүй байна.' : filter === 'plan' ? 'Энэ ангид таны төлөвлөгөөний сорил алга.' : 'Энэ ангид нээлттэй сорил алга байна.'}
                  </td>
                </tr>
              ) : (
                visibleExamTopics.map((topic, idx) => {
                  const tests = (topic.test1?.questions?.length && topic.test2?.questions?.length && topic.test3?.questions?.length)
                    ? { test1: topic.test1, test2: topic.test2, test3: topic.test3 }
                    : generateTopicTests(topic.id, topic.title, topic.grade, topic.category);

                  const tiers = allowedTiers(topic.id);
                  const chosenTier = topicTiers[topic.id];
                  const activeTier: 1 | 2 | 3 = chosenTier && tiers.includes(chosenTier) ? chosenTier : tiers[0];

                  // Topics spanning grades: only questions up to this grade, mixed without grade labels
                  const testPackage = testForGrade(activeTier === 1 ? tests.test1 : activeTier === 2 ? tests.test2 : tests.test3, topic.grade, selectedGrade);
                  const tierName = activeTier === 1 ? 'Анхан шат' : activeTier === 2 ? 'Үндсэн (Дунд)' : 'Ахисан түвшин';
                  const tierBadgeClass = activeTier === 1
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : activeTier === 2
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300';
                  const duration = activeTier === 1 ? '00:20' : activeTier === 2 ? '00:30' : '00:40';
                  const totalPoints = testPackage.totalPoints || (activeTier === 1 ? 10 : activeTier === 2 ? 15 : 20);
                  const examTitle = `${topic.title} - ${activeTier === 1 ? 'Анхан' : activeTier === 2 ? 'Үндсэн' : 'Ахисан'} сорил`;
                  const examId = `${topic.id}-test${activeTier}`;

                  const currentRowItem: ExamRowItem = {
                    id: examId,
                    topicId: topic.id,
                    topicTitle: topic.title,
                    grade: topic.grade,
                    tier: activeTier,
                    tierName,
                    tierBadgeClass,
                    examTitle,
                    duration,
                    questionCount: testPackage.questions.length,
                    totalPoints,
                    testPackage,
                  };

                  const attempt = attempts[examId];
                  const hasAttempt = Boolean(attempt?.finishedAt);

                  const hasTier1Attempt = Boolean(attempts[`${topic.id}-test1`]?.finishedAt);
                  const hasTier2Attempt = Boolean(attempts[`${topic.id}-test2`]?.finishedAt);
                  const hasTier3Attempt = Boolean(attempts[`${topic.id}-test3`]?.finishedAt);

                  return (
                    <tr
                      key={topic.id}
                      className="hover:bg-amber-50/40 transition-colors group"
                    >
                      {/* # Number */}
                      <td className="py-2.5 px-2 text-center font-bold text-stone-600 border-r border-stone-100 text-xs">
                        {idx + 1}
                      </td>

                      {/* Сэдвийн нэр */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-stone-900 leading-tight text-xs md:text-sm">{topic.title}</div>
                      </td>

                      {/* Түвшин: 3-tier Interactive Selector */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="inline-flex items-center p-0.5 bg-stone-100 rounded-lg border border-stone-200 shadow-2xs">
                          {tiers.includes(1) && (
                          <button
                            type="button"
                            onClick={() => setTopicTiers((prev) => ({ ...prev, [topic.id]: 1 }))}
                            className={`px-2 py-0.5 text-xs font-bold rounded transition-all cursor-pointer flex items-center space-x-0.5 ${
                              activeTier === 1
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                            }`}
                            title="1. Анхан сорил (20 минут, 10 оноо)"
                          >
                            <span>Анхан</span>
                            {hasTier1Attempt && (
                              <Check className="w-2.5 h-2.5 text-emerald-200 stroke-[3]" />
                            )}
                          </button>
                          )}
                          {tiers.includes(2) && (
                          <button
                            type="button"
                            onClick={() => setTopicTiers((prev) => ({ ...prev, [topic.id]: 2 }))}
                            className={`px-2 py-0.5 text-xs font-bold rounded transition-all cursor-pointer flex items-center space-x-0.5 ${
                              activeTier === 2
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                            }`}
                            title="2. Үндсэн / Дунд сорил (30 минут, 15 оноо)"
                          >
                            <span>Дунд</span>
                            {hasTier2Attempt && (
                              <Check className="w-2.5 h-2.5 text-amber-200 stroke-[3]" />
                            )}
                          </button>
                          )}
                          {tiers.includes(3) && (
                          <button
                            type="button"
                            onClick={() => setTopicTiers((prev) => ({ ...prev, [topic.id]: 3 }))}
                            className={`px-2 py-0.5 text-xs font-bold rounded transition-all cursor-pointer flex items-center space-x-0.5 ${
                              activeTier === 3
                                ? 'bg-rose-600 text-white shadow-2xs'
                                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                            }`}
                            title="3. Ахисан сорил (40 минут, 20 оноо)"
                          >
                            <span>Ахисан</span>
                            {hasTier3Attempt && (
                              <Check className="w-2.5 h-2.5 text-rose-200 stroke-[3]" />
                            )}
                          </button>
                          )}
                        </div>
                      </td>

                      {/* Хугацаа */}
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-stone-700">
                        <div className="inline-flex items-center justify-center space-x-1 px-2 py-0.5 rounded bg-stone-100 border border-stone-200/80 text-[11px]">
                          <Clock className="w-3 h-3 text-stone-400" />
                          <span>{duration}</span>
                        </div>
                      </td>

                      {/* 4 Custom Action Buttons: Compact and perfectly fit */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                          {/* 1. Сорил эхлэх / Дахин өгөх */}
                          <button
                            type="button"
                            onClick={() => setActiveExam(currentRowItem)}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold text-white transition-all shadow-2xs flex items-center space-x-1 cursor-pointer whitespace-nowrap ${
                              hasAttempt
                                ? 'bg-stone-700 hover:bg-stone-800'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{hasAttempt ? 'Дахин өгөх' : 'Сорил эхлэх'}</span>
                          </button>

                          {/* 2. Дүн харах */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!hasAttempt) {
                                setUnTakenNoticeExam({ exam: currentRowItem, actionType: 'score' });
                              } else {
                                const score = attempt?.score ?? 0;
                                setViewScoreExam({ exam: currentRowItem, score, maxScore: currentRowItem.totalPoints });
                              }
                            }}
                            className="px-2.5 py-1 rounded-md text-xs font-bold text-sky-700 bg-white hover:bg-sky-50 border border-sky-300 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Дүн харах
                          </button>

                          {/* 3. Алдаа шалгах */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!hasAttempt) {
                                setUnTakenNoticeExam({ exam: currentRowItem, actionType: 'error' });
                              } else {
                                setViewErrorCheckExam(currentRowItem);
                              }
                            }}
                            className="px-2.5 py-1 rounded-md text-xs font-bold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Алдаа шалгах
                          </button>

                          {/* 4. Бодолт (only once the admin shows answers for this topic) */}
                          {testPackage.questions.some((q) => q.solution || q.answer) && (
                          <button
                            type="button"
                            onClick={() => setViewSolutionExam(currentRowItem)}
                            className="px-2.5 py-1 rounded-md text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Бодолт
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notice Dialog when user clicks "Дүн харах" or "Алдаа шалгах" before taking exam */}
      {unTakenNoticeExam && (
        <div {...backdropClose(() => setUnTakenNoticeExam(null))} className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-stone-300 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <HelpCircle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-base font-black text-stone-900">
                Сорил хараахан өгөгдөөгүй байна
              </h2>
              <p className="text-xs text-stone-600 mt-1 max-w-sm mx-auto leading-relaxed">
                Та <strong>«{unTakenNoticeExam.exam.examTitle}»</strong> сорилыг хараахан ажиллаагүй байна. &quot;Сорил эхлэх&quot; товчийг дарж сорилоо өгсний дараа дүн болон алдааны шинжилгээгээ харах боломжтой.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const e = unTakenNoticeExam.exam;
                  setUnTakenNoticeExam(null);
                  setActiveExam(e);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Одоо сорил эхлэх</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const e = unTakenNoticeExam.exam;
                  setUnTakenNoticeExam(null);
                  setViewSolutionExam(e);
                }}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Зөвхөн бодолтыг харах
              </button>
              <button
                type="button"
                onClick={() => setUnTakenNoticeExam(null)}
                className="w-full py-1 text-xs text-stone-500 hover:text-stone-800"
              >
                Буцах
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: TAKE EXAM (Сорил өгөх цонх) --- */}
      {activeExam && (
        <TakeExamModal
          exam={activeExam}
          initialAnswers={attempts[activeExam.id]?.answers || {}}
          onClose={() => setActiveExam(null)}
          onFinish={(answers, score) => {
            const prev = attempts[activeExam.id];
            saveAttempt(activeExam.id, {
              answers,
              score,
              bestScore: Math.max(score, prev?.bestScore ?? prev?.score ?? 0),
              maxPoints: activeExam.totalPoints,
              finishedAt: Date.now(),
            });
            setActiveExam(null);
            setViewScoreExam({ exam: activeExam, score, maxScore: activeExam.totalPoints });
          }}
        />
      )}

      {/* --- MODAL 2: VIEW SOLUTION (Алхамчилсан бодолт харах) --- */}
      {viewSolutionExam && (
        <ViewSolutionModal
          exam={viewSolutionExam}
          onClose={() => setViewSolutionExam(null)}
        />
      )}

      {/* --- MODAL 3: VIEW SCORE (Дүн харах) --- */}
      {viewScoreExam && (
        <ViewScoreModal
          item={viewScoreExam}
          attempt={attempts[viewScoreExam.exam.id]}
          onClose={() => setViewScoreExam(null)}
          onRetake={() => {
            const e = viewScoreExam.exam;
            setViewScoreExam(null);
            setActiveExam(e);
          }}
          onViewSolutions={() => {
            const e = viewScoreExam.exam;
            setViewScoreExam(null);
            setViewSolutionExam(e);
          }}
        />
      )}

      {/* --- MODAL 4: ERROR CHECK (Алдаа шалгах) --- */}
      {viewErrorCheckExam && (
        <ViewErrorCheckModal
          exam={viewErrorCheckExam}
          attempt={attempts[viewErrorCheckExam.id]}
          onClose={() => setViewErrorCheckExam(null)}
          onViewSolutions={() => {
            const e = viewErrorCheckExam;
            setViewErrorCheckExam(null);
            setViewSolutionExam(e);
          }}
        />
      )}
      {/* Admin: who took this grade's topic tests, by user ID */}
      {isAdmin && <GradeTestTakers topics={visibleExamTopics} />}
    </div>
  );
};

/* ==============================================================
   MODAL 1: TAKE EXAM (Хугацаатай сорил ажиллах цонх)
   ============================================================== */
function TakeExamModal({
  exam,
  initialAnswers,
  onClose,
  onFinish,
}: {
  exam: ExamRowItem;
  initialAnswers: Record<string, string>;
  onClose: () => void;
  onFinish: (answers: Record<string, string>, score: number) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({ ...initialAnswers });
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    // 20, 30, or 40 minutes in seconds
    const mins = exam.tier === 1 ? 20 : exam.tier === 2 ? 30 : 40;
    return mins * 60;
  });

  // Countdown timer
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    // Auto-grader checking test choices
    let earned = 0;
    exam.testPackage.questions.forEach((q) => {
      const opts = getQuestionOptions(q);
      const userAns = answers[q.id] || '';
      if (isOptionCorrect(userAns, q, opts)) {
        earned += q.points || Math.round(exam.totalPoints / exam.testPackage.questions.length);
      }
    });

    onFinish(answers, earned);
  };

  return (
    <div {...backdropClose(onClose, 'Шалгалтын хариултууд хадгалагдахгүй. Хаах уу?')} className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              {exam.tierName} • {exam.grade}-р анги
            </span>
            <h2 className="text-sm md:text-base font-black">{exam.examTitle}</h2>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-300 font-mono font-bold text-xs md:text-sm">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>{formatTimer(timeLeft)}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Questions list */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {exam.testPackage.questions.map((q, idx) => (
            <div key={q.id || idx} className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-2 text-xs md:text-sm text-stone-900 font-semibold leading-relaxed min-w-0">
                  <span className="font-black shrink-0">{idx + 1}.</span>
                  <MathRenderer content={questionStem(q)} />
                </div>
                <div className="shrink-0">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-stone-300 text-amber-900">
                    {q.points} оноо
                  </span>
                </div>
              </div>

              {isOpenQuestion(q) ? (
                // No choices written for this question: the student types the answer
                <div className="space-y-1.5 pt-1">
                  <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Хариултаа энд бичнэ үү"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    data-testid="open-answer"
                  />
                  {(answers[q.id] || '').includes('\\') && (
                    <div className="text-xs text-stone-600 px-1">
                      <MathRenderer content={`$${answers[q.id]}$`} />
                    </div>
                  )}
                  <p className="text-[11px] text-stone-500 px-1">Зөвхөн эцсийн хариугаа бичнэ. Бутархайг 3/4 эсвэл \frac{3}{4} гэж бичнэ.</p>
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {getQuestionOptions(q).map((opt) => {
                  const isSelected = (answers[q.id] || '').trim().toUpperCase() === opt.letter;

                  return (
                    <button
                      key={opt.letter}
                      type="button"
                      onClick={() => setAnswers({ ...answers, [q.id]: opt.letter })}
                      className={`p-3 rounded-xl border text-left flex items-start space-x-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-400 text-stone-950 font-bold shadow-xs'
                          : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/80 text-stone-800'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-stone-950 shadow-2xs'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {opt.letter}
                      </span>
                      <div className="text-xs md:text-sm font-medium pt-0.5 leading-relaxed">
                        <MathRenderer content={opt.text} />
                      </div>
                    </button>
                  );
                })}
              </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-lg cursor-pointer"
          >
            Гарах
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Сорилыг дуусгаж дүнгээ авах</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==============================================================
   MODAL 2: VIEW SOLUTIONS (Бодолт харах цонх)
   ============================================================== */
function ViewSolutionModal({
  exam,
  onClose,
}: {
  exam: ExamRowItem;
  onClose: () => void;
}) {
  return (
    <div {...backdropClose(onClose)} className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-rose-900 text-white flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider block">
              Алхамчилсан бодолтууд
            </span>
            <h2 className="text-sm md:text-base font-black">{exam.examTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-rose-300 hover:text-white hover:bg-rose-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
          {exam.testPackage.questions.map((q, idx) => (
            <div key={q.id || idx} className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-2 text-xs md:text-sm text-stone-900 font-semibold leading-relaxed min-w-0">
                  <span className="font-black shrink-0">{idx + 1}.</span>
                  <MathRenderer content={questionStem(q)} />
                </div>
                <div className="shrink-0">
                  <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {q.points} оноо
                  </span>
                </div>
              </div>

              {/* Test Options (A, B, C, D) with Correct Answer Highlighted */}
              {isOpenQuestion(q) ? (
                <div className="p-2.5 rounded-xl border bg-emerald-50 border-emerald-400 text-emerald-950 text-xs md:text-sm font-bold">
                  ✓ Зөв хариу: <MathRenderer content={correctOption(q, getQuestionOptions(q))?.text || q.answer || '—'} />
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {getQuestionOptions(q).map((opt) => {
                  const isCorrect = isOptionCorrect(opt.letter, q, getQuestionOptions(q));

                  return (
                    <div
                      key={opt.letter}
                      className={`p-2.5 rounded-xl border text-left flex items-start space-x-2.5 ${
                        isCorrect
                          ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 text-emerald-950 font-bold'
                          : 'bg-white border-stone-200 text-stone-700 opacity-70'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-600 text-white'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {opt.letter}
                      </span>
                      <div className="text-xs md:text-sm font-medium pt-0.5 flex-1">
                        <MathRenderer content={opt.text} />
                        {isCorrect && (
                          <span className="ml-2 text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                            ✓ Зөв хариу
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}

              {/* Solution Box */}
              <div className="p-3.5 bg-white border border-rose-200 rounded-lg space-y-1.5 text-xs md:text-sm">
                <div className="font-bold text-rose-900 text-xs uppercase tracking-wider">
                  Алхамчилсан тайлбар бодолт:
                </div>
                {q.solution && (
                  <div className="text-stone-700 text-xs pt-1 border-t border-dashed border-stone-200 leading-relaxed">
                    <MathRenderer content={q.solution} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 bg-stone-100 border-t border-stone-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Хаах
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==============================================================
   MODAL 3: VIEW SCORE (Дүн харах цонх)
   ============================================================== */
function ViewScoreModal({
  item,
  attempt,
  onClose,
  onRetake,
  onViewSolutions,
}: {
  item: { exam: ExamRowItem; score: number; maxScore: number };
  attempt?: { answers: Record<string, string>; finishedAt?: number };
  onClose: () => void;
  onRetake: () => void;
  onViewSolutions: () => void;
}) {
  const percentage = Math.round((item.score / item.maxScore) * 100);
  const isPassed = percentage >= 60;

  return (
    <div {...backdropClose(onClose)} className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-stone-300 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xs ${
          isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
        }`}>
          <Award className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Сорилын дүнгийн тайлан
          </span>
          <h2 className="text-base md:text-lg font-black text-stone-900 mt-1">
            {item.exam.examTitle}
          </h2>
        </div>

        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
          <div className="text-3xl font-black text-stone-900">
            {item.score} / {item.maxScore}
          </div>
          <div className="text-xs font-bold text-stone-500 mt-1">
            Амжилт: {percentage}% ({isPassed ? 'Тэнцсэн' : 'Дахин давтах шаардлагатай'})
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={onViewSolutions}
            className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Бодолтуудыг харах
          </button>
          <button
            type="button"
            onClick={onRetake}
            className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Дахин сорил өгөх
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
          >
            Хаах
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==============================================================
   MODAL 4: VIEW ERROR CHECK (Алдаа шалгах цонх)
   ============================================================== */
function ViewErrorCheckModal({
  exam,
  attempt,
  onClose,
  onViewSolutions,
}: {
  exam: ExamRowItem;
  attempt?: { answers: Record<string, string> };
  onClose: () => void;
  onViewSolutions: () => void;
}) {
  const userAnswers = attempt?.answers || {};

  return (
    <div {...backdropClose(onClose)} className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              Алдааны шинжилгээ ба шалгалт
            </span>
            <h2 className="text-sm md:text-base font-black">{exam.examTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {exam.testPackage.questions.map((q, idx) => {
            const opts = getQuestionOptions(q);
            const userAns = (userAnswers[q.id] || '').trim();
            const isCorrect = isOptionCorrect(userAns, q, opts);

            return (
              <div
                key={q.id || idx}
                className={`p-4 rounded-xl border space-y-3 ${
                  isCorrect
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-rose-50/40 border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-2 text-xs md:text-sm text-stone-900 font-semibold leading-relaxed min-w-0">
                    <span className="font-black shrink-0">{idx + 1}.</span>
                    <MathRenderer content={questionStem(q)} />
                  </div>
                  <div className="shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>{isCorrect ? 'Зөв хариулсан' : 'Алдаатай'}</span>
                    </span>
                  </div>
                </div>

                {/* Display 4 Options with user choice & correct choice highlighted */}
                {isOpenQuestion(q) ? (
                  <div className="space-y-1.5 text-xs md:text-sm">
                    <div className={`p-2.5 rounded-xl border ${isCorrect ? 'bg-emerald-50 border-emerald-400' : 'bg-rose-50 border-rose-400'}`}>
                      Таны хариулт: <b>{userAns || 'Хариулаагүй'}</b>
                    </div>
                    {!isCorrect && (
                      <div className="p-2.5 rounded-xl border bg-emerald-50 border-emerald-400 font-bold text-emerald-950">
                        ✓ Зөв хариу: <MathRenderer content={correctOption(q, opts)?.text || q.answer || '—'} />
                      </div>
                    )}
                  </div>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {opts.map((opt) => {
                    const isUserChoice = userAns.toUpperCase() === opt.letter;
                    const isRightOption = isOptionCorrect(opt.letter, q, opts);

                    let boxStyle = 'bg-white border-stone-200 text-stone-600';
                    let badge = null;

                    if (isRightOption) {
                      boxStyle = 'bg-emerald-50 border-emerald-500 font-bold text-emerald-950 ring-1 ring-emerald-400';
                      badge = <span className="text-[10px] text-emerald-700 font-bold ml-1.5">✓ Зөв хариу</span>;
                    }
                    if (isUserChoice && !isRightOption) {
                      boxStyle = 'bg-rose-50 border-rose-500 font-bold text-rose-950 ring-1 ring-rose-400';
                      badge = <span className="text-[10px] text-rose-700 font-bold ml-1.5">✗ Таны сонгосон</span>;
                    } else if (isUserChoice && isRightOption) {
                      badge = <span className="text-[10px] text-emerald-700 font-bold ml-1.5">✓ Таны зөв сонголт</span>;
                    }

                    return (
                      <div
                        key={opt.letter}
                        className={`p-2.5 rounded-xl border text-left flex items-start space-x-2.5 ${boxStyle}`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                            isRightOption
                              ? 'bg-emerald-600 text-white'
                              : isUserChoice
                              ? 'bg-rose-600 text-white'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {opt.letter}
                        </span>
                        <div className="text-xs md:text-sm pt-0.5 flex-1">
                          <MathRenderer content={opt.text} />
                          {badge}
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}

                {q.solution && (
                  <div className="p-3 bg-white/80 border border-stone-200 rounded-lg text-xs text-stone-700 leading-relaxed">
                    <span className="font-bold text-stone-900 block mb-0.5">Бодолт ба тайлбар:</span>
                    <MathRenderer content={q.solution} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onViewSolutions}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Дэлгэрэнгүй бодолтыг харах
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-stone-300 text-stone-700 text-xs font-bold rounded-lg cursor-pointer"
          >
            Хаах
          </button>
        </div>
      </div>
    </div>
  );
}
