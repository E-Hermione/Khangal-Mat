import React, { useState } from 'react';
import { useCtrlS } from '../utils/useCtrlS';
import { WorkedExamplesSection } from './WorkedExamplesSection';
import { PracticeSection } from './PracticeSection';
import { CheckOption } from './CheckOption';
import { theoryNumbers } from '../utils/theoryBlocks';
import { TheoryBlocksEditor } from './TheoryBlocksEditor';
import { TopicPackage, GradeNumber, TheoryRule, WorkedExample, PracticeProblem, TestQuestion } from '../types';
import { storageService } from '../services/storageService';
import { SolutionSteps, solutionLines } from './SolutionSteps';
import { MathRenderer } from './MathRenderer';
import { LatexInputWithPreview, LatexToolbar } from './LatexInputWithPreview';
import {
  X,
  Plus,
  Trash2,
  Save,
  BookOpen,
  Lightbulb,
  PencilLine,
  Award,
  Upload,
  ArrowUp,
  ArrowDown,
  History,
  ChevronDown,
  Check,
} from 'lucide-react';
import { recordTopicSave, SaveMode, SaveTarget } from '../services/topicHistory';
import { withExampleSolutions } from '../utils/exampleSolution';
import { TopicHistoryDialog } from './TopicHistoryDialog';
import { backdropClose } from '../utils/backdrop';

// The parts «Файлаас оруулах» can bring in one at a time
const IMPORT_KEYS = ['theory', 'examples', 'practice', 'test1', 'test2', 'test3'] as const;
type ImportPart = (typeof IMPORT_KEYS)[number];
const IMPORT_LABELS: Record<ImportPart, string> = {
  theory: 'Онол',
  examples: 'Жишээ',
  practice: 'Бие даан бодох дасгал',
  test1: 'Анхан сорил',
  test2: 'Дунд сорил',
  test3: 'Ахисан сорил',
};

interface AdminEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTopic: TopicPackage;
  onTopicUpdated: (updatedTopic: TopicPackage) => void;
  onRefreshAllTopics: () => void;
  onLogout?: () => void;
}

// Which grade a theory part, example or exercise belongs to (students of lower grades do not see it)
const ItemGradePicker: React.FC<{ value?: number; onChange: (grade: number | undefined) => void }> = ({ value, onChange }) => (
  <select
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
    className="text-xs p-1.5 rounded border border-stone-300 font-bold bg-white"
    title="Аль ангийнх"
  >
    <option value="">Үндсэн анги</option>
    {[6, 7, 8, 9, 10, 11, 12].map((g) => (
      <option key={g} value={g}>
        {g}-р анги
      </option>
    ))}
  </select>
);

export const AdminEditorModal: React.FC<AdminEditorModalProps> = ({
  isOpen,
  onClose,
  activeTopic,
  onTopicUpdated,
  onRefreshAllTopics,
  onLogout,
}) => {
  const [topic, setTopic] = useState<TopicPackage>({ ...activeTopic });
  const [activeTab, setActiveTab] = useState<'info' | 'theory' | 'examples' | 'practice' | 'tests'>('theory');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  // The save button itself turns green for a moment after a save
  const [justSaved, setJustSaved] = useState(false);
  const savedTimer = React.useRef<number | undefined>(undefined);
  // Theory tab: the one theory item being edited
  const [theoryIdx, setTheoryIdx] = useState(0);
  // Examples tab: the one example being edited
  const [exampleIdx, setExampleIdx] = useState(0);
  // Practice tab: the one exercise being edited
  const [practiceIdx, setPracticeIdx] = useState(0);
  // Tests tab: the test being edited
  const [testTab, setTestTab] = useState<1 | 2 | 3>(1);

  // Sync state when activeTopic changes
  // The topic as last saved: closing asks for confirmation only when there are unsaved changes
  const savedRef = React.useRef(JSON.stringify(activeTopic));
  // Topic history: the dialog, and whether a file was imported since the last save
  const [historyOpen, setHistoryOpen] = useState(false);
  // How the editor's content came about since the last save: edited, imported or restored
  const saveModeRef = React.useRef<SaveMode>('edit');
  // «Файлаас оруулах»: the part chosen in its menu
  const importTarget = React.useRef<ImportPart>('theory');
  const [importMenu, setImportMenu] = useState(false);
  React.useEffect(() => {
    setTopic({ ...activeTopic });
    savedRef.current = JSON.stringify(activeTopic);
  }, [activeTopic]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  useCtrlS(isOpen);

  if (!isOpen) return null;

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Fills this topic's lesson from a prepared .json file (theory, examples, exercises, the 3 tests).
  // The topic keeps its own name, grade and place in the list; item ids get the topic's id in front
  // so they never clash with another topic's.
  // «Файлаас оруулах»: one part at a time (or all of them). The file may hold the whole topic
  // (only the chosen part is taken from it) or just that part (its list, or the test itself).
  const pickImport = (part: ImportPart) => {
    importTarget.current = part;
    setImportMenu(false);
    fileInputRef.current?.click();
  };
  // Puts lesson content (from a file, or JSON edited in the history) on the site at once. Only
  // the chosen part is replaced.
  const applyContent = (data: any, part: ImportPart, mode: SaveMode, source: string, target: SaveTarget = {}): boolean => {
    const pre = (id: string) => (id.startsWith(`${topic.id}-`) ? id : `${topic.id}-${id}`);
    const withIds = <T extends { id: string }>(list: T[] = []) => list.map((x) => ({ ...x, id: pre(x.id) }));
    const test = (t: TopicPackage['test1'], n: 1 | 2 | 3) => ({ ...t, id: pre(t.id || `test${n}`), testNumber: n, questions: withIds(t.questions) });
    const next = { ...topic };
    const done: string[] = [];
    for (const key of [part]) {
      // The part on its own: a list for theory/examples/practice, the test object for a test
      const own = (key.startsWith('test') ? data && Array.isArray(data.questions) : Array.isArray(data)) ? data : undefined;
      const value = own ?? data?.[key];
      if (key.startsWith('test')) {
        if (!value || !Array.isArray(value.questions)) continue;
        const n = Number(key.slice(4)) as 1 | 2 | 3;
        next[key as 'test1'] = test(value, n);
      } else {
        if (!Array.isArray(value)) continue;
        next[key as 'theory'] = withIds(value);
      }
      done.push(IMPORT_LABELS[key]);
    }
    if (!done.length) {
      showStatus(`${source}: «${IMPORT_LABELS[part]}» хэсэг алга.`);
      return false;
    }
    if (!window.confirm(`Солигдох хэсэг: ${done.join(', ')}. Бусад хэсэг хэвээр үлдэнэ. Үргэлжлүүлэх үү?`)) return false;
    // Examples written with separate steps come in as one solution text
    Object.assign(next, withExampleSolutions(next));
    // Saved at once, so the site and the history get it without a separate «Хадгалах»
    setTopic(next);
    saveModeRef.current = mode;
    persist(next, target);
    showStatus(`${done.join(', ')}: ${source}-оос хадгаллаа.`);
    return true;
  };
  const importContent = async (file: File) => {
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      showStatus('Файлыг уншиж чадсангүй.');
      return;
    }
    applyContent(data, importTarget.current, 'import', 'Файл', { file: file.name });
  };

  // Saves to the site; the history notes it
  const persist = (t: TopicPackage, target: SaveTarget = {}) => {
    const before = JSON.parse(savedRef.current) as TopicPackage;
    recordTopicSave(before, t, saveModeRef.current, target).catch((err) => console.error('Topic history not saved', err));
    saveModeRef.current = 'edit';
    savedRef.current = JSON.stringify(t);
    storageService.saveTopic(t);
    onTopicUpdated(t);
    onRefreshAllTopics();
  };
  const handleSave = () => {
    persist(topic);
    setJustSaved(true);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setJustSaved(false), 2000);
  };

  // Add & remove helpers
  const addTheoryRule = () => {
    const newRule: TheoryRule = {
      id: `th-${Date.now()}`,
      title: 'Шинэ дүрмийн нэр',
      ruleText: 'Дүрмийн тодорхойлолт энд бичнэ. Жишээ: $a^2 + b^2 = c^2$',
      formula: '',
      badge: 'Дүрэм',
    };
    setTopic({ ...topic, theory: [...(topic.theory || []), newRule] });
    setTheoryIdx(topic.theory?.length || 0);
  };

  const removeTheoryRule = (index: number) => {
    const updated = [...(topic.theory || [])];
    updated.splice(index, 1);
    setTopic({ ...topic, theory: updated });
    setTheoryIdx(Math.max(0, Math.min(index, updated.length - 1)));
  };

  const addWorkedExample = () => {
    const nextNum = (topic.examples?.length || 0) + 1;
    const newEx: WorkedExample = {
      id: `ex-${Date.now()}`,
      number: nextNum,
      title: `Жишээ ${nextNum}`,
      problem: 'Бодлогын нөхцөлийг бичнэ үү ($...$).',
      solution: '',
      answer: 'Хариу',
    };
    setTopic({ ...topic, examples: [...(topic.examples || []), newEx] });
    setExampleIdx(topic.examples?.length || 0);
  };

  const removeWorkedExample = (index: number) => {
    const updated = [...(topic.examples || [])];
    updated.splice(index, 1);
    updated.forEach((item, idx) => {
      item.number = idx + 1;
    });
    setTopic({ ...topic, examples: updated });
    setExampleIdx(Math.max(0, Math.min(index, updated.length - 1)));
  };

  const addPracticeProblem = () => {
    const nextNum = (topic.practice?.length || 0) + 1;
    const newPr: PracticeProblem = {
      id: `pr-${Date.now()}`,
      number: nextNum,
      question: 'Шинэ дасгал бодлого ($x + 1 = 2$)',
      answer: '$x = 1$',
      solution: 'Бодолтын тайлбар',
    };
    setTopic({ ...topic, practice: [...(topic.practice || []), newPr] });
    setPracticeIdx(topic.practice?.length || 0);
  };

  const removePracticeProblem = (index: number) => {
    const updated = [...(topic.practice || [])];
    updated.splice(index, 1);
    updated.forEach((item, idx) => {
      item.number = idx + 1;
    });
    setTopic({ ...topic, practice: updated });
    setPracticeIdx(Math.max(0, Math.min(index, updated.length - 1)));
  };

  const addTestQuestion = (testNum: 1 | 2 | 3) => {
    const testKey = testNum === 1 ? 'test1' : testNum === 2 ? 'test2' : 'test3';
    const currentTest = topic[testKey];
    const nextNum = (currentTest.questions?.length || 0) + 1;
    const newQ: TestQuestion = {
      id: `t${testNum}-q-${Date.now()}`,
      number: nextNum,
      question: 'Шинэ сорилын асуулт / бодлого ($...$)',
      points: 5,
      answer: 'Хариу',
      solution: 'Бодолт',
    };
    const newQuestions = [...(currentTest.questions || []), newQ];
    const totalPoints = newQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
    setTopic({
      ...topic,
      [testKey]: {
        ...currentTest,
        questions: newQuestions,
        totalPoints,
      },
    });
  };

  const removeTestQuestion = (testNum: 1 | 2 | 3, qIndex: number) => {
    const testKey = testNum === 1 ? 'test1' : testNum === 2 ? 'test2' : 'test3';
    const currentTest = topic[testKey];
    const newQuestions = [...(currentTest.questions || [])];
    newQuestions.splice(qIndex, 1);
    newQuestions.forEach((q, idx) => {
      q.number = idx + 1;
    });
    const totalPoints = newQuestions.reduce((sum, q) => sum + (q.points || 0), 0);
    setTopic({
      ...topic,
      [testKey]: {
        ...currentTest,
        questions: newQuestions,
        totalPoints,
      },
    });
  };

  return (
    <div {...backdropClose(onClose, JSON.stringify(topic) !== savedRef.current ? 'Хадгалаагүй өөрчлөлт алга болно. Хаах уу?' : undefined)} className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-900/60 backdrop-blur-xs overflow-hidden">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[92vh] max-h-[92vh] flex flex-col shadow-2xl border border-stone-300 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 p-4 md:px-6 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-white z-20">
          <div>
            <div className="text-xs uppercase text-amber-400 font-bold tracking-wider">
              Удирдлагын хэсэг
            </div>
            <h2 className="text-base md:text-lg font-black tracking-tight">
              Сэдэв засах: {topic.title} ({topic.grade}-р анги)
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            {statusMessage && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800">
                {statusMessage}
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importContent(f);
                e.target.value = '';
              }}
              data-testid="import-content-file"
            />
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
              title="Хадгалсан хувилбарууд: татах, сэргээх"
              data-testid="topic-history-open"
            >
              <History className="w-3.5 h-3.5" />
              <span>Түүх</span>
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setImportMenu((v) => !v)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
                title="Бэлэн агуулгыг .json файлаас оруулах: аль хэсгийг гэдгээ сонгоно"
                aria-expanded={importMenu}
                data-testid="import-menu"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Файлаас оруулах</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {importMenu && (
                <div className="absolute right-0 top-full mt-1 z-30 w-48 bg-white rounded-xl border border-stone-200 shadow-xl py-1 text-stone-800">
                  {IMPORT_KEYS.map((part) => (
                    <button
                      key={part}
                      type="button"
                      onClick={() => pickImport(part)}
                      className="w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-amber-50 cursor-pointer"
                      data-testid={`import-${part}`}
                    >
                      {IMPORT_LABELS[part]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              data-ctrl-s
              className={`px-3.5 py-1.5 rounded-lg font-black text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors ${
                justSaved ? 'bg-emerald-500 hover:bg-emerald-400 text-white' : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
              }`}
            >
              {justSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              <span>{justSaved ? 'Хадгалагдлаа' : 'Хадгалах'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="shrink-0 flex border-b border-stone-200 bg-stone-100 px-4 overflow-x-auto text-xs font-bold z-10">
          <button
            type="button"
            onClick={() => setActiveTab('theory')}
            className={`shrink-0 whitespace-nowrap py-3 px-3.5 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'theory'
                ? 'border-amber-600 text-amber-900 bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Онолын дүрэм ({topic.theory?.length || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('examples')}
            className={`shrink-0 whitespace-nowrap py-3 px-3.5 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'examples'
                ? 'border-amber-600 text-amber-900 bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Жишээ бодлого ({topic.examples?.length || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('practice')}
            className={`shrink-0 whitespace-nowrap py-3 px-3.5 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'practice'
                ? 'border-amber-600 text-amber-900 bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <PencilLine className="w-3.5 h-3.5" />
            <span>Бие даах дасгал ({topic.practice?.length || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`shrink-0 whitespace-nowrap py-3 px-3.5 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'tests'
                ? 'border-amber-600 text-amber-900 bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Сорил 1, 2, 3</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`shrink-0 whitespace-nowrap py-3 px-3.5 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'info'
                ? 'border-amber-600 text-amber-900 bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Сэдвийн мэдээлэл</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0 bg-white">
          {/* 1. THEORY TAB */}
          {activeTab === 'theory' && (
            <div className="space-y-4">
              {/* Stays on screen while scrolling */}
              <div className="sticky -top-4 md:-top-6 z-10 bg-white py-2 border-b border-stone-200 space-y-2">
    <div className="flex items-center justify-between">
                  <span />
                  <button
                    type="button"
                    onClick={addTheoryRule}
                    className="text-xs px-3 py-1.5 bg-stone-900 hover:bg-black text-white rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Шинэ дүрэм нэмэх</span>
                  </button>
                </div>
                {/* One LaTeX toolbar for every field below: writes into the field clicked last */}
                <LatexToolbar />
              </div>

              <div className="flex gap-4 items-start">
                {/* 1, 1.1, 1.2, 2, …: pick the one to edit */}
                <nav className="w-40 md:w-48 shrink-0 sticky top-28 space-y-0.5 max-h-[60vh] overflow-y-auto">
                  {(() => {
                    const numbers = theoryNumbers(topic.theory || []);
                    const list = topic.theory || [];
                    const move = (idx: number, step: -1 | 1) => {
                      const j = idx + step;
                      if (j < 0 || j >= list.length) return;
                      const updated = [...list];
                      [updated[idx], updated[j]] = [updated[j], updated[idx]];
                      setTopic({ ...topic, theory: updated });
                      setTheoryIdx(j);
                    };
                    return list.map((rule, idx) => {
                      const on = idx === Math.min(theoryIdx, list.length - 1);
                      return (
                        <div key={rule.id || idx} className={`flex items-center rounded-lg ${on ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'}`}>
                          <button
                            type="button"
                            onClick={() => setTheoryIdx(idx)}
                            className={`flex-1 min-w-0 text-left px-2 py-1.5 text-xs cursor-pointer truncate ${rule.sub ? 'pl-5' : ''} ${on ? 'font-bold' : ''}`}
                            title={rule.title}
                          >
                            <span className="font-bold">{numbers[idx]}.</span> {rule.title}
                          </button>
                          {/* Move this item up or down */}
                          <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} title="Дээш зөөх" className="p-0.5 opacity-60 hover:opacity-100 disabled:opacity-20 cursor-pointer">
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => move(idx, 1)} disabled={idx === list.length - 1} title="Доош зөөх" className="p-0.5 pr-1 opacity-60 hover:opacity-100 disabled:opacity-20 cursor-pointer">
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    });
                  })()}
                </nav>
              <div className="flex-1 min-w-0 space-y-4">
                {topic.theory.map((rule, idx) => idx !== Math.min(theoryIdx, topic.theory.length - 1) ? null : (
                  <div key={rule.id || idx} className="p-4 border border-stone-200 rounded-xl bg-stone-50/60 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={rule.title}
                          onChange={(e) => {
                            const updated = [...topic.theory];
                            updated[idx].title = e.target.value;
                            setTopic({ ...topic, theory: updated });
                          }}
                          placeholder="Дүрмийн гарчиг"
                          className="text-xs font-bold p-2 bg-white border border-stone-300 rounded"
                        />
                        <input
                          type="text"
                          value={rule.badge || ''}
                          onChange={(e) => {
                            const updated = [...topic.theory];
                            updated[idx].badge = e.target.value;
                            setTopic({ ...topic, theory: updated });
                          }}
                          placeholder="Шошго (жишээ: Дүрэм, Чанар)"
                          className="text-xs p-2 bg-white border border-stone-300 rounded"
                        />
                        <ItemGradePicker
                          value={rule.prerequisiteGrade}
                          onChange={(g) => {
                            const updated = [...topic.theory];
                            updated[idx] = { ...updated[idx], prerequisiteGrade: g };
                            setTopic({ ...topic, theory: updated });
                          }}
                        />
                        {/* Main topic (1, 2, …) or sub-topic of the main one above it (1.1, 1.2, …) */}
                        {([false, true] as const).map((sub) => (
                          <CheckOption
                            key={String(sub)}
                            checked={!!rule.sub === sub}
                            disabled={sub && idx === 0}
                            onChange={() => {
                              const updated = [...topic.theory];
                              updated[idx] = { ...updated[idx], sub: sub || undefined };
                              setTopic({ ...topic, theory: updated });
                            }}
                            label={sub ? 'Дэд сэдэв' : 'Ерөнхий сэдэв'}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTheoryRule(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                        title="Устгах"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <TheoryBlocksEditor
                      hideToolbar
                      rule={rule}
                      onChange={(next) => {
                        const updated = [...topic.theory];
                        updated[idx] = next;
                        setTopic({ ...topic, theory: updated });
                      }}
                    />
                  </div>
                ))}
              </div>
              </div>
            </div>
          )}

          {/* 2. EXAMPLES TAB */}
          {activeTab === 'examples' && (() => {
            const list = topic.examples || [];
            const sel = Math.min(exampleIdx, list.length - 1);
            // Changes one example; numbers always follow the order
            const setList = (next: WorkedExample[]) =>
              setTopic({ ...topic, examples: next.map((x, i) => ({ ...x, number: i + 1 })) });
            const update = (i: number, patch: Partial<WorkedExample>) =>
              setList(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            const move = (i: number, step: -1 | 1) => {
              const j = i + step;
              if (j < 0 || j >= list.length) return;
              const next = [...list];
              [next[i], next[j]] = [next[j], next[i]];
              setList(next);
              setExampleIdx(j);
            };
            return (
            <div className="space-y-4">
              {/* Stays on screen while scrolling */}
              <div className="sticky -top-4 md:-top-6 z-10 bg-white py-2 border-b border-stone-200 space-y-2">
    <div className="flex items-center justify-between">
                  <CheckOption
                    checked={topic.examplesTwoColumns !== false}
                    onChange={(on) => setTopic({ ...topic, examplesTwoColumns: on ? undefined : false })}
                    label="Жишээг 2 эгнээгээр харуулах"
                  />
                  <button
                    type="button"
                    onClick={addWorkedExample}
                    className="text-xs px-3 py-1.5 bg-stone-900 hover:bg-black text-white rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Шинэ жишээ нэмэх</span>
                  </button>
                </div>
                {/* One LaTeX toolbar for every field below: writes into the field clicked last */}
                <LatexToolbar />
              </div>

              <div className="flex gap-4 items-start">
                {/* Pick the example to edit */}
                <nav className="w-40 md:w-48 shrink-0 sticky top-28 space-y-0.5 max-h-[60vh] overflow-y-auto">
                  {list.map((ex, idx) => {
                    const on = idx === sel;
                    return (
                      <div key={ex.id || idx} className={`flex items-center rounded-lg ${on ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'}`}>
                        <button
                          type="button"
                          onClick={() => setExampleIdx(idx)}
                          className={`flex-1 min-w-0 text-left px-2 py-1.5 text-xs cursor-pointer truncate ${on ? 'font-bold' : ''}`}
                        >
                          Жишээ {idx + 1}
                        </button>
                        <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} title="Дээш зөөх" className="p-0.5 opacity-60 hover:opacity-100 disabled:opacity-20 cursor-pointer">
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => move(idx, 1)} disabled={idx === list.length - 1} title="Доош зөөх" className="p-0.5 pr-1 opacity-60 hover:opacity-100 disabled:opacity-20 cursor-pointer">
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </nav>

                {sel >= 0 && list[sel] && (() => {
                  const ex = list[sel];
                  return (
                    <div key={ex.id || sel} className="flex-1 min-w-0 p-4 border border-stone-200 rounded-xl bg-stone-50/60 space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-sm text-stone-900">Жишээ {sel + 1}</span>
                        <div className="flex items-center gap-2">
                          <ItemGradePicker value={ex.prerequisiteGrade} onChange={(g) => update(sel, { prerequisiteGrade: g })} />
                          <button
                            type="button"
                            onClick={() => removeWorkedExample(sel)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                            title="Жишээг устгах"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <LatexInputWithPreview
                              hideToolbar label="Бодлого:" value={ex.problem} onChange={(val) => update(sel, { problem: val })} multiline rows={2} hidePreview />

                      {/* The solution in one field, one step per line */}
                      <LatexInputWithPreview
                        hideToolbar
                        label="Бодолт:"
                        value={ex.solution || ''}
                        onChange={(val) => update(sel, { solution: val || undefined })}
                        multiline
                        rows={6}
                        hidePreview
                      />

                      <LatexInputWithPreview
                              hideToolbar label="Хариу:" value={ex.answer} onChange={(val) => update(sel, { answer: val })} hidePreview />

                      {/* The whole example as it looks on the lesson page */}
                      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-2">Сайт дээр харагдах байдал</div>
                        <WorkedExamplesSection examples={[{ ...ex, number: sel + 1 }]} />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            );
          })()}

          {/* 3. PRACTICE TAB */}
          {activeTab === 'practice' && (
            <div className="space-y-4">
              <div className="sticky -top-4 md:-top-6 z-10 bg-white py-2 border-b border-stone-200 space-y-2">
    <div className="flex items-center justify-between">
                  <CheckOption
                    checked={topic.practiceTwoColumns !== false}
                    onChange={(on) => setTopic({ ...topic, practiceTwoColumns: on ? undefined : false })}
                    label="Бодолт нээгдсэн үед дасгалыг 2 эгнээгээр харуулах"
                  />
                  <button
                    type="button"
                    onClick={addPracticeProblem}
                    className="text-xs px-3 py-1.5 bg-stone-900 hover:bg-black text-white rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Шинэ дасгал нэмэх</span>
                  </button>
                </div>
                {/* One LaTeX toolbar for every field below: writes into the field clicked last */}
                <LatexToolbar />
              </div>

              {(() => {
                const list = topic.practice || [];
                const sel = Math.min(practiceIdx, list.length - 1);
                // Numbers always follow the order
                const setList = (next: PracticeProblem[]) =>
                  setTopic({ ...topic, practice: next.map((x, i) => ({ ...x, number: i + 1 })) });
                const update = (i: number, patch: Partial<PracticeProblem>) =>
                  setList(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                const move = (i: number, step: -1 | 1) => {
                  const j = i + step;
                  if (j < 0 || j >= list.length) return;
                  const next = [...list];
                  [next[i], next[j]] = [next[j], next[i]];
                  setList(next);
                  setPracticeIdx(j);
                };
                const item = sel >= 0 ? list[sel] : undefined;
                return (
                  <div className="flex gap-4 items-start">
                    {/* Pick the exercise to edit */}
                    <nav className="w-40 md:w-48 shrink-0 sticky top-28 space-y-0.5 max-h-[60vh] overflow-y-auto">
                      {list.map((p, idx) => {
                        const on = idx === sel;
                        return (
                          <div key={p.id || idx} className={`flex items-center rounded-lg ${on ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'}`}>
                            <button
                              type="button"
                              onClick={() => setPracticeIdx(idx)}
                              className={`flex-1 min-w-0 text-left px-2 py-1.5 text-xs cursor-pointer truncate ${on ? 'font-bold' : ''}`}
                            >
                              Дасгал {idx + 1}
                            </button>
                            <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} title="Дээш зөөх" className="p-0.5 opacity-60 hover:opacity-100 disabled:opacity-20 cursor-pointer">
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button type="button" onClick={() => move(idx, 1)} disabled={idx === list.length - 1} title="Доош зөөх" className="p-0.5 pr-1 opacity-60 hover:opacity-100 disabled:opacity-20 cursor-pointer">
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </nav>

                    {item && (
                      <div key={item.id || sel} className="flex-1 min-w-0 p-4 border border-stone-200 rounded-xl bg-stone-50/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-stone-900">Дасгал {sel + 1}</span>
                          <div className="flex items-center gap-2">
                            <ItemGradePicker value={item.prerequisiteGrade} onChange={(g) => update(sel, { prerequisiteGrade: g })} />
                            <button
                              type="button"
                              onClick={() => removePracticeProblem(sel)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                              title="Дасгалыг устгах"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <LatexInputWithPreview hideToolbar label="Бодлого:" value={item.question} onChange={(val) => update(sel, { question: val })} multiline rows={3} hidePreview />
                        {/* The solution in one field, one step per line */}
                        <LatexInputWithPreview
                          hideToolbar
                          label="Бодолт:"
                          value={item.solution || ''}
                          onChange={(val) => update(sel, { solution: val || undefined })}
                          multiline
                          rows={6}
                          hidePreview
                        />
                        <LatexInputWithPreview hideToolbar label="Зөв хариу:" value={item.answer} onChange={(val) => update(sel, { answer: val })} hidePreview />
                        <LatexInputWithPreview hideToolbar label="Зөвлөмж / Санамж:" value={item.hint || ''} onChange={(val) => update(sel, { hint: val })} hidePreview />

                        {/* The whole exercise as it looks on the lesson page (with its answer) */}
                        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-2">Сайт дээр харагдах байдал</div>
                          <div className="bg-white rounded-lg p-4">
                            <PracticeSection practice={[{ ...item, number: sel + 1 }]} teacherVersion allowSolutions />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* 4. TESTS TAB */}
          {activeTab === 'tests' && (
            <div className="space-y-6">
              {/* One LaTeX toolbar for every field below: writes into the field clicked last */}
              <div className="sticky -top-4 md:-top-6 z-10 bg-white py-2 border-b border-stone-200">
                <LatexToolbar />
              </div>
              <div className="flex gap-4 items-start">
              {/* Pick the test to edit */}
              <nav className="w-40 md:w-48 shrink-0 sticky top-16 space-y-0.5">
                {([1, 2, 3] as const).map((n) => {
                  const t = topic[n === 1 ? 'test1' : n === 2 ? 'test2' : 'test3'];
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setTestTab(n)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs cursor-pointer ${
                        n === testTab ? 'bg-stone-900 text-white font-bold' : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {t?.title || n} сорил
                    </button>
                  );
                })}
              </nav>
              <div className="flex-1 min-w-0">
              {([testTab] as const).map((tNum) => {
                const testKey = tNum === 1 ? 'test1' : tNum === 2 ? 'test2' : 'test3';
                const test = topic[testKey];
                return (
                  <div key={test.id || tNum} className="p-4 border border-stone-300 rounded-xl bg-stone-50 space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <div>
                        <span className="font-black text-sm uppercase text-stone-900">
                          {test.title} (Нийт {test.totalPoints} оноо)
                        </span>
                        <div className="text-xs text-stone-500">{test.targetSkills}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addTestQuestion(tNum)}
                        className="text-xs px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Асуулт нэмэх</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {test.questions.map((q, qIdx) => (
                        <div key={q.id || qIdx} className="p-3 bg-white border border-stone-200 rounded-lg text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-800">Асуулт {q.number}:</span>
                            <div className="flex items-center space-x-2">
                              <ItemGradePicker
                                value={q.prerequisiteGrade}
                                onChange={(g) => {
                                  const newQuestions = [...test.questions];
                                  newQuestions[qIdx] = { ...newQuestions[qIdx], prerequisiteGrade: g };
                                  setTopic({ ...topic, [testKey]: { ...test, questions: newQuestions } });
                                }}
                              />
                              <span className="text-[11px] text-stone-500">Оноо:</span>
                              <input
                                type="number"
                                value={q.points}
                                onChange={(e) => {
                                  const newQuestions = [...test.questions];
                                  newQuestions[qIdx].points = Number(e.target.value);
                                  const total = newQuestions.reduce((s, x) => s + (x.points || 0), 0);
                                  setTopic({ ...topic, [testKey]: { ...test, questions: newQuestions, totalPoints: total } });
                                }}
                                className="w-12 p-0.5 border rounded text-center text-xs font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => removeTestQuestion(tNum, qIdx)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {(() => {
                            const setQ = (patch: Partial<TestQuestion>) => {
                              const newQuestions = test.questions.map((x, j) => (j === qIdx ? { ...x, ...patch } : x));
                              setTopic({ ...topic, [testKey]: { ...test, questions: newQuestions } });
                            };
                            const opts = q.options && q.options.length ? q.options : ['', '', '', ''];
                            const letters = ['A', 'B', 'C', 'D'];
                            return (
                              <>
                                <LatexInputWithPreview label="Асуулт:" value={q.question} onChange={(val) => setQ({ question: val })} multiline rows={2} hidePreview hideToolbar />

                                {/* Answer options; the correct one is picked with its letter */}
                                <div className="grid sm:grid-cols-2 gap-2">
                                  {letters.map((L, i) => (
                                    <div key={L} className="flex items-start gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => setQ({ answer: L })}
                                        title="Зөв хариу болгох"
                                        className={`mt-1 w-7 h-7 rounded-full text-xs font-black shrink-0 cursor-pointer border ${
                                          q.answer === L ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-stone-300 text-stone-600 hover:border-emerald-500'
                                        }`}
                                      >
                                        {L}
                                      </button>
                                      <LatexInputWithPreview
                                        className="flex-1 min-w-0"
                                        label=""
                                        value={opts[i] || ''}
                                        onChange={(val) => setQ({ options: opts.map((o, j) => (j === i ? val : o)) })}
                                        hidePreview
                                        hideToolbar
                                      />
                                    </div>
                                  ))}
                                </div>

                                <LatexInputWithPreview label="Бодолт:" value={q.solution || ''} onChange={(val) => setQ({ solution: val || undefined })} multiline rows={2} hidePreview hideToolbar />

                                {/* The question as students see it, with the answer and solution */}
                                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2 text-sm">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Харагдах байдал</div>
                                  <div className="flex gap-2 text-stone-900">
                                    <span className="font-bold shrink-0">{q.number}.</span>
                                    <MathRenderer content={q.question} />
                                  </div>
                                  <div className="grid sm:grid-cols-2 gap-1.5">
                                    {letters.map((L, i) =>
                                      opts[i] ? (
                                        <div key={L} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${q.answer === L ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 bg-white'}`}>
                                          <span className="font-black text-xs text-stone-600">{L})</span>
                                          <MathRenderer content={opts[i]} className="inline" />
                                        </div>
                                      ) : null
                                    )}
                                  </div>
                                  {q.solution && (
                                    <SolutionSteps steps={solutionLines(q.solution)} indent={false} />
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              </div>
              </div>
            </div>
          )}


          {/* 6. INFO TAB */}
          {activeTab === 'info' && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Энэ сэдвийг харуулах ангиуд (Олон анги сонгох боломжтой):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                  {([6, 7, 8, 9, 10, 11, 12] as GradeNumber[]).map((g) => {
                    // It's checked if it's primary grade or in visibleGrades
                    const isPrimary = topic.grade === g;
                    const isVisible = isPrimary || (topic.visibleGrades || []).includes(g);

                    return (
                      <label
                        key={g}
                        className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                          isVisible
                            ? 'bg-amber-100/70 border-amber-400 text-stone-950 font-bold'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                        onClick={() => {
                          const currentGrades = topic.visibleGrades || [topic.grade];
                          let nextGrades: GradeNumber[];

                          if (isVisible) {
                            // If primary and other grades exist, switch primary to next
                            nextGrades = currentGrades.filter((item) => item !== g);
                            if (isPrimary && nextGrades.length > 0) {
                              setTopic({
                                ...topic,
                                grade: nextGrades[0],
                                visibleGrades: nextGrades,
                              });
                              return;
                            }
                          } else {
                            nextGrades = [...currentGrades, g];
                          }

                          if (nextGrades.length === 0) {
                            nextGrades = [g]; // Keep at least one
                          }

                          setTopic({
                            ...topic,
                            visibleGrades: nextGrades,
                          });
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          readOnly
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>{g}-р анги {isPrimary && <span className="text-[10px] text-amber-800 font-normal">(үндсэн)</span>}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Энэ сэдэв сонгогдсон бүх ангийн зүүн цэсэнд автоматаар харагдана.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Үндсэн анги:</label>
                  <select
                    value={topic.grade}
                    onChange={(e) => {
                      const newG = Number(e.target.value) as GradeNumber;
                      const vis = Array.from(new Set([...(topic.visibleGrades || []), newG]));
                      setTopic({ ...topic, grade: newG, visibleGrades: vis });
                    }}
                    className="w-full text-xs p-2 rounded-lg border border-stone-300 font-medium bg-white"
                  >
                    {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                      <option key={g} value={g}>
                        {g}-р анги
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Сэдвийн код:</label>
                  <input
                    type="text"
                    value={topic.code || ''}
                    onChange={(e) => setTopic({ ...topic, code: e.target.value })}
                    placeholder="Жишээ: МАТ-6.1.2"
                    className="w-full text-xs p-2 rounded-lg border border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Сэдвийн нэр:</label>
                <input
                  type="text"
                  value={topic.title}
                  onChange={(e) => setTopic({ ...topic, title: e.target.value })}
                  className="w-full text-xs md:text-sm font-bold p-2 rounded-lg border border-stone-300"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      {historyOpen && (
        <TopicHistoryDialog
          topic={topic}
          saved={JSON.parse(savedRef.current) as TopicPackage}
          onClose={() => setHistoryOpen(false)}
          onApplyJson={(data, part) => {
            const ok = applyContent(data, part, 'edit', 'JSON');
            if (ok) setHistoryOpen(false);
            return ok;
          }}
          onPartDeleted={(part) => {
            // The part's last row was deleted: that part goes from the site
            const t = { ...topic, [part]: part.startsWith('test') ? { ...topic[part as 'test1'], questions: [] } : [] } as TopicPackage;
            setTopic(t);
            persist(t);
            setHistoryOpen(false);
            showStatus('Устгалаа.');
          }}
        />
      )}
    </div>
  );
};
