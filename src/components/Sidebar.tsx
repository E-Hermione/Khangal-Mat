import React, { useState, useEffect, useMemo } from 'react';
import { GradeNumber, AuthUser } from '../types';
import { GRADES_LIST, GRADE_TOPICS_CATALOG } from '../data/initialData';
import { visibilityService, TopicAccessMode } from '../services/visibilityService';
import { userPermissionsService } from '../services/userPermissionsService';
import { storageService } from '../services/storageService';
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
} from 'lucide-react';

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
  pendingRequestsCount?: number;
  onOpenAccessRequests?: () => void;
  isAdmin: boolean;
  activeView?: 'topics' | 'exams';
  onSelectView?: (view: 'topics' | 'exams') => void;
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
  pendingRequestsCount = 0,
  onOpenAccessRequests,
  isAdmin,
  activeView = 'topics',
  onSelectView,
}) => {
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
    const baseCatalog = GRADE_TOPICS_CATALOG[selectedGrade] || [];
    const savedTopics = storageService.getTopics();

    // Map by id
    const topicMap = new Map<string, { id: string; title: string; category: string; hasFullPackage: boolean }>();

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
          hasFullPackage: true,
        });
      }
    });

    return Array.from(topicMap.values());
  }, [selectedGrade]);

  // Filter topics for regular users based on TopicAccessMode:
  // - Admin sees everything
  // - Regular users: 'hidden' topics are omitted; 'locked' topics are shown (with lock badge); 'visible' are shown
  const displayedTopics = useMemo(() => {
    return allTopicsForGrade.filter((t) => {
      if (isAdmin) return true;
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

    map.forEach((topics, category) => {
      groups.push({ category, topics });
    });

    return groups;
  }, [displayedTopics]);

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
        {/* Primary View Switcher: Lessons vs Exams */}
        {onSelectView && (
          <div className="p-3 pb-0 shrink-0">
            <div className="grid grid-cols-2 gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800">
              <button
                type="button"
                onClick={() => {
                  onSelectView('topics');
                  onCloseMobile();
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  activeView === 'topics'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Хичээлүүд</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectView('exams');
                  onCloseMobile();
                }}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  activeView === 'exams'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Шалгалтууд</span>
              </button>
            </div>
          </div>
        )}

        {/* Grades Selector Tabs */}
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
              const isAllowed = userPermissionsService.isGradeAllowed(currentUser?.userId, grade, isAdmin);
              return (
                <button
                  key={grade}
                  type="button"
                  onClick={() => {
                    if (!isAllowed) {
                      alert(`${grade}-р ангийн хичээлийг үзэх эрх таны бүртгэлд олгогдоогүй байна. Админд хандаж нээлгэнэ үү.`);
                      return;
                    }
                    onSelectGrade(grade);
                    // auto pick first available topic for this grade
                    const topics = GRADE_TOPICS_CATALOG[grade] || [];
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
                      : isAllowed
                      ? 'bg-stone-800/80 text-stone-300 hover:bg-stone-700 hover:text-white'
                      : 'bg-stone-900/60 text-stone-500 opacity-60 border border-stone-800'
                  }`}
                  title={!isAllowed ? `${grade}-р анги (Эрх олгогдоогүй)` : undefined}
                >
                  <span>{grade}-р анги</span>
                  {!isAllowed && <Lock className="w-2.5 h-2.5 inline-block ml-0.5 text-stone-500" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Topics List with Hierarchical Accordion (Агуулгын аймаг -> Дэд сэдэв) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="px-1 mb-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
            {selectedGrade}-р ангийн агуулга
          </div>

          {categoryGroups.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-xs">
              Энэ ангид одоогоор нээлттэй сэдэв алга байна.
            </div>
          ) : (
            <div className="space-y-2">
              {categoryGroups.map((group) => {
                const expanded = isCategoryExpanded(group.category);
                const hasActiveTopic = group.topics.some((t) => t.id === selectedTopicId);

                return (
                  <div
                    key={group.category}
                    className="rounded-xl border border-stone-800/90 bg-stone-950/40 overflow-hidden"
                  >
                    {/* Category (Агуулгын аймаг) Header Button */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(group.category)}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors cursor-pointer select-none ${
                        hasActiveTopic
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

                    {/* Subtopics List (Дэд сэдвүүд) */}
                    {expanded && (
                      <div className="p-1 space-y-0.5 border-t border-stone-800/60 bg-stone-900/60">
                        {group.topics.map((topic) => {
                          const isSelected = topic.id === selectedTopicId;
                          const accessMode = visibilityService.getTopicAccessMode(topic.id);
                          const isLocked = accessMode === 'locked';
                          const isHidden = accessMode === 'hidden';

                          return (
                            <button
                              key={topic.id}
                              type="button"
                              onClick={() => {
                                onSelectTopic(topic.id);
                                onCloseMobile();
                              }}
                              className={`w-full text-left pl-4 pr-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between group cursor-pointer ${
                                isSelected
                                  ? 'bg-stone-800 text-amber-400 border border-stone-700 shadow-xs font-bold'
                                  : 'text-stone-300 hover:bg-stone-800/60 hover:text-white font-medium'
                              }`}
                            >
                              <div className="flex items-center space-x-2 truncate">
                                {isLocked ? (
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

                                {!isAdmin && isLocked && (
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

                                <ChevronRight
                                  className={`w-3 h-3 transition-transform ${
                                    isSelected
                                      ? 'text-amber-400'
                                      : 'text-stone-600 group-hover:text-stone-400'
                                  }`}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Tools & Settings Navigation */}
        <div className="p-3 border-t border-stone-800 space-y-1.5 bg-stone-950/60 shrink-0">
          {/* Admin tools: ONLY shown for admin */}
          {isAdmin && (
            <>
              {/* Нэвтрэх хүсэлтүүд (Админд зориулсан) */}
              {onOpenAccessRequests && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenAccessRequests();
                    onCloseMobile();
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors flex items-center justify-between group cursor-pointer relative"
                  title="Нэвтрэх хүсэлтүүдийг хянах, зөвшөөрөх"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <div className="relative">
                      <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      {pendingRequestsCount > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 bg-red-600 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs animate-pulse ring-1 ring-stone-900">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </div>
                    <span className="truncate">Нэвтрэх хүсэлтүүд</span>
                  </div>
                  {pendingRequestsCount > 0 ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white font-bold rounded-full animate-pulse">
                      {pendingRequestsCount} шинэ
                    </span>
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-300 shrink-0" />
                  )}
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
