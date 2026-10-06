import React, { useState, useEffect, useMemo } from 'react';
import { GradeNumber, TopicPackage } from './types';
import { storageService } from './services/storageService';
import { GRADE_TOPICS_CATALOG } from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { TopicPage } from './components/TopicPage';
import { AdminEditorModal } from './components/AdminEditorModal';
import { AccessRequestsModal } from './components/AccessRequestsModal';
import { LoginView } from './components/LoginView';
import { VerifyEmailView } from './components/VerifyEmailView';
import { ScreenProtection } from './components/ScreenProtection';
import { AnnouncementsBell } from './components/AnnouncementsBell';
import { CopyProtection } from './components/CopyProtection';
import { SettingsModal } from './components/SettingsModal';
import { ExamsHub } from './components/ExamsHub';
import { MistakesView } from './components/MistakesView';
import { usePrintSelection } from './services/printSelection';
import { PlacementTestView } from './components/PlacementTestView';
import { LearningPlanView } from './components/LearningPlanView';
import { StudentHome } from './components/StudentHome';
import type { ExamFilter } from './components/SidebarPanels';
import { catalogTopics, learningPlan, startLearningPlan, stopLearningPlan, topicMeta, useLearningPlanVersion } from './services/learningPlan';
import { AuthUser } from './types';
import { clearStoredAuth, saveStoredAuth } from './utils/deviceManager';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from './services/firebase';
import { loadSession, signOutUser, isRegistering, isGeneralLogin } from './services/authService';
import { startCloudSync, stopCloudSync, cloud } from './services/cloud';
import { seedCloudFromLegacyData } from './services/migration';
import {
  registerCurrentDevice,
  enforceDeviceLimit,
  watchCurrentDevice,
  forgetCurrentDevice,
  stopDeviceWatch,
  MAX_DEVICES_ADMIN,
  MAX_DEVICES_USER,
} from './services/deviceSessions';
import { userPermissionsService } from './services/userPermissionsService';
import {
  Menu,
  Printer,
  Settings,
  Sparkles,
  ChevronDown,
  FileDown,
  LogOut,
  X,
  Shield,
  UserCheck,
  UserX,
  Presentation,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [previewAsUser, setPreviewAsUser] = useState<false | 'paid' | 'unpaid'>(false);
  // General view: the admin's rights without the editing buttons (signing in as "Ерөнхий" locks it on)
  const [generalView, setGeneralView] = useState<boolean>(() => isGeneralLogin());
  const generalLocked = generalView && isGeneralLogin();
  const [activeView, setActiveView] = useState<'home' | 'topics' | 'exams' | 'plan' | 'placement' | 'mistakes'>('topics');
  useLearningPlanVersion();
  const [topics, setTopics] = useState<TopicPackage[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<GradeNumber>(6);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('g6-divisibility');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [accessRequestsModalOpen, setAccessRequestsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  // Site-wide switches stored in Firestore (settings/app), so they apply to every user
  const [appSettings, setAppSettings] = useState(() => cloud.getAppSettings());
  useEffect(() => {
    const refresh = () => setAppSettings(cloud.getAppSettings());
    window.addEventListener('app-settings-updated', refresh);
    return () => window.removeEventListener('app-settings-updated', refresh);
  }, []);
  const screenProtectionEnabled = appSettings.screenProtection;
  const handleToggleScreenProtection = (enabled: boolean) => cloud.setAppSettings({ screenProtection: enabled });
  const handleToggleDeviceLimit = (enabled: boolean) => cloud.setAppSettings({ deviceLimit: enabled });
  const handleToggleCopyProtection = (enabled: boolean) => cloud.setAppSettings({ copyProtection: enabled });

  // Re-render when the admin changes this user's permissions (e.g. the access period)
  const [, setPermsVersion] = useState(0);
  useEffect(() => {
    const bump = () => setPermsVersion((v) => v + 1);
    window.addEventListener('user-permissions-updated', bump);
    return () => window.removeEventListener('user-permissions-updated', bump);
  }, []);

  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [printSelection, setPrintSelection] = usePrintSelection();
  const printMenuRef = React.useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    clearStoredAuth();
    const uid = getFirebaseAuth().currentUser?.uid;
    if (uid) await forgetCurrentDevice(uid);
    signOutUser().catch((err) => console.error('Sign out failed', err));
  };

  // Turns a Firebase sign-in into the app's user and loads the data they may see
  const openSession = React.useCallback(async (fbUser: User) => {
    try {
      const session = await loadSession(fbUser);
      setUnverifiedEmail(session.status === 'unverified' ? session.email : null);
      if (session.status === 'unverified') {
        setCurrentUser(null);
        return;
      }
      if (session.status === 'incomplete') {
        setLoginNotice('Бүртгэл дуусаагүй байна. «Шинээр бүртгүүлэх» хэсгээр ижил имэйл, нууц үгээр дахин бүртгүүлнэ үү.');
        await signOutUser();
        return;
      }
      if (session.status === 'blocked') {
        setLoginNotice('Таны бүртгэл хаагдсан байна. Админд хандана уу.');
        await signOutUser();
        return;
      }

      // Load data first: the site-wide settings decide whether the device limit applies
      await startCloudSync({ isAdmin: session.isAdmin, userId: session.user.userId, grade: session.profile?.grades?.[0] ?? null });
      // Users follow placement tests and a personal learning plan; everyone starts on the home page
      if (!session.isAdmin) {
        startLearningPlan(fbUser.uid, session.user.userId!, session.profile?.grades?.[0] ?? null);
        // Start in the user's own grade
        const ownGrade = session.profile?.grades?.[0];
        if (ownGrade) {
          setSelectedGrade(ownGrade);
          const first = catalogTopics(ownGrade)[0];
          if (first) setSelectedTopicId(first.id);
        }
      } else {
        stopLearningPlan();
      }
      setActiveView('home');

      // Device tracking must never block sign-in (e.g. before the rules are deployed)
      const device = await registerCurrentDevice(fbUser.uid).catch((err) => {
        console.error('Device registration failed', err);
        return 'error' as const;
      });
      if (device === 'revoked') {
        setLoginNotice('Энэ төхөөрөмжийг таны бүртгэлээс гаргасан байна. Дахин нэвтэрнэ үү.');
        await signOutUser();
        return;
      }
      if (device === 'ok') {
        // Sign out the earliest devices beyond the limit, possibly this one
        const limit = session.isAdmin ? MAX_DEVICES_ADMIN : MAX_DEVICES_USER;
        const thisDeviceRemoved = cloud.getAppSettings().deviceLimit
          ? await enforceDeviceLimit(fbUser.uid, limit).catch((err) => {
              console.error('Device limit check failed', err);
              return false;
            })
          : false;
        if (thisDeviceRemoved) {
          setLoginNotice('Таны бүртгэлээр өөр төхөөрөмжөөс нэвтэрсэн тул энэ төхөөрөмжөөс гарлаа.');
          await signOutUser();
          return;
        }
        watchCurrentDevice(fbUser.uid, async () => {
          setLoginNotice('Таны бүртгэлээр өөр төхөөрөмжөөс нэвтэрсэн тул энэ төхөөрөмжөөс гарлаа.');
          clearStoredAuth();
          // Clear the revoked record so signing in again on this device works
          await forgetCurrentDevice(fbUser.uid);
          signOutUser().catch(() => {});
        });
      }

      if (session.isAdmin) await seedCloudFromLegacyData();

      setTopics(storageService.getTopics());
      saveStoredAuth(session.user);
      setLoginNotice(null);
      setCurrentUser(session.user);
      setGeneralView(session.isAdmin && isGeneralLogin());
      setPreviewAsUser(false);
    } catch (err) {
      console.error('Failed to open session', err);
      setLoginNotice('Мэдээлэл ачаалж чадсангүй. Интернэт холболтоо шалгаад дахин нэвтэрнэ үү.');
      await signOutUser().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), async (fbUser) => {
      if (isRegistering()) return; // RegisterModal calls reloadSession when done
      if (fbUser) {
        await openSession(fbUser);
      } else {
        stopCloudSync();
        stopDeviceWatch();
        stopLearningPlan();
        setUnverifiedEmail(null);
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
  }, [openSession]);

  const hasPlan = learningPlan.hasPlan();
  // The admin's "view as user" mode shows the student pages, using the admin's own (test) data
  const isAdminPreview = currentUser?.role === 'admin' && previewAsUser;
  // Grade of the "paid" preview; the admin changes it next to the view switcher (kept on this device)
  const [paidPreviewGrade, setPaidPreviewGrade] = useState<GradeNumber>(() => {
    try {
      const g = Number(localStorage.getItem('matmate-paid-preview-grade'));
      return (g >= 6 && g <= 12 ? g : 10) as GradeNumber;
    } catch {
      return 10;
    }
  });
  const changePaidPreviewGrade = (g: GradeNumber) => {
    setPaidPreviewGrade(g);
    try {
      localStorage.setItem('matmate-paid-preview-grade', String(g));
    } catch {
      // storage blocked: the choice lasts until the page reloads
    }
  };
  useEffect(() => {
    if (currentUser?.role !== 'admin') return;
    const uid = getFirebaseAuth().currentUser?.uid;
    if (previewAsUser && uid) {
      // Previewed as a student: paid in the grade the admin set (10th by default), unpaid in 9th
      const previewGrade: GradeNumber = previewAsUser === 'paid' ? paidPreviewGrade : 9;
      startLearningPlan(uid, currentUser.userId || 'ADMIN-01', previewGrade, previewAsUser === 'paid');
      setSelectedGrade(previewGrade);
      const first = catalogTopics(previewGrade)[0];
      if (first) setSelectedTopicId(first.id);
      setActiveView('home');
    } else {
      stopLearningPlan();
      setActiveView((v) => (v === 'plan' || v === 'placement' || v === 'mistakes' ? 'home' : v));
    }
  }, [previewAsUser, paidPreviewGrade, currentUser?.role]);
  const isStudent = (currentUser?.role !== 'admin' || isAdminPreview) && !!learningPlan.state.uid;
  // Admin mode proper: content and home texts can be edited
  const canEdit = currentUser?.role === 'admin' && !previewAsUser && !generalView;
  // The grade whose placement test the student is taking
  const [placementGrade, setPlacementGrade] = useState<GradeNumber>(6);
  // Exams page filter, chosen in the sidebar
  const [examFilter, setExamFilter] = useState<ExamFilter>('all');
  // Right after finishing a placement test, show the plan it produced
  // (a new or a retaken test both change the latest result time)
  const latestPlacement = learningPlan.state.results
    ? Math.max(0, ...learningPlan.state.results.map((r) => r.takenAt))
    : undefined;
  const prevLatestPlacement = React.useRef<number | undefined>(undefined);
  useEffect(() => {
    if (latestPlacement !== undefined && prevLatestPlacement.current !== undefined && latestPlacement > prevLatestPlacement.current) {
      setActiveView('plan');
    }
    prevLatestPlacement.current = latestPlacement;
  }, [latestPlacement]);

  // Opens a topic from the plan in its grade
  const openPlanTopic = (topicId: string, view: 'topics' | 'exams') => {
    setSelectedGrade(topicMeta(topicId).grade);
    setSelectedTopicId(topicId);
    setActiveView(view);
  };

  const reloadSession = () => {
    const fbUser = getFirebaseAuth().currentUser;
    if (fbUser) openSession(fbUser);
  };

  // Close print menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (printMenuRef.current && !printMenuRef.current.contains(event.target as Node)) {
        setPrintMenuOpen(false);
      }
    };
    if (printMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [printMenuOpen]);

  // Keep topics in sync with Firestore (edits here or on other devices)
  useEffect(() => {
    const refresh = () => setTopics(storageService.getTopics());
    window.addEventListener('topics-updated', refresh);
    return () => window.removeEventListener('topics-updated', refresh);
  }, []);

  const refreshTopics = () => {
    const loaded = storageService.getTopics();
    setTopics(loaded);
  };

  // A deleted topic is never shown: if the open topic was deleted, open the grade's first topic
  useEffect(() => {
    const removed = appSettings.removedTopicIds || [];
    if (!removed.includes(selectedTopicId) || topics.some((t) => t.id === selectedTopicId)) return;
    const first = topics.find((t) => t.grade === selectedGrade) || catalogTopics(selectedGrade)[0];
    if (first) setSelectedTopicId(first.id);
  }, [appSettings, topics, selectedTopicId, selectedGrade]);

  // Find active topic or generate fallback package if clicked on catalogue item that has not been initialized
  const currentTopic: TopicPackage = useMemo(() => {
    const existing = topics.find((t) => t.id === selectedTopicId);
    if (existing) return existing;

    // Search in catalog to generate a starter package
    let catItem = GRADE_TOPICS_CATALOG[selectedGrade]?.find((item) => item.id === selectedTopicId);
    if (!catItem) {
      // Check other grades catalog in case it was a multi-grade shared topic
      for (const g of [6, 7, 8, 9, 10, 11, 12] as GradeNumber[]) {
        const found = GRADE_TOPICS_CATALOG[g]?.find((item) => item.id === selectedTopicId);
        if (found) {
          catItem = found;
          break;
        }
      }
    }
    if (catItem) {
      return {
        id: catItem.id,
        grade: selectedGrade,
        category: catItem.category,
        title: catItem.title,
        code: `МАТ-${selectedGrade}.${catItem.id.slice(0, 4)}`,
        description: `${selectedGrade}-р ангийн «${catItem.title}» сэдвийн хичээлийн онол, жишээ, бие даах дасгал, сорилын багц.`,
        theory: [
          {
            id: `th-${catItem.id}-1`,
            title: `${catItem.title} - Үндсэн тодорхойлолт ба дүрэм`,
            ruleText: `«${catItem.title}» сэдвийн хүрээнд сурагчдын эзэмших суурь мэдлэг, дүрэм, чанарыг тодорхойлсон үндсэн онол.`,
            formula: 'a + b = c',
            note: 'Багш та энэхүү онолыг "Сэдэв засах" товчоор хүссэнээрээ баяжуулж болно.',
          },
        ],
        examples: [
          {
            id: `ex-${catItem.id}-1`,
            number: 1,
            title: 'Энгийн жишээ',
            problem: `${catItem.title} сэдвийн 1-р жишээ бодлогын нөхцөл.`,
            solutionSteps: ['Шинжилгээ хийж, томьёог ашиглан бодолтыг алхам дараалан гүйцэтгэнэ.'],
            answer: 'Бодлогын эцсийн хариу',
          },
        ],
        practice: [
          {
            id: `pr-${catItem.id}-1`,
            number: 1,
            question: `${catItem.title} сэдвийн анхан шатны бие даан ажиллах дасгал бодлого.`,
            difficulty: 'easy',
            answer: 'Зөв хариу',
            solution: 'Шалгах бодолт',
            workSpaceLines: 3,
          },
          {
            id: `pr-${catItem.id}-2`,
            number: 2,
            question: `${catItem.title} сэдвийн дунд шатны бодлого.`,
            difficulty: 'medium',
            answer: 'Зөв хариу',
            solution: 'Шалгах бодолт',
            workSpaceLines: 4,
          },
        ],
        test1: {
          id: `t1-${catItem.id}`,
          testNumber: 1,
          title: 'Анхан',
          subtitle: 'Анхан шатны мэдлэг шалгах сорил',
          targetSkills: 'Үндсэн ойлголтуудыг бататгах',
          totalPoints: 10,
          questions: [
            {
              id: `t1-q1-${catItem.id}`,
              number: 1,
              question: 'Сэдвийн хүрээнд анхан шатны сорилын асуулт 1.',
              points: 5,
              answer: 'Хариу 1',
              workSpaceLines: 3,
            },
            {
              id: `t1-q2-${catItem.id}`,
              number: 2,
              question: 'Сэдвийн хүрээнд анхан шатны сорилын асуулт 2.',
              points: 5,
              answer: 'Хариу 2',
              workSpaceLines: 3,
            },
          ],
        },
        test2: {
          id: `t2-${catItem.id}`,
          testNumber: 2,
          title: 'Дунд',
          subtitle: 'Дунд шатны хэрэглээний сорил',
          targetSkills: 'Стандарт түвшний бодлого бодох',
          totalPoints: 10,
          questions: [
            {
              id: `t2-q1-${catItem.id}`,
              number: 1,
              question: 'Стандарт түвшний сорилын асуулт 1.',
              points: 5,
              answer: 'Хариу 1',
              workSpaceLines: 3,
            },
            {
              id: `t2-q2-${catItem.id}`,
              number: 2,
              question: 'Стандарт түвшний сорилын асуулт 2.',
              points: 5,
              answer: 'Хариу 2',
              workSpaceLines: 3,
            },
          ],
        },
        test3: {
          id: `t3-${catItem.id}`,
          testNumber: 3,
          title: 'Гүнзгий',
          subtitle: 'Гүнзгийрүүлсэн сорил',
          targetSkills: 'Нийлмэл бодлого бодох',
          totalPoints: 10,
          questions: [
            {
              id: `t3-q1-${catItem.id}`,
              number: 1,
              question: 'Гүнзгийрүүлсэн түвшний сорилын асуулт 1.',
              points: 5,
              answer: 'Хариу 1',
              workSpaceLines: 4,
            },
            {
              id: `t3-q2-${catItem.id}`,
              number: 2,
              question: 'Гүнзгийрүүлсэн түвшний сорилын асуулт 2.',
              points: 5,
              answer: 'Хариу 2',
              workSpaceLines: 4,
            },
          ],
        },
      };
    }

    // fallback to first available
    return topics[0] || ({} as TopicPackage);
  }, [topics, selectedTopicId, selectedGrade]);

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-sm text-stone-600 bg-stone-100">
        Firebase тохиргоо олдсонгүй (.env файлыг шалгана уу).
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-stone-500 bg-stone-100">
        Ачаалж байна...
      </div>
    );
  }

  if (!currentUser && unverifiedEmail) {
    return <VerifyEmailView email={unverifiedEmail} onVerified={reloadSession} />;
  }

  if (!currentUser) {
    return (
      <>
        <LoginView notice={loginNotice} onRegistered={reloadSession} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-900">
      {/* The admin edits content, so copying stays allowed for them */}
      <CopyProtection enabled={appSettings.copyProtection && currentUser.role !== 'admin'} />
      <ScreenProtection
        enabled={screenProtectionEnabled && currentUser.role !== 'admin'}
        watermark={[currentUser.userId, currentUser.phoneNumber].filter(Boolean).join(' • ')}
      />
      {/* Top Navigation Bar on Screen */}
      <header className="screen-header bg-white border-b border-stone-200 sticky top-0 z-40 h-14 px-4 flex items-center shadow-2xs no-print">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen((prev) => !prev)}
              className="p-1.5 rounded-lg text-stone-700 hover:bg-stone-100 lg:hidden cursor-pointer"
              aria-label={mobileSidebarOpen ? 'Цэс хаах' : 'Цэс нээх'}
            >
              {mobileSidebarOpen ? <X className="w-5 h-5 text-stone-900" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              className="flex items-center space-x-2 cursor-pointer"
              onClick={() => setActiveView('home')}
              title="Нүүр хуудас"
            >
              <span className="w-7 h-7 rounded-md bg-stone-900 text-amber-400 font-black text-sm flex items-center justify-center shrink-0">
                ∑
              </span>
              <span className="font-extrabold text-sm md:text-base tracking-tight text-stone-950 hidden lg:inline whitespace-nowrap">
                Математикийн сургалтын материалын сан
              </span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Action buttons */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {currentUser.role !== 'admin' && getFirebaseAuth().currentUser && (
              <AnnouncementsBell uid={getFirebaseAuth().currentUser!.uid} />
            )}

            {/* Admin view switcher: admin / general / unpaid user / paid user */}
            {currentUser?.role === 'admin' && generalLocked && (
              <span
                className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-bold flex items-center gap-1"
                data-testid="general-badge"
              >
                <Presentation className="w-3.5 h-3.5" />
                Ерөнхий
              </span>
            )}
            {currentUser?.role === 'admin' && !generalLocked && (
              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                {([
                  ['admin', 'Админ', 'Админ горим', Shield],
                  ['general', 'Ерөнхий', 'Ерөнхий харагдац: админы эрхтэй, засах товчгүй', Presentation],
                  ['unpaid', 'Төлөөгүй', 'Төлбөр төлөөгүй хэрэглэгчээр харах', UserX],
                  ['paid', 'Төлсөн', 'Төлбөр төлсөн хэрэглэгчээр харах', UserCheck],
                ] as const).map(([mode, , title, Icon]) => {
                  const active =
                    mode === 'admin'
                      ? !previewAsUser && !generalView
                      : mode === 'general'
                      ? !previewAsUser && generalView
                      : previewAsUser === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setGeneralView(mode === 'general');
                        setPreviewAsUser(mode === 'paid' || mode === 'unpaid' ? mode : false);
                      }}
                      className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                        active
                          ? mode === 'admin'
                            ? 'bg-stone-900 text-amber-400 shadow-xs'
                            : mode === 'general'
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'bg-amber-500 text-stone-950 shadow-xs'
                          : 'text-stone-500 hover:text-stone-900'
                      }`}
                      title={title}
                      aria-label={title}
                      data-testid={`preview-${mode}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
                {previewAsUser === 'paid' && (
                  <select
                    value={paidPreviewGrade}
                    onChange={(e) => changePaidPreviewGrade(Number(e.target.value) as GradeNumber)}
                    className="ml-0.5 mr-0.5 py-1 px-1 rounded-md border border-stone-300 bg-white text-[11px] font-bold text-stone-700 cursor-pointer"
                    title="Төлбөр төлсөн хэрэглэгчийн анги"
                    data-testid="paid-preview-grade"
                  >
                    {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        {g}-р
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Admin only: Unified Print & PDF Menu */}
            {currentUser?.role === 'admin' && !previewAsUser && (
              <div className="relative" ref={printMenuRef}>
                <button
                  type="button"
                  onClick={() => setPrintMenuOpen((prev) => !prev)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-stone-900 hover:bg-black text-white flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                  aria-expanded={printMenuOpen}
                  aria-label="Хэвлэх"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Хэвлэх</span>
                  <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-stone-400 transition-transform duration-150 ${printMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {printMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Which parts of the lesson to print */}
                    <div className="px-3.5 pt-1.5 pb-2" data-testid="print-sections">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Хэвлэх хэсгүүд</div>
                      <div className="flex gap-1.5">
                        {(
                          [
                            ['theory', 'О', 'Онол'],
                            ['examples', 'Ж', 'Жишээ'],
                            ['practice', 'Д', 'Дасгал'],
                          ] as const
                        ).map(([key, label, full]) => (
                          <label
                            key={key}
                            title={full}
                            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer select-none px-2 py-1 rounded-lg border ${
                              printSelection[key] ? 'bg-amber-50 border-amber-200 text-stone-900' : 'border-stone-200 text-stone-500'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={printSelection[key]}
                              onChange={() => setPrintSelection({ ...printSelection, [key]: !printSelection[key] })}
                              className="w-3.5 h-3.5 accent-amber-700 cursor-pointer"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="my-1 border-t border-stone-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setPrintMenuOpen(false);
                        window.print();
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 flex items-center space-x-2.5 transition-colors group cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                        <Printer className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">Хэвлэх (A4)</div>
                        <div className="text-[10px] text-stone-500">Принтер рүү шууд илгээх</div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-stone-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setPrintMenuOpen(false);
                        window.print();
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-stone-50 flex items-center space-x-2.5 transition-colors group cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700 group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                        <FileDown className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">PDF-ээр хадгалах</div>
                        <div className="text-[10px] text-stone-500">Цонхноос &quot;Save as PDF&quot; сонгох</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout: Sidebar + Main Content */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto items-start">
        {/* Left Sidebar */}
        <Sidebar
          selectedGrade={selectedGrade}
          onSelectGrade={setSelectedGrade}
          selectedTopicId={selectedTopicId}
          onSelectTopic={(topicId) => {
            setSelectedTopicId(topicId);
            setActiveView('topics');
          }}
          onOpenAdmin={() => setAdminModalOpen(true)}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          currentUser={currentUser}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onLogout={handleLogout}
          onOpenAccessRequests={() => setAccessRequestsModalOpen(true)}
          isAdmin={currentUser?.role === 'admin' && !previewAsUser}
          hidePlanView={canEdit}
          activeView={activeView}
          onSelectView={setActiveView}
          showHome={isStudent || currentUser.role === 'admin'}
          examFilter={examFilter}
          onExamFilter={setExamFilter}
          onOpenPlan={() => setActiveView('plan')}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 min-w-0">
          {currentUser.role !== 'admin' && !hasPlan && userPermissionsService.isExpired(currentUser.userId) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 font-medium" data-testid="access-expired">
              Таны хичээл үзэх эрхийн хугацаа{' '}
              {new Date(userPermissionsService.getUserPermissions(currentUser.userId!).expiresAt!).toLocaleDateString()}-нд
              дууссан байна. Сунгуулахын тулд админд хандана уу.
            </div>
          )}
          {/* Access ends within a week: remind the student on the home page (not in the admin's views) */}
          {isStudent && currentUser.role !== 'admin' && activeView === 'home' && learningPlan.isPaid() && (() => {
            const until = learningPlan.paidUntil();
            const daysLeft = until ? Math.ceil((until - Date.now()) / 86400000) : null;
            if (daysLeft === null || daysLeft > 7) return null;
            return (
              <div
                className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2"
                data-testid="access-ending"
              >
                <span>
                  Таны эрх <b>{Math.max(daysLeft, 1)} хоногийн дараа</b> дуусна.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('home');
                    setTimeout(
                      () => document.querySelector('[data-testid="plan-payment"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
                      100
                    );
                  }}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-bold cursor-pointer"
                >
                  Хугацаа сунгах
                </button>
              </div>
            );
          })()}
          {isStudent && learningPlan.isLoading() ? (
            <div className="text-center py-20 text-sm text-stone-500">Ачаалж байна...</div>
          ) : isStudent && activeView === 'placement' && learningPlan.canTakePlacement(placementGrade) ? (
            <PlacementTestView key={placementGrade} uid={getFirebaseAuth().currentUser!.uid} grade={placementGrade} />
          ) : currentUser.role === 'admin' && generalView && !previewAsUser && activeView === 'home' ? (
            // General view: no student steps or cards on the home page
            <h1 className="max-w-5xl mx-auto text-2xl font-black text-stone-950" data-testid="general-home">
              Сайн байна уу{currentUser.name ? `, ${currentUser.name.split(' ').pop()}` : ''}!
            </h1>
          ) : (isStudent && (activeView === 'home' || activeView === 'placement')) ||
            (currentUser.role === 'admin' && !previewAsUser && activeView === 'home') ? (
            <StudentHome
              uid={getFirebaseAuth().currentUser?.uid}
              currentUser={currentUser}
              editable={canEdit}
              onStartPlacement={(grade) => {
                setPlacementGrade(grade);
                setActiveView('placement');
              }}
              onOpenPlan={() => setActiveView('plan')}
              onOpenLessons={() => setActiveView('topics')}
              onOpenExams={() => setActiveView('exams')}
              onOpenTopic={(topicId) => openPlanTopic(topicId, 'topics')}
            />
          ) : activeView === 'plan' && isStudent ? (
            <LearningPlanView
              uid={getFirebaseAuth().currentUser!.uid}
              currentUser={currentUser}
              onOpenTopic={(topicId) => openPlanTopic(topicId, 'topics')}
              onOpenExam={(topicId) => openPlanTopic(topicId, 'exams')}
              onStartPlacement={() => {
                const own = learningPlan.state.grade;
                if (own && learningPlan.canTakePlacement(own)) {
                  setPlacementGrade(own);
                  setActiveView('placement');
                } else {
                  setActiveView('home');
                }
              }}
            />
          ) : activeView === 'mistakes' && isStudent ? (
            <MistakesView
              onOpenExam={(topicId) => {
                setSelectedTopicId(topicId);
                setActiveView('exams');
              }}
            />
          ) : activeView === 'exams' || activeView === 'mistakes' ? (
            <ExamsHub
              topics={topics}
              selectedGrade={selectedGrade}
              onSelectGrade={setSelectedGrade}
              onSelectTopic={(topicId) => {
                setSelectedTopicId(topicId);
                setActiveView('topics');
              }}
              isAdmin={currentUser?.role === 'admin' && !previewAsUser}
              userId={currentUser?.userId}
              uid={getFirebaseAuth().currentUser?.uid}
              filter={canEdit ? 'all' : examFilter}
            />
          ) : currentTopic.id ? (
            <TopicPage
              topic={currentTopic}
              viewGrade={selectedGrade}
              isAdmin={currentUser?.role === 'admin' && !previewAsUser}
              currentUser={currentUser}
              onUpdateTopic={(updated) => {
                storageService.saveTopic(updated);
                refreshTopics();
              }}
              onOpenAdmin={canEdit ? () => setAdminModalOpen(true) : undefined}
              onPreviewAsUser={() => {
                setGeneralView(false);
                setPreviewAsUser('unpaid');
              }}
              onOpenPlan={() => setActiveView('home')}
              onOpenExamsHub={(topicId) => {
                if (topicId) setSelectedTopicId(topicId);
                setActiveView('exams');
              }}
            />
          ) : (
            <div className="text-center py-20 text-stone-400">
              Сэдэв сонгоно уу.
            </div>
          )}
        </main>
      </div>

      {/* Admin Material Editor Modal */}
      <AdminEditorModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        activeTopic={currentTopic}
        onTopicUpdated={(updated) => {
          setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        }}
        onRefreshAllTopics={refreshTopics}
        onLogout={handleLogout}
      />

      {/* Access Requests Management Modal */}
      <AccessRequestsModal
        isOpen={accessRequestsModalOpen}
        onClose={() => setAccessRequestsModalOpen(false)}
      />

      {/* Settings Modal (Phone-style cascading settings: profile, phone, email, password, preferences) */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        currentUser={currentUser}
        onUpdateCurrentUser={(updated) => setCurrentUser(updated)}
        onLogout={handleLogout}
        screenProtectionEnabled={screenProtectionEnabled}
        onToggleScreenProtection={handleToggleScreenProtection}
        deviceLimitEnabled={appSettings.deviceLimit}
        onToggleDeviceLimit={handleToggleDeviceLimit}
        copyProtectionEnabled={appSettings.copyProtection}
        onToggleCopyProtection={handleToggleCopyProtection}
        isAdmin={currentUser?.role === 'admin'}
      />
    </div>
  );
}
