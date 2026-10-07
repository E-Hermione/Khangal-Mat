import React, { useState, useEffect } from 'react';
import { TopicPackage, PrintOptions, TheoryRule, WorkedExample, PracticeProblem } from '../types';
import { TheorySection } from './TheorySection';
import { WorkedExamplesSection } from './WorkedExamplesSection';
import { PracticeSection } from './PracticeSection';
import { usePrintSelection } from '../services/printSelection';
import { ItemEditorModal, ItemEditorType } from './ItemEditorModal';
import { visibilityService, TopicAccessMode } from '../services/visibilityService';
import { userPermissionsService } from '../services/userPermissionsService';
import { allTopicMetas, learningPlan, useLearningPlanVersion } from '../services/learningPlan';
import { loadPracticeGrants, usePracticeSolutions } from '../services/practiceSolutions';
import { PracticeGrantsDialog } from './PracticeGrantsDialog';
import { getFirebaseAuth } from '../services/firebase';
import { AuthUser } from '../types';
import {
  Printer,
  ChevronRight,
  Lock,
  BookOpen,
  Pencil,
  Award,
  Play,
  ArrowRight,
  Unlock,
} from 'lucide-react';

interface TopicPageProps {
  topic: TopicPackage;
  isAdmin: boolean;
  currentUser?: AuthUser | null;
  onUpdateTopic?: (updatedTopic: TopicPackage) => void;
  onOpenAdmin?: () => void;
  onPreviewAsUser?: () => void;
  onOpenExamsHub?: (topicId?: string) => void;
  // Students with a learning plan: back to the plan
  onOpenPlan?: () => void;
  // The grade the topic is shown for (the student's own grade, or the grade the admin is browsing)
  viewGrade?: number;
}

export const TopicPage: React.FC<TopicPageProps> = ({
  topic,
  isAdmin,
  currentUser,
  onUpdateTopic,
  onOpenAdmin,
  onOpenExamsHub,
  onOpenPlan,
  viewGrade,
}) => {
  useLearningPlanVersion();
  // Practice solutions: the admin opens them per topic for chosen users
  const grantedSolutions = usePracticeSolutions(isAdmin ? undefined : getFirebaseAuth().currentUser?.uid, topic.id);
  const [grantsOpen, setGrantsOpen] = useState(false);
  // The lesson shows one part at a time: theory, examples or exercises (printing shows them all)
  const [lessonTab, setLessonTab] = useState<'theory' | 'examples' | 'practice'>('theory');
  useEffect(() => setLessonTab('theory'), [topic.id]);
  const [grantCount, setGrantCount] = useState<number | null>(null);
  useEffect(() => {
    setGrantCount(null);
    if (isAdmin) loadPracticeGrants(topic.id).then((u) => setGrantCount(u.length)).catch(() => {});
  }, [isAdmin, topic.id]);
  // Students with a learning plan see paid plan topics in full and nothing else
  const planGate = isAdmin ? null : learningPlan.topicGate(topic.id);
  // Selection for core lesson sections: Theory, Examples, Practice
  const [selection] = usePrintSelection();

  const [options] = useState<PrintOptions>({
    includeWorkSpace: true,
    teacherVersion: false,
    fontSize: 'md',
    twoColumnPractice: false,
  });

  // In-page editing state (for Theory, Examples, Practice)
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [activeEditorTarget, setActiveEditorTarget] = useState<ItemEditorType | null>(null);

  // User visibility config for this topic (read from storage)
  const [accessMode, setAccessMode] = useState<TopicAccessMode>(() =>
    visibilityService.getTopicAccessMode(topic.id)
  );
  useEffect(() => {
    const handleUpdate = () => {
      setAccessMode(visibilityService.getTopicAccessMode(topic.id));
    };

    handleUpdate();
    window.addEventListener('visibility-settings-updated', handleUpdate);
    window.addEventListener('user-permissions-updated', handleUpdate);
    return () => {
      window.removeEventListener('visibility-settings-updated', handleUpdate);
      window.removeEventListener('user-permissions-updated', handleUpdate);
    };
  }, [topic.id]);

  const planOpen = planGate === 'open';
  // An open topic shows all its parts; the hidden/locked cases are handled below
  const allOpen = isAdmin || planOpen || userPermissionsService.hasAccess(currentUser?.userId, isAdmin);
  const isTheoryAllowed = allOpen;
  const isExamplesAllowed = allOpen;
  const isPracticeAllowed = allOpen;
  const isExamsAllowed = allOpen;

  const anyAdminSectionSelected =
    selection.theory ||
    selection.examples ||
    selection.practice;

  const anyUserSectionVisible =
    isTheoryAllowed ||
    isExamplesAllowed ||
    isPracticeAllowed;

  // Helper to commit topic changes to parent / storage
  const commitTopicChange = (updated: TopicPackage) => {
    if (onUpdateTopic) {
      onUpdateTopic(updated);
    }
  };

  /* ================= THEORY HANDLERS ================= */
  const handleOpenAddTheory = () => {
    setActiveEditorTarget({
      type: 'theory',
      item: {
        id: `th-${Date.now()}`,
        title: 'Шинэ онол, тодорхойлолт',
        ruleText: 'Онолын тодорхойлолт энд бичнэ. Жишээ: $a^2 + b^2 = c^2$',
        formula: '',
        badge: 'Дүрэм',
      },
      isNew: true,
    });
  };

  const handleOpenEditTheory = (rule: TheoryRule) => {
    setActiveEditorTarget({
      type: 'theory',
      item: rule,
      isNew: false,
    });
  };

  const handleSaveTheory = (rule: TheoryRule, isNew?: boolean) => {
    const currentList = topic.theory || [];
    let updatedList: TheoryRule[];
    if (isNew) {
      updatedList = [...currentList, rule];
    } else {
      updatedList = currentList.map((item) => (item.id === rule.id ? rule : item));
    }
    commitTopicChange({ ...topic, theory: updatedList });
  };

  const handleDeleteTheory = (ruleId: string) => {
    const updatedList = (topic.theory || []).filter((item) => item.id !== ruleId);
    commitTopicChange({ ...topic, theory: updatedList });
  };

  /* ================= EXAMPLES HANDLERS ================= */
  const handleOpenAddExample = () => {
    const nextNum = (topic.examples?.length || 0) + 1;
    setActiveEditorTarget({
      type: 'example',
      item: {
        id: `ex-${Date.now()}`,
        number: nextNum,
        title: `Жишээ ${nextNum}`,
        problem: 'Бодлогын нөхцөл энд бичнэ. Жишээ: $2x + 6 = 10$',
        solutionSteps: ['Алхам 1: Тэгшитгэлийн хоёр талыг хялбарчилна.', 'Алхам 2: $2x = 4 \\implies x = 2$'],
        answer: '$x = 2$',
      },
      isNew: true,
    });
  };

  const handleOpenEditExample = (example: WorkedExample) => {
    setActiveEditorTarget({
      type: 'example',
      item: example,
      isNew: false,
    });
  };

  const handleSaveExample = (example: WorkedExample, isNew?: boolean) => {
    const currentList = topic.examples || [];
    let updatedList: WorkedExample[];
    if (isNew) {
      updatedList = [...currentList, example];
    } else {
      updatedList = currentList.map((item) => (item.id === example.id ? example : item));
    }
    // Re-number
    updatedList.forEach((item, idx) => {
      item.number = idx + 1;
    });
    commitTopicChange({ ...topic, examples: updatedList });
  };

  const handleDeleteExample = (exampleId: string) => {
    const updatedList = (topic.examples || []).filter((item) => item.id !== exampleId);
    updatedList.forEach((item, idx) => {
      item.number = idx + 1;
    });
    commitTopicChange({ ...topic, examples: updatedList });
  };

  /* ================= PRACTICE HANDLERS ================= */
  const handleOpenAddPractice = () => {
    const nextNum = (topic.practice?.length || 0) + 1;
    setActiveEditorTarget({
      type: 'practice',
      item: {
        id: `pr-${Date.now()}`,
        number: nextNum,
        question: 'Дасгал бодлогын нөхцөл энд бичнэ. Жишээ: $3(x - 1) = 9$',
        hint: 'Хаалтыг задалж бодоорой.',
        difficulty: 'medium',
        answer: '$x = 4$',
        solution: '$3x - 3 = 9 \\implies 3x = 12 \\implies x = 4$',
        workSpaceLines: 4,
      },
      isNew: true,
    });
  };

  const handleOpenEditPractice = (practice: PracticeProblem) => {
    setActiveEditorTarget({
      type: 'practice',
      item: practice,
      isNew: false,
    });
  };

  const handleSavePractice = (practice: PracticeProblem, isNew?: boolean) => {
    const currentList = topic.practice || [];
    let updatedList: PracticeProblem[];
    if (isNew) {
      updatedList = [...currentList, practice];
    } else {
      updatedList = currentList.map((item) => (item.id === practice.id ? practice : item));
    }
    // Re-number
    updatedList.forEach((item, idx) => {
      item.number = idx + 1;
    });
    commitTopicChange({ ...topic, practice: updatedList });
  };

  const handleDeletePractice = (practiceId: string) => {
    const updatedList = (topic.practice || []).filter((item) => item.id !== practiceId);
    updatedList.forEach((item, idx) => {
      item.number = idx + 1;
    });
    commitTopicChange({ ...topic, practice: updatedList });
  };

  const handleDeleteItem = (target: ItemEditorType) => {
    if (target.type === 'theory') {
      handleDeleteTheory(target.item.id);
    } else if (target.type === 'example') {
      handleDeleteExample(target.item.id);
    } else if (target.type === 'practice') {
      handleDeletePractice(target.item.id);
    }
  };

  // A topic can span grades: each part is marked with its grade. Parts above the viewer's grade are hidden;
  // the rest reads as one lesson from the lowest grade up (exercises also from easy to hard).
  const viewerGrade = viewGrade ?? topic.grade;
  const partGrade = (x: { prerequisiteGrade?: number }) => x.prerequisiteGrade ?? topic.grade;
  const LEVEL = { easy: 0, medium: 1, hard: 2 } as const;
  const upTo = <T extends { prerequisiteGrade?: number }>(list: T[] = []) =>
    list.filter((x) => partGrade(x) <= viewerGrade).sort((x, y) => partGrade(x) - partGrade(y));
  const mainTopic: TopicPackage = {
    ...topic,
    theory: upTo(topic.theory),
    examples: upTo(topic.examples).map((ex, i) => ({ ...ex, number: i + 1 })),
    practice: upTo<PracticeProblem>(topic.practice)
      .sort((x, y) => partGrade(x) - partGrade(y) || (LEVEL[x.difficulty] ?? 1) - (LEVEL[y.difficulty] ?? 1))
      .map((p, i) => ({ ...p, number: i + 1 })),
  };

  const renderSections = (t: TopicPackage, main: boolean) => (
    <>
              {/* 1. Theory */}
              {((isAdmin && selection.theory) || (!isAdmin && isTheoryAllowed)) && (
                <div className={lessonTab === 'theory' ? '' : 'hidden print:block'}>
                <TheorySection
                  theory={t.theory}
                  isEditable={isAdmin && isEditMode}
                  onAddRule={handleOpenAddTheory}
                  onEditRule={handleOpenEditTheory}
                  onDeleteRule={handleDeleteTheory}
                />
                </div>
              )}

              {/* 2. Worked Examples */}
              {((isAdmin && selection.examples) || (!isAdmin && isExamplesAllowed)) && (
                <div className={lessonTab === 'examples' ? '' : 'hidden print:block'}>
                <WorkedExamplesSection
                  examples={t.examples}
                  isEditable={isAdmin && isEditMode}
                  onAddExample={handleOpenAddExample}
                  onEditExample={handleOpenEditExample}
                  onDeleteExample={handleDeleteExample}
                />
                </div>
              )}

              {/* 3. Practice Exercises */}
              {((isAdmin && selection.practice) || (!isAdmin && isPracticeAllowed)) && (
                <div className={lessonTab === 'practice' ? '' : 'hidden print:block'}>
                <PracticeSection
                  practice={
                    grantedSolutions
                      ? (t.practice || []).map((p) => (grantedSolutions[p.id] ? { ...p, ...grantedSolutions[p.id] } : p))
                      : t.practice
                  }
                  includeWorkSpace={isAdmin ? options.includeWorkSpace : false}
                  teacherVersion={isAdmin ? options.teacherVersion : false}
                  allowSolutions={isAdmin || !!grantedSolutions}
                  headerExtra={
                    isAdmin && main && (
                      <button
                        type="button"
                        onClick={() => setGrantsOpen(true)}
                        className="text-xs px-2.5 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold flex items-center space-x-1 cursor-pointer"
                        data-testid="open-practice-grants"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Бодолт нээх{grantCount !== null ? ` (${grantCount})` : ''}</span>
                      </button>
                    )
                  }
                  isEditable={isAdmin && isEditMode}
                  onAddPractice={handleOpenAddPractice}
                  onEditPractice={handleOpenEditPractice}
                  onDeletePractice={handleDeletePractice}
                />
                </div>
              )}

    </>
  );

  // The lesson itself shows (not a locked or hidden notice), so its tabs show in the header
  // Short line under each lesson tab
  const TAB_HINT = { theory: 'Дүрэм, тодорхойлолт', examples: 'Бодсон жишээ', practice: 'Бие даан бодох' } as const;
  const parentTitle = topic.parentId ? allTopicMetas().find((t) => t.id === topic.parentId)?.title : undefined;
  const showLesson = !(planGate && planGate !== 'open') && (isAdmin || planOpen || (accessMode !== 'hidden' && accessMode !== 'locked'));

  return (
    <div className="w-full">
      {/* Screen Breadcrumb & Title Bar */}
      <div className="no-print mb-5">
        <div className="text-xs text-stone-500 mb-2">
          {/* Grade › category › parent topic (for a subtopic) › this lesson */}
          <nav className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 font-medium">
            <span className="font-bold text-stone-800">{topic.grade}-р анги</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <span>{topic.category}</span>
            {parentTitle && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
                <span>{parentTitle}</span>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-amber-700 font-bold">{topic.title}</span>
          </nav>
        </div>

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-black text-stone-950 tracking-tight">
            {topic.title}
          </h1>

          {isAdmin && onOpenAdmin && (
            <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg transition-all cursor-pointer shadow-2xs shrink-0"
              title="Сэдвийн агуулга, онол, дасгал, шалгалтыг засах"
            >
              <Pencil className="w-3.5 h-3.5 text-stone-500" />
              <span>Сэдэв засах</span>
            </button>
            </div>
          )}
        </div>

        {topic.description && (
          <p className="text-xs md:text-sm text-stone-500 mt-1 max-w-3xl leading-relaxed">
            {topic.description}
          </p>
        )}

      </div>

      {/* MAIN DOCUMENT CANVAS */}
      {planGate && planGate !== 'open' ? (
        <div className="py-16 px-6 max-w-xl mx-auto text-center bg-white rounded-2xl border border-stone-200 shadow-sm my-6 space-y-3" data-testid="plan-locked">
          <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-stone-900">
            {planGate === 'needs-placement'
              ? 'Эхлээд түвшин тогтоох сорил өгнө үү'
              : planGate === 'unpaid'
              ? 'Төлбөр төлсний дараа нээгдэнэ'
              : 'Энэ сэдэв таны төлөвлөгөөнд ороогүй'}
          </h2>
          <p className="text-sm text-stone-600">
            {planGate === 'needs-placement'
              ? 'Сорилын дүнгээр танд зориулсан сургалтын төлөвлөгөө гарч, хичээлүүд тэр дагуу нээгдэнэ.'
              : planGate === 'unpaid'
              ? 'Энэ сэдэв таны сургалтын төлөвлөгөөнд байгаа. Төлбөрөө төлөөд үзээрэй.'
              : 'Түвшин тогтоох шалгалтын дүнгээр гарсан төлөвлөгөөнийхөө сэдвүүдийг үзнэ үү.'}
          </p>
          {onOpenPlan && (
            <button
              type="button"
              onClick={onOpenPlan}
              className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-sm font-bold cursor-pointer"
            >
              Нүүр хуудас руу очих
            </button>
          )}
        </div>
      ) : !isAdmin && !planOpen && accessMode === 'hidden' ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-stone-200 p-8 shadow-xs">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3.5 text-stone-400">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-stone-800">
            Энэ сэдэв одоогоор хэрэглэгчдэд нээгдээгүй байна
          </h2>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Багш энэхүү хичээлийн агуулгыг хэрэглэгчдэд нээсний дараа энд харагдах болно.
          </p>
        </div>
      ) : !isAdmin && !planOpen && accessMode === 'locked' ? (
        <div className="py-16 px-6 max-w-xl mx-auto text-center bg-white rounded-2xl border-2 border-amber-300 shadow-sm my-6 space-y-4">
          <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto shadow-2xs ring-4 ring-amber-50">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Түгжигдсэн хичээл
            </span>
            <h2 className="text-lg md:text-xl font-black text-stone-900 pt-2">
              «{topic.title}» хичээл түгжээтэй байна
            </h2>
            <p className="text-xs md:text-sm text-stone-600 max-w-md mx-auto leading-relaxed pt-1">
              Энэ хичээлийн агуулгыг үзэхийн тулд <strong>багшаар уг хичээлийг нээлгэнэ үү</strong>.
            </p>
          </div>
        </div>
      ) : (
        <>
        {/* Tabs above the lesson card: one part of the lesson at a time */}
        {showLesson && (() => {
          const tabs = (
            [
              ['theory', 'Онол', mainTopic.theory.length, (isAdmin && selection.theory) || (!isAdmin && isTheoryAllowed)],
              ['examples', 'Жишээ', mainTopic.examples.length, (isAdmin && selection.examples) || (!isAdmin && isExamplesAllowed)],
              ['practice', 'Дасгал', mainTopic.practice.length, (isAdmin && selection.practice) || (!isAdmin && isPracticeAllowed)],
            ] as const
          ).filter(([, , , shown]) => shown);
          if (tabs.length > 0 && !tabs.some(([key]) => key === lessonTab)) setTimeout(() => setLessonTab(tabs[0][0]));
          return (
            tabs.length > 0 && (
              <div
                className="flex gap-1.5 p-1.5 mb-4 rounded-2xl bg-[#3D0C02] no-print"
                role="tablist"
                data-testid="lesson-tabs"
              >
                {tabs.map(([key, label]) => {
                  const on = lessonTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setLessonTab(key)}
                      className={`flex-1 py-2 px-2 rounded-lg transition-all cursor-pointer ${
                        on
                          ? 'bg-white shadow-[inset_0_-3px_0_#f59e0b,0_1px_4px_rgba(0,0,0,0.1)]'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      <div className={`text-sm md:text-base font-extrabold ${on ? 'text-stone-950' : 'text-white'}`}>{label}</div>
                      <div className={`text-[11px] md:text-xs mt-0.5 hidden sm:block ${on ? 'text-stone-400' : 'text-white/60'}`}>{TAB_HINT[key]}</div>
                    </button>
                  );
                })}
              </div>
            )
          );
        })()}
        <article className="print-container bg-white rounded-[28px] shadow-[0_20px_40px_-12px_rgba(17,24,39,0.18)] px-5 md:px-10 pt-6 pb-8 print:shadow-none print:rounded-none print:p-0">
          {/* Admin with nothing selected */}
          {isAdmin && !anyAdminSectionSelected && (
            <div className="py-16 text-center text-stone-400 border-2 border-dashed border-stone-200 rounded-xl my-4 no-print">
              <Printer className="w-10 h-10 mx-auto text-stone-300 mb-2" />
              <p className="font-semibold text-sm text-stone-600">
                Хэвлэх эсвэл харах хэсгээ сонгоогүй байна.
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Дээрх сонголтоос онол, жишээ, эсвэл дасгалыг чагтална уу.
              </p>
            </div>
          )}

          {/* User with no sections enabled by admin */}
          {!isAdmin && !anyUserSectionVisible && (
            <div className="py-16 text-center text-stone-400 border-2 border-dashed border-stone-200 rounded-xl my-4">
              <BookOpen className="w-10 h-10 mx-auto text-stone-300 mb-2" />
              <p className="font-semibold text-sm text-stone-700">
                Энэ хичээлийн агуулгыг багш/админ хараахан нийтлээгүй байна.
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Багш уг сэдвийн онол, жишээ эсвэл дасгалыг нээсний дараа энд харагдана.
              </p>
            </div>
          )}

          {renderSections(mainTopic, true)}

          {/* Link to 3-tier Exams Hub for this topic (Neat banner) */}
          {onOpenExamsHub && isExamsAllowed && (
            <div className="mt-10 p-5 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 text-white rounded-2xl border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm no-print">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Award className="w-4 h-4" />
                  <span>Шалгалтын төв • {topic.grade}-р анги</span>
                </div>
                <h3 className="text-sm md:text-base font-black text-white">
                  «{topic.title}» - Анхан, Үндсэн, Ахисан 3 шалгалт
                </h3>
                <p className="text-xs text-stone-400 max-w-xl leading-relaxed">
                  Энэ сэдвээр 3 түвшний шалгалтыг цаг тоолууртай ажиллаж, оноо дүнгээ харах, алдаагаа шалгах болон бодолттой нь танилцах боломжтой.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenExamsHub(topic.id)}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Шалгалт өгөх</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </article>
        </>
      )}

      {grantsOpen && (
        <PracticeGrantsDialog topic={topic} onClose={() => setGrantsOpen(false)} onSaved={setGrantCount} />
      )}

      {/* Item Editor Modal with LaTeX live preview (Theory, Examples, Practice) */}
      <ItemEditorModal
        isOpen={Boolean(activeEditorTarget)}
        target={activeEditorTarget}
        onClose={() => setActiveEditorTarget(null)}
        onSaveTheory={handleSaveTheory}
        onSaveExample={handleSaveExample}
        onSavePractice={handleSavePractice}
        onDelete={handleDeleteItem}
      />
    </div>
  );
};
