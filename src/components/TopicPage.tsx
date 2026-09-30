import React, { useState, useEffect } from 'react';
import { TopicPackage, PrintSectionsSelection, PrintOptions, TheoryRule, WorkedExample, PracticeProblem } from '../types';
import { TheorySection } from './TheorySection';
import { WorkedExamplesSection } from './WorkedExamplesSection';
import { PracticeSection } from './PracticeSection';
import { PrintControlPanel } from './PrintControlPanel';
import { ItemEditorModal, ItemEditorType } from './ItemEditorModal';
import { visibilityService, TopicSectionVisibility, TopicAccessMode } from '../services/visibilityService';
import { userPermissionsService } from '../services/userPermissionsService';
import { accessRequestService } from '../services/accessRequestService';
import { AuthUser } from '../types';
import {
  Printer,
  ChevronRight,
  Lock,
  BookOpen,
  Pencil,
  Send,
  CheckCircle2,
  AlertCircle,
  Award,
  Play,
  ArrowRight,
} from 'lucide-react';

interface TopicPageProps {
  topic: TopicPackage;
  isAdmin: boolean;
  currentUser?: AuthUser | null;
  onUpdateTopic?: (updatedTopic: TopicPackage) => void;
  onOpenAdmin?: () => void;
  onPreviewAsUser?: () => void;
  onOpenExamsHub?: (topicId?: string) => void;
}

export const TopicPage: React.FC<TopicPageProps> = ({
  topic,
  isAdmin,
  currentUser,
  onUpdateTopic,
  onOpenAdmin,
  onOpenExamsHub,
}) => {
  // Selection for core lesson sections: Theory, Examples, Practice
  const [selection, setSelection] = useState<PrintSectionsSelection>({
    theory: true,
    examples: true,
    practice: true,
    test1: false,
    test2: false,
    test3: false,
    answers: false,
  });

  const [options, setOptions] = useState<PrintOptions>({
    includeWorkSpace: true,
    teacherVersion: false,
    fontSize: 'md',
    twoColumnPractice: false,
  });

  // In-page editing state (for Theory, Examples, Practice)
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [activeEditorTarget, setActiveEditorTarget] = useState<ItemEditorType | null>(null);

  // User visibility config for this topic (read from storage)
  const [userVisibility, setUserVisibility] = useState<TopicSectionVisibility>(() =>
    visibilityService.getTopicVisibility(topic.id)
  );
  const [accessMode, setAccessMode] = useState<TopicAccessMode>(() =>
    visibilityService.getTopicAccessMode(topic.id)
  );
  const [requestStatus, setRequestStatus] = useState<{
    submitting: boolean;
    sent: boolean;
    message: string;
  }>({
    submitting: false,
    sent: false,
    message: '',
  });

  useEffect(() => {
    const handleUpdate = () => {
      setUserVisibility(visibilityService.getTopicVisibility(topic.id));
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

  const handleRequestUnlock = () => {
    if (!currentUser) return;
    setRequestStatus({ submitting: true, sent: false, message: '' });

    const result = accessRequestService.submitTopicUnlockRequest({
      user: currentUser,
      topicId: topic.id,
      topicTitle: topic.title,
    });

    setRequestStatus({
      submitting: false,
      sent: result.success,
      message: result.message,
    });
  };

  const isTheoryAllowed = isAdmin || (userVisibility.theory && userPermissionsService.isSectionAllowed(currentUser?.userId, 'theory', isAdmin));
  const isExamplesAllowed = isAdmin || (userVisibility.examples && userPermissionsService.isSectionAllowed(currentUser?.userId, 'examples', isAdmin));
  const isPracticeAllowed = isAdmin || (userVisibility.practice && userPermissionsService.isSectionAllowed(currentUser?.userId, 'practice', isAdmin));
  const isExamsAllowed = isAdmin || userPermissionsService.isSectionAllowed(currentUser?.userId, 'exams', isAdmin);

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

  return (
    <div className="w-full">
      {/* Screen Breadcrumb & Title Bar */}
      <div className="no-print mb-4 pb-3 border-b border-stone-200">
        <div className="text-xs text-stone-500 mb-2">
          <nav className="flex items-center space-x-1.5 font-medium">
            <span className="font-bold text-stone-800">{topic.grade}-р анги</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <span>{topic.category}</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-amber-800 font-bold">{topic.title}</span>
          </nav>
        </div>

        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-black text-stone-950 tracking-tight">
            {topic.title}
          </h1>

          {isAdmin && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200/80 border border-stone-200/80 rounded-lg transition-all cursor-pointer shadow-2xs shrink-0"
              title="Сэдвийн агуулга, онол, дасгал, шалгалтыг засах"
            >
              <Pencil className="w-3.5 h-3.5 text-stone-500" />
              <span>Сэдэв засах</span>
            </button>
          )}
        </div>

        {topic.description && (
          <p className="text-xs md:text-sm text-stone-600 mt-1 max-w-3xl leading-relaxed">
            {topic.description}
          </p>
        )}
      </div>

      {/* ADMIN CONTROLS: Print Selection Control Panel (Admin only) */}
      {isAdmin ? (
        <PrintControlPanel
          selection={selection}
          onChangeSelection={setSelection}
          options={options}
          onChangeOptions={setOptions}
        />
      ) : null}

      {/* MAIN DOCUMENT CANVAS */}
      {!isAdmin && accessMode === 'hidden' ? (
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
      ) : !isAdmin && accessMode === 'locked' ? (
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
              Энэ хичээлийн агуулгыг үзэхийн тулд <strong>багшаар уг хичээлийг нээлгэнэ үү</strong>. Доорх товчийг дарж багшид хичээл нээлгэх хүсэлтээ илгээнэ үү.
            </p>
          </div>

          {/* Feedback or Request Button */}
          {requestStatus.message ? (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 ${
                requestStatus.sent
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                  : 'bg-amber-50 text-amber-900 border border-amber-300'
              }`}
            >
              {requestStatus.sent ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{requestStatus.message}</span>
            </div>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRequestUnlock}
                disabled={requestStatus.submitting}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs md:text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 mx-auto cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {requestStatus.submitting ? 'Илгээж байна...' : 'Багшаар уг хичээлийг нээлгэх хүсэлт илгээх'}
                </span>
              </button>
              <p className="text-[11px] text-stone-400 mt-2">
                Багш хүсэлтийг зөвшөөрснөөр таны дэлгэцэнд хичээлийн онол, дасгалууд шууд нээгдэнэ.
              </p>
            </div>
          )}
        </div>
      ) : (
        <article className="print-container bg-white rounded-xl border border-stone-200 p-6 md:p-10 shadow-xs print:shadow-none print:border-none print:p-0">
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

          {/* 1. Theory */}
          {((isAdmin && selection.theory) || (!isAdmin && isTheoryAllowed)) && (
            <TheorySection
              theory={topic.theory}
              prerequisiteNotice={topic.prerequisiteNotice}
              isEditable={isAdmin && isEditMode}
              onAddRule={handleOpenAddTheory}
              onEditRule={handleOpenEditTheory}
              onDeleteRule={handleDeleteTheory}
            />
          )}

          {/* 2. Worked Examples */}
          {((isAdmin && selection.examples) || (!isAdmin && isExamplesAllowed)) && (
            <WorkedExamplesSection
              examples={topic.examples}
              isEditable={isAdmin && isEditMode}
              onAddExample={handleOpenAddExample}
              onEditExample={handleOpenEditExample}
              onDeleteExample={handleDeleteExample}
            />
          )}

          {/* 3. Practice Exercises */}
          {((isAdmin && selection.practice) || (!isAdmin && isPracticeAllowed)) && (
            <PracticeSection
              practice={topic.practice}
              includeWorkSpace={isAdmin ? options.includeWorkSpace : false}
              teacherVersion={isAdmin ? options.teacherVersion : false}
              isEditable={isAdmin && isEditMode}
              onAddPractice={handleOpenAddPractice}
              onEditPractice={handleOpenEditPractice}
              onDeletePractice={handleDeletePractice}
            />
          )}

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
