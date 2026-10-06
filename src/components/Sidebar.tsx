import React, { useState, useEffect, useMemo } from 'react';
import { GradeNumber, AuthUser } from '../types';
import { GRADES_LIST } from '../data/initialData';
import { visibilityService, TopicAccessMode } from '../services/visibilityService';
import { userPermissionsService } from '../services/userPermissionsService';
import { storageService } from '../services/storageService';
import { newTopic } from '../utils/newTopic';
import { cloud } from '../services/cloud';
import {
  GraduationCap,
  BookOpen,
  FolderKanban,
  Settings,
  ChevronRight,
  ChevronDown,
  Printer,
  Sparkles,
  Layers,
  X,
  Sliders,
  LogOut,
  User,
  UserCheck,
  EyeOff,
  Lock,
  Folder,
  FolderOpen,
  Award,
  CheckCircle2,
  Home,
  Plus,
  Trash2,
  Pencil,
} from 'lucide-react';
import { catalogTopics, deleteTopics, learningPlan, topicMeta, useLearningPlanVersion } from '../services/learningPlan';
import { ProgressRing } from './ProgressRing';
import { ExamFilter, HomePanel } from './SidebarPanels';
import { getFirebaseAuth } from '../services/firebase';

interface SidebarProps {
  selectedGrade: GradeNumber;
  onSelectGrade: (grade: GradeNumber) => void;
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onOpenAdmin: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  currentUser: AuthUser;
  onOpenSettings: () => void;
  onLogout: () => void;
  onOpenAccessRequests?: () => void;
  isAdmin: boolean;
  // Admin mode proper has no "Миний төлөвлөгөө" view (the general view keeps it to show students)
  hidePlanView?: boolean;
  // The admin's student preview: the grade picker stays (real students only see their own grade)
  previewGradePicker?: boolean;
  activeView?: 'home' | 'topics' | 'exams' | 'plan' | 'placement' | 'mistakes';
  onSelectView?: (view: 'home' | 'topics' | 'exams' | 'plan' | 'placement' | 'mistakes') => void;
  // Students get a home tab first
  showHome?: boolean;
  examFilter?: ExamFilter;
  onExamFilter?: (f: ExamFilter) => void;
  onOpenPlan?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedGrade,
  onSelectGrade,
  selectedTopicId,
  onSelectTopic,
  onOpenAdmin,
  mobileOpen,
  onCloseMobile,
  currentUser,
  onOpenSettings,
  onLogout,
  onOpenAccessRequests,
  isAdmin,
  hidePlanView,
  previewGradePicker,
  activeView = 'topics',
  onSelectView,
  showHome = false,
  examFilter = 'all',
  onExamFilter,
  onOpenPlan,
}) => {
  const showLessonNav = !onSelectView || activeView === 'topics';
  const showExamNav = !!onSelectView && (activeView === 'exams' || activeView === 'mistakes');
  // Lessons can be listed by grade (all topics) or as the user's plan (plan topics of every grade)
  const [lessonMode, setLessonMode] = useState<'all' | 'plan'>('all');
  // Everyone gets the two views; without a plan the plan view explains how to get one
  const canPlanView = !!onSelectView && !hidePlanView;
  // The exams page uses the same two views; its choice also filters the exams table
  const examMode: 'all' | 'plan' = examFilter === 'plan' ? 'plan' : 'all';
  const mode = showExamNav ? examMode : lessonMode;
  const setMode = (m: 'all' | 'plan') => (showExamNav ? onExamFilter?.(m) : setLessonMode(m));
  const planMode = (showLessonNav || showExamNav) && canPlanView && mode === 'plan';
  const dataVersion = useLearningPlanVersion();
  const [, setTrigger] = useState(0);

  // Active single expanded category (нэг нь нээлттэй байх үед бусдыг автоматаар хаана)
  const [activeExpandedCategory, setActiveExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => setTrigger((prev) => prev + 1);
    window.addEventListener('visibility-settings-updated', handleUpdate);
    window.addEventListener('user-permissions-updated', handleUpdate);
    return () => {
      window.removeEventListener('visibility-settings-updated', handleUpdate);
      window.removeEventListener('user-permissions-updated', handleUpdate);
    };
  }, []);

  // Get catalog topics + dynamically saved topics that belong or are visible to this grade
  const allTopicsForGrade = useMemo(() => {
    const baseCatalog = catalogTopics(selectedGrade);
    const savedTopics = storageService.getTopics();

    // Map by id
    const topicMap = new Map<
      string,
      { id: string; title: string; category: string; hasFullPackage: boolean; parentId?: string; order?: number }
    >();

    // 1. Add base catalog
    baseCatalog.forEach((item) => {
      topicMap.set(item.id, { ...item });
    });

    // 2. Add saved topics that have this grade either as primary grade or in visibleGrades
    savedTopics.forEach((t) => {
      const isVisibleInGrade =
        t.grade === selectedGrade ||
        (Array.isArray(t.visibleGrades) && t.visibleGrades.includes(selectedGrade));

      if (isVisibleInGrade) {
        topicMap.set(t.id, {
          id: t.id,
          title: t.title,
          category: t.category || 'Ерөнхий сэдэв',
          hasFullPackage: (t.theory?.length || 0) + (t.examples?.length || 0) + (t.practice?.length || 0) > 0,
          parentId: t.parentId,
          order: t.order,
        });
      }
    });

    return Array.from(topicMap.values());
  }, [selectedGrade, dataVersion]);

  // Filter topics for regular users based on TopicAccessMode:
  // - Admin sees everything
  // - Regular users: 'hidden' topics are omitted; 'locked' topics are shown (with lock badge); 'visible' are shown
  const displayedTopics = useMemo(() => {
    return allTopicsForGrade.filter((t) => {
      if (isAdmin) return true;
      if (learningPlan.inPlan(t.id)) return true;
      const mode = visibilityService.getTopicAccessMode(t.id);
      return mode !== 'hidden';
    });
  }, [allTopicsForGrade, isAdmin]);

  // Group topics by category (Агуулгын аймаг)
  const categoryGroups = useMemo(() => {
    const groups: { category: string; topics: typeof displayedTopics }[] = [];
    const map = new Map<string, typeof displayedTopics>();

    displayedTopics.forEach((topic) => {
      const cat = topic.category?.trim() || 'Бусад сэдэв';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(topic);
    });

    // Categories the admin added that have no topics yet
    if (isAdmin) {
      for (const c of cloud.getAppSettings().extraCategories || []) {
        if (c.grade === selectedGrade && !map.has(c.name)) map.set(c.name, []);
      }
    }

    map.forEach((topics, category) => {
      groups.push({ category, topics });
    });

    return groups;
  }, [displayedTopics, isAdmin, selectedGrade, dataVersion]);

  // Admin and general view: add, rename and delete categories
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const setExtraCategories = (fn: (list: { grade: number; name: string }[]) => { grade: number; name: string }[]) =>
    cloud.setAppSettings({ extraCategories: fn(cloud.getAppSettings().extraCategories || []) });
  const addCategory = () => {
    const name = categoryName.trim();
    if (!name) return;
    setExtraCategories((list) => [...list.filter((c) => !(c.grade === selectedGrade && c.name === name)), { grade: selectedGrade, name }]);
    setAddingCategory(false);
    setActiveExpandedCategory(name);
  };
  const renameCategory = (oldName: string) => {
    const name = categoryName.trim();
    setRenamingCategory(null);
    if (!name || name === oldName) return;
    for (const t of allTopicsForGrade.filter((x) => x.category === oldName)) {
      const saved = storageService.getTopicById(t.id);
      // Built-in topics are saved (still empty) so they keep the new category
      storageService.saveTopic(
        saved ? { ...saved, category: name } : newTopic({ id: t.id, grade: selectedGrade, category: name, title: t.title })
      );
    }
    setExtraCategories((list) => list.map((c) => (c.grade === selectedGrade && c.name === oldName ? { ...c, name } : c)));
    setActiveExpandedCategory(name);
  };
  const deleteCategory = (name: string) => {
    deleteTopics(allTopicsForGrade.filter((t) => t.category === name).map((t) => t.id));
    setExtraCategories((list) => list.filter((c) => !(c.grade === selectedGrade && c.name === name)));
    setConfirmDeleteCategory(null);
  };
  const categoryInput = (onSave: () => void, onCancel: () => void, placeholder: string) => (
    <div className="flex items-center gap-1 px-2 py-1.5" data-testid="category-form">
      <input
        autoFocus
        value={categoryName}
        onChange={(e) => setCategoryName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-2 py-1 rounded-md bg-stone-950 border border-stone-700 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
      />
      <button type="button" onClick={onSave} className="px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-bold cursor-pointer">
        Хадгалах
      </button>
      <button type="button" onClick={onCancel} className="p-1 text-stone-500 hover:text-white cursor-pointer" aria-label="Болих">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // Topics with subtopics that are open in the list (the selected subtopic's topic opens itself)
  const [openParents, setOpenParents] = useState<Set<string>>(new Set());
  const toggleParent = (id: string) =>
    setOpenParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  useEffect(() => {
    const parentId = allTopicsForGrade.find((t) => t.id === selectedTopicId)?.parentId;
    if (parentId) setOpenParents((prev) => (prev.has(parentId) ? prev : new Set(prev).add(parentId)));
  }, [selectedTopicId, allTopicsForGrade]);

  // Admin and general view: add a topic to a category, or a subtopic under a topic, or delete one
  const canAddTopics = isAdmin;
  // Topic waiting for the "delete?" confirmation in its row
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const removeTopic = (id: string) => {
    const children = allTopicsForGrade.filter((t) => t.parentId === id).map((t) => t.id);
    deleteTopics([id, ...children]);
    setConfirmDelete(null);
    if (selectedTopicId === id || children.includes(selectedTopicId)) {
      const next = allTopicsForGrade.find((t) => t.id !== id && !children.includes(t.id));
      if (next) onSelectTopic(next.id);
    }
  };
  const renderRowTools = (topicId: string, withAdd: boolean, category: string) =>
    confirmDelete === topicId ? (
      <div className="flex items-center gap-1 shrink-0 pl-1" data-testid="confirm-delete">
        <span className="text-[10px] font-bold text-rose-300">Устгах уу?</span>
        <button
          type="button"
          onClick={() => removeTopic(topicId)}
          className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
        >
          Тийм
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(null)}
          className="px-1.5 py-0.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-200 text-[10px] font-bold cursor-pointer"
        >
          Үгүй
        </button>
      </div>
    ) : (
      <div className="flex items-center shrink-0">
        {withAdd && (
          <button
            type="button"
            onClick={() => startAdding(category, topicId)}
            className="p-1 rounded text-stone-500 hover:text-amber-400 hover:bg-stone-800 cursor-pointer"
            title="Дэд сэдэв нэмэх"
            data-testid={`add-subtopic-${topicId}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setConfirmDelete(topicId)}
          className="p-1 rounded text-stone-600 hover:text-rose-400 hover:bg-stone-800 cursor-pointer"
          title="Сэдэв устгах"
          data-testid={`delete-topic-${topicId}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  const [adding, setAdding] = useState<{ category: string; parentId?: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const startAdding = (category: string, parentId?: string) => {
    setAdding({ category, parentId });
    setNewTitle('');
    if (parentId) setOpenParents((prev) => new Set(prev).add(parentId));
  };
  const saveNewTopic = () => {
    const title = newTitle.trim();
    if (!adding || !title) return;
    const siblings = allTopicsForGrade.filter((t) => t.category === adding.category && t.parentId === adding.parentId);
    const parent = adding.parentId ? storageService.getTopicById(adding.parentId) : undefined;
    const topic = newTopic({
      grade: selectedGrade,
      category: adding.category,
      title,
      parentId: adding.parentId,
      order: siblings.length + 1,
      visibleGrades: parent?.visibleGrades,
    });
    storageService.saveTopic(topic);
    setAdding(null);
    onSelectTopic(topic.id);
  };
  const renderAddForm = (placeholder: string) => (
    <div className={`flex items-center gap-1 ${adding?.parentId ? 'pl-7' : 'pl-3'} pr-1 py-1`} data-testid="add-topic-form">
      <input
        autoFocus
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') saveNewTopic();
          if (e.key === 'Escape') setAdding(null);
        }}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-2 py-1 rounded-md bg-stone-950 border border-stone-700 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
      />
      <button
        type="button"
        onClick={saveNewTopic}
        className="px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-bold cursor-pointer"
      >
        Нэмэх
      </button>
      <button type="button" onClick={() => setAdding(null)} className="p-1 text-stone-500 hover:text-white cursor-pointer" aria-label="Болих">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // Auto-expand only the category that contains the currently selected topic, automatically closing others
  useEffect(() => {
    if (selectedTopicId) {
      const found = displayedTopics.find((t) => t.id === selectedTopicId);
      if (found) {
        const cat = found.category?.trim() || 'Бусад сэдэв';
        setActiveExpandedCategory(cat);
        return;
      }
    }
    if (categoryGroups.length > 0 && !activeExpandedCategory) {
      setActiveExpandedCategory(categoryGroups[0].category);
    }
  }, [selectedTopicId, displayedTopics]);

  const toggleCategory = (category: string) => {
    // When one category is clicked, toggle it, closing all others automatically
    setActiveExpandedCategory((prev) => (prev === category ? null : category));
  };

  const isCategoryExpanded = (category: string) => {
    return activeExpandedCategory === category;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 top-14 bg-stone-950/40 backdrop-blur-xs z-30 lg:hidden modal-backdrop"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-14 bottom-0 left-0 z-30 w-72 bg-stone-900 text-stone-100 flex flex-col border-r border-stone-800 transition-transform duration-200 ease-in-out lg:sticky lg:top-14 lg:self-start lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 lg:shrink-0 no-print ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Primary view switcher: icon tiles */}
        {onSelectView && (
          <div className="p-3 pb-0 shrink-0">
            <div
              className={`grid ${showHome ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 bg-stone-950/80 p-1.5 rounded-2xl border border-stone-800`}
              data-testid="view-tabs"
            >
              {(
                [
                  ...(showHome
                    ? [{ key: 'home', label: 'Нүүр\nхуудас', icon: Home, active: activeView === 'home' || activeView === 'plan' || activeView === 'placement' }]
                    : []),
                  { key: 'topics', label: 'Хичээл\nүзэх', icon: BookOpen, active: activeView === 'topics' },
                  { key: 'exams', label: 'Сэдэвчилсэн\nсорил', icon: Award, active: activeView === 'exams' || activeView === 'mistakes' },
                ] as const
              ).map(({ key, label, icon: Icon, active }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onSelectView(key);
                    onCloseMobile();
                  }}
                  className={`h-[60px] px-1 pt-2.5 rounded-xl flex flex-col items-center justify-start gap-1 transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800/80'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className={`w-[18px] h-[18px] ${active ? 'text-stone-900' : ''}`} />
                  <span className="text-[10.5px] font-bold leading-tight text-center whitespace-pre-line">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Lessons: grades + topics. Exams: grades + filters and results. Home: progress and news */}
        {showLessonNav || showExamNav ? (
          <>
        {/* Grades Selector Tabs (a student only sees their own grade, so they get none) */}
        {(isAdmin || previewGradePicker || !learningPlan.state.grade) && (
        <div className="p-3 border-b border-stone-800/80 bg-stone-950/40 shrink-0">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Анги сонгох
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 lg:hidden cursor-pointer"
              aria-label="Хаах"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {GRADES_LIST.map((grade) => {
              const isSelected = grade === selectedGrade;
              // A user works in their own grade only; the other grades stay greyed out
              const ownGrade = isAdmin || previewGradePicker ? null : learningPlan.state.grade;
              const notOwn = !!ownGrade && grade !== ownGrade;
              // Plan topics can be in any grade; each topic is gated on its own
              const isAllowed =
                !notOwn &&
                ((!isAdmin && learningPlan.isGated()) ||
                  userPermissionsService.isGradeAllowed(currentUser?.userId, grade, isAdmin));
              return (
                <button
                  key={grade}
                  type="button"
                  disabled={notOwn}
                  onClick={() => {
                    if (!isAllowed) {
                      alert(`${grade}-р ангийн хичээлийг үзэх эрх таны бүртгэлд олгогдоогүй байна. Админд хандаж нээлгэнэ үү.`);
                      return;
                    }
                    onSelectGrade(grade);
                    // auto pick first available topic for this grade
                    const topics = catalogTopics(grade);
                    const firstAvailable = isAdmin
                      ? topics[0]
                      : topics.find((t) => visibilityService.getTopicAccessMode(t.id) !== 'hidden');
                    if (firstAvailable) {
                      onSelectTopic(firstAvailable.id);
                    }
                  }}
                  className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all text-center cursor-pointer relative ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 shadow-xs scale-102'
                      : notOwn
                      ? 'bg-stone-800/40 text-stone-600 opacity-50 !cursor-default'
                      : isAllowed
                      ? 'bg-stone-800/80 text-stone-300 hover:bg-stone-700 hover:text-white'
                      : 'bg-stone-900/60 text-stone-500 opacity-60 border border-stone-800'
                  }`}
                  title={notOwn ? 'Зөвхөн өөрийн ангийн хичээлийг үзнэ' : !isAllowed ? `${grade}-р анги (Эрх олгогдоогүй)` : undefined}
                >
                  <span>{grade}-р анги</span>
                  {!isAllowed && !notOwn && <Lock className="w-2.5 h-2.5 inline-block ml-0.5 text-stone-500" />}
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* Grade's content: all topics / tests, or the user's plan topics as a flat list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="px-1 mb-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            {selectedGrade}-р ангийн {showExamNav ? 'сорил' : 'агуулга'}
          </div>
        {canPlanView && (
          <div>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-stone-950 border border-stone-800 mb-1" data-testid="lesson-mode">
              {(
                [
                  ['all', showExamNav ? 'Бүх сорил' : 'Бүх сэдэв'],
                  ['plan', 'Миний төлөвлөгөө'],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    mode === m ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Students: wrong answers on topic tests, to solve again */}
        {showExamNav && !isAdmin && learningPlan.state.uid && (
          <button
            type="button"
            onClick={() => {
              onSelectView?.(activeView === 'mistakes' ? 'exams' : 'mistakes');
              onCloseMobile();
            }}
            className={`w-full px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-between cursor-pointer ${
              activeView === 'mistakes'
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                : 'bg-stone-950/40 border-stone-800 text-stone-300 hover:bg-stone-800/60'
            }`}
            data-testid="open-mistakes"
          >
            <span>Алдсан бодлогууд</span>
            <span className="px-1.5 rounded-full bg-rose-500 text-white text-[10px]">{learningPlan.mistakes().length}</span>
          </button>
        )}


          {planMode ? (
            <div className="space-y-1" data-testid="plan-topic-list">
              {learningPlan.plan().length === 0 && (
                <div className="rounded-xl border border-stone-800 bg-stone-950/40 p-3 text-xs text-stone-400 leading-relaxed">
                  {isAdmin
                    ? 'Хэрэглэгч бүрд түвшин тогтоох сорилын дүнгээр гарсан өөрийн төлөвлөгөөний сэдвүүд энд харагдана.'
                    : learningPlan.hasPlan()
                    ? 'Таны төлөвлөгөөнд сэдэв алга.'
                    : 'Түвшин тогтоох сорил өгсний дараа танд зориулсан сэдвүүд энд гарна.'}
                  {!isAdmin && !learningPlan.hasPlan() && onOpenPlan && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenPlan();
                        onCloseMobile();
                      }}
                      className="mt-2 w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold cursor-pointer"
                    >
                      Сорил өгөх
                    </button>
                  )}
                </div>
              )}
              {learningPlan.plan().map((p) => {
                const meta = topicMeta(p.topicId);
                const isSelected = p.topicId === selectedTopicId;
                const open = learningPlan.topicGate(p.topicId) === 'open';
                return (
                  <button
                    key={p.topicId}
                    type="button"
                    onClick={() => {
                      onSelectGrade(meta.grade);
                      onSelectTopic(p.topicId);
                      onCloseMobile();
                    }}
                    className={`w-full text-left pl-3 pr-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-stone-800 text-amber-400 border border-stone-700 font-bold'
                        : 'text-stone-300 hover:bg-stone-800/60 hover:text-white font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {learningPlan.isDone(p.topicId) ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : !open ? (
                        <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-amber-400' : 'bg-stone-400'}`} />
                      )}
                      <span className="truncate">{meta.title}</span>
                    </span>
                    <ProgressRing percent={learningPlan.progress(p.topicId)} size={16} />
                  </button>
                );
              })}
            </div>
          ) : showExamNav ? null : (
          <>

          {canAddTopics &&
            (addingCategory ? (
              <div className="rounded-xl border border-stone-800/90 bg-stone-950/40 mb-2">
                {categoryInput(addCategory, () => setAddingCategory(false), 'Шинэ бүлгийн нэр')}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCategoryName('');
                  setAddingCategory(true);
                }}
                className="w-full mb-2 px-3 py-2 rounded-xl border border-dashed border-stone-700 text-[11px] font-bold text-stone-400 hover:text-amber-400 hover:border-amber-500/60 flex items-center gap-1.5 cursor-pointer"
                data-testid="add-category"
              >
                <Plus className="w-3.5 h-3.5" /> Бүлэг нэмэх
              </button>
            ))}
          {categoryGroups.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-xs">
              Энэ ангид одоогоор нээлттэй сэдэв алга байна.
            </div>
          ) : (
            <div className="space-y-2">
              {categoryGroups.map((group) => {
                const expanded = isCategoryExpanded(group.category);

                return (
                  <div
                    key={group.category}
                    className="rounded-xl border border-stone-800/90 bg-stone-950/40 overflow-hidden"
                  >
                    {/* Category (Агуулгын аймаг) Header Button, with "+" to add a topic in it */}
                    {renamingCategory === group.category ? (
                      categoryInput(() => renameCategory(group.category), () => setRenamingCategory(null), 'Бүлгийн нэр')
                    ) : confirmDeleteCategory === group.category ? (
                      <div className="px-3 py-2 flex items-center gap-1.5 bg-rose-950/40" data-testid="confirm-delete-category">
                        <span className="flex-1 text-[11px] font-bold text-rose-200">
                          «{group.category}» бүлгийг {group.topics.length} сэдэвтэй нь устгах уу?
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteCategory(group.category)}
                          className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Тийм
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCategory(null)}
                          className="px-1.5 py-0.5 rounded bg-stone-700 hover:bg-stone-600 text-stone-200 text-[10px] font-bold cursor-pointer"
                        >
                          Үгүй
                        </button>
                      </div>
                    ) : (
                    <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => toggleCategory(group.category)}
                      className={`flex-1 min-w-0 px-3 py-2 text-left flex items-center justify-between transition-colors cursor-pointer select-none ${
                        // Only the open category is highlighted; opening another switches the highlight
                        expanded
                          ? 'bg-stone-800/90 text-amber-300 font-bold'
                          : 'hover:bg-stone-800/60 text-stone-300 font-semibold'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        {expanded ? (
                          <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        )}
                        <span className="text-xs truncate tracking-tight">{group.category}</span>
                      </div>

                      <div className="flex items-center shrink-0 ml-1">
                        {expanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
                        )}
                      </div>
                    </button>
                    {canAddTopics && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!expanded) toggleCategory(group.category);
                          startAdding(group.category);
                        }}
                        className={`px-2.5 flex items-center text-stone-400 hover:text-amber-400 cursor-pointer ${
                          expanded ? 'bg-stone-800/90' : 'hover:bg-stone-800/60'
                        }`}
                        title="Энэ бүлэгт сэдэв нэмэх"
                        data-testid={`add-topic-${group.category}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                    {canAddTopics && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryName(group.category);
                            setRenamingCategory(group.category);
                          }}
                          className={`px-1.5 flex items-center text-stone-500 hover:text-amber-400 cursor-pointer ${expanded ? 'bg-stone-800/90' : ''}`}
                          title="Бүлгийн нэр өөрчлөх"
                          data-testid={`rename-category-${group.category}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCategory(group.category)}
                          className={`pl-1.5 pr-2.5 flex items-center text-stone-600 hover:text-rose-400 cursor-pointer ${expanded ? 'bg-stone-800/90' : ''}`}
                          title="Бүлэг устгах"
                          data-testid={`delete-category-${group.category}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    </div>
                    )}

                    {/* Subtopics List (Дэд сэдвүүд) */}
                    {expanded && (
                      <div className="p-1 space-y-0.5 border-t border-stone-800/60 bg-stone-900/60">
                        {(() => {
                          // One topic row; `sub` rows are subtopics, indented under their topic
                          const renderTopic = (topic: (typeof group.topics)[number], sub: boolean) => {
                            const kids = group.topics
                              .filter((t) => t.parentId === topic.id)
                              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                          const isSelected = topic.id === selectedTopicId;
                          const accessMode = visibilityService.getTopicAccessMode(topic.id);
                          // Students with a plan: locked unless it is a paid plan topic; ticked once done
                          const planGate = isAdmin ? null : learningPlan.topicGate(topic.id);
                          const isDone = planGate !== null && learningPlan.inPlan(topic.id) && learningPlan.isDone(topic.id);
                          const isLocked = planGate ? planGate !== 'open' : accessMode === 'locked';
                          const isHidden = accessMode === 'hidden';

                          return (
                            <button
                              key={topic.id}
                              type="button"
                              onClick={() => {
                                // A topic with subtopics opens and closes its list
                                if (kids.length > 0) {
                                  toggleParent(topic.id);
                                  return;
                                }
                                onSelectTopic(topic.id);
                                onCloseMobile();
                              }}
                              className={`w-full text-left ${sub ? 'pl-8' : 'pl-4'} pr-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between group cursor-pointer ${
                                isSelected
                                  ? 'bg-stone-800 text-amber-400 border border-stone-700 shadow-xs font-bold'
                                  : 'text-stone-300 hover:bg-stone-800/60 hover:text-white font-medium'
                              }`}
                            >
                              <div className="flex items-center space-x-2 truncate">
                                {isDone ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                ) : isLocked ? (
                                  <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                                ) : (
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      isSelected
                                        ? 'bg-amber-400'
                                        : topic.hasFullPackage
                                        ? 'bg-stone-400'
                                        : 'bg-stone-600'
                                    }`}
                                  />
                                )}
                                <span className="truncate">{topic.title}</span>
                              </div>

                              <div className="flex items-center space-x-1 shrink-0 ml-1">
                                {learningPlan.isFree(topic.id) && (
                                  <span
                                    className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold"
                                    title="Бүх хүнд үнэгүй нээлттэй жишээ хичээл"
                                  >
                                    Үнэгүй
                                  </span>
                                )}
                                {isAdmin && isHidden && (
                                  <span
                                    className="text-[9px] px-1 py-0.2 bg-red-500/20 text-red-300 border border-red-500/30 rounded flex items-center space-x-0.5"
                                    title="Сурагчдад бүрэн нууцлагдсан"
                                  >
                                    <EyeOff className="w-2.5 h-2.5" />
                                    <span>Нууц</span>
                                  </span>
                                )}

                                {isAdmin && isLocked && (
                                  <span
                                    className="text-[9px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded flex items-center space-x-0.5"
                                    title="Сурагч нээлгэх хүсэлт гаргах горимд түгжигдсэн"
                                  >
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Түгжээтэй</span>
                                  </span>
                                )}

                                {!isAdmin && isLocked && !planGate && (
                                  <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded flex items-center space-x-0.5">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Хүсэлт</span>
                                  </span>
                                )}

                                {topic.hasFullPackage && !isHidden && !isLocked && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/10 text-amber-300/80 rounded">
                                    Бэлэн
                                  </span>
                                )}

                                {/* Progress, or the arrow of a topic with subtopics */}
                                {kids.length > 0 ? (
                                  openParents.has(topic.id) ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-stone-500" />
                                  )
                                ) : (
                                  planGate &&
                                  learningPlan.inPlan(topic.id) && <ProgressRing percent={learningPlan.progress(topic.id)} size={16} />
                                )}
                              </div>
                            </button>
                          );
                          };
                          const topLevel = group.topics.filter(
                            (t) => !t.parentId || !group.topics.some((x) => x.id === t.parentId)
                          );
                          return (
                            <>
                              {topLevel.map((topic) => {
                                const kids = group.topics
                                  .filter((t) => t.parentId === topic.id)
                                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                                return (
                                  <div key={topic.id} className="space-y-0.5">
                                    <div className="flex items-center gap-0.5 group/row">
                                      <div className="flex-1 min-w-0">{renderTopic(topic, false)}</div>
                                      {canAddTopics && renderRowTools(topic.id, true, group.category)}
                                    </div>
                                    {kids.length > 0 &&
                                      openParents.has(topic.id) &&
                                      kids.map((k) => (
                                        <div key={k.id} className="flex items-center gap-0.5">
                                          <div className="flex-1 min-w-0">{renderTopic(k, true)}</div>
                                          {canAddTopics && renderRowTools(k.id, false, group.category)}
                                        </div>
                                      ))}
                                    {adding && adding.parentId === topic.id && renderAddForm('Дэд сэдвийн нэр')}
                                  </div>
                                );
                              })}
                              {canAddTopics &&
                                (adding && adding.category === group.category && !adding.parentId ? (
                                  renderAddForm('Сэдвийн нэр')
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => startAdding(group.category)}
                                    className="w-full text-left pl-4 pr-2.5 py-1.5 rounded-lg text-[11px] font-bold text-stone-500 hover:text-amber-400 hover:bg-stone-800/60 flex items-center gap-1.5 cursor-pointer"
                                    data-testid="add-topic"
                                  >
                                    <Plus className="w-3 h-3" /> Сэдэв нэмэх
                                  </button>
                                ))}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          </>
          )}
        </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <HomePanel
              uid={getFirebaseAuth().currentUser?.uid}
              userId={currentUser?.userId}
              isAdmin={isAdmin}
              onOpenPlan={() => onOpenPlan?.()}
              onOpenAccessRequests={onOpenAccessRequests}
            />
          </div>
        )}

        {/* Quick Tools & Settings Navigation */}
        <div className="p-3 border-t border-stone-800 space-y-1.5 bg-stone-950/60 shrink-0">
          {/* Admin tools: ONLY shown for admin */}
          {isAdmin && (
            <>
              {/* User management (admin) */}
              {onOpenAccessRequests && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenAccessRequests();
                    onCloseMobile();
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors flex items-center justify-between group cursor-pointer"
                  title="Хэрэглэгч хайх, эрх оноох, төлбөр, зарлал"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">Хэрэглэгч ба эрх</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-300 shrink-0" />
                </button>
              )}
            </>
          )}

          {/* Тохиргоо (Settings) - Available to all users */}
          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className="w-full py-2 px-3 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center space-x-2.5 truncate">
              <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Тохиргоо</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-300 shrink-0" />
          </button>

          {/* User Profile Info & Logout */}
          <div className="pt-2 border-t border-stone-800/80 mt-2">
            <div className="flex items-center justify-between p-2 rounded-xl bg-stone-900/90 border border-stone-800">
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs ring-1 ring-white/10">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-stone-200 truncate">
                    {currentUser.name}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0 ml-1.5"
                title="Системээс гарах"
                aria-label="Системээс гарах"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
