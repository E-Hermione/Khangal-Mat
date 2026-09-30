import React, { useState } from 'react';
import { TopicPackage, GradeNumber, TheoryRule, WorkedExample, PracticeProblem, TestQuestion } from '../types';
import { storageService } from '../services/storageService';
import { MathRenderer } from './MathRenderer';
import { LatexInputWithPreview } from './LatexInputWithPreview';
import { UserVisibilityPanel } from './UserVisibilityPanel';
import {
  X,
  Plus,
  Trash2,
  Save,
  BookOpen,
  Lightbulb,
  PencilLine,
  Award,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface AdminEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTopic: TopicPackage;
  onTopicUpdated: (updatedTopic: TopicPackage) => void;
  onRefreshAllTopics: () => void;
  onLogout?: () => void;
}

export const AdminEditorModal: React.FC<AdminEditorModalProps> = ({
  isOpen,
  onClose,
  activeTopic,
  onTopicUpdated,
  onRefreshAllTopics,
  onLogout,
}) => {
  const [topic, setTopic] = useState<TopicPackage>({ ...activeTopic });
  const [activeTab, setActiveTab] = useState<'info' | 'theory' | 'examples' | 'practice' | 'tests' | 'visibility'>('theory');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync state when activeTopic changes
  React.useEffect(() => {
    setTopic({ ...activeTopic });
  }, [activeTopic]);

  if (!isOpen) return null;

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSave = () => {
    storageService.saveTopic(topic);
    onTopicUpdated(topic);
    onRefreshAllTopics();
    showStatus('Амжилттай хадгалагдлаа!');
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
  };

  const removeTheoryRule = (index: number) => {
    const updated = [...(topic.theory || [])];
    updated.splice(index, 1);
    setTopic({ ...topic, theory: updated });
  };

  const addWorkedExample = () => {
    const nextNum = (topic.examples?.length || 0) + 1;
    const newEx: WorkedExample = {
      id: `ex-${Date.now()}`,
      number: nextNum,
      title: `Жишээ ${nextNum}`,
      problem: 'Бодлогын нөхцөлийг бичнэ үү ($...$).',
      solutionSteps: ['Алхам 1: ...', 'Алхам 2: ...'],
      answer: 'Хариу',
    };
    setTopic({ ...topic, examples: [...(topic.examples || []), newEx] });
  };

  const removeWorkedExample = (index: number) => {
    const updated = [...(topic.examples || [])];
    updated.splice(index, 1);
    updated.forEach((item, idx) => {
      item.number = idx + 1;
    });
    setTopic({ ...topic, examples: updated });
  };

  const addPracticeProblem = () => {
    const nextNum = (topic.practice?.length || 0) + 1;
    const newPr: PracticeProblem = {
      id: `pr-${Date.now()}`,
      number: nextNum,
      question: 'Шинэ дасгал бодлого ($x + 1 = 2$)',
      difficulty: 'medium',
      answer: '$x = 1$',
      solution: 'Бодолтын тайлбар',
      workSpaceLines: 4,
    };
    setTopic({ ...topic, practice: [...(topic.practice || []), newPr] });
  };

  const removePracticeProblem = (index: number) => {
    const updated = [...(topic.practice || [])];
    updated.splice(index, 1);
    updated.forEach((item, idx) => {
      item.number = idx + 1;
    });
    setTopic({ ...topic, practice: updated });
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
      workSpaceLines: 3,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-900/60 backdrop-blur-xs overflow-hidden">
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
            <button
              type="button"
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Хадгалах</span>
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
            onClick={() => setActiveTab('visibility')}
            className={`shrink-0 whitespace-nowrap py-3 px-3.5 border-b-2 transition-colors flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'visibility'
                ? 'border-amber-600 text-amber-900 bg-white'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Хэрэглэгчийн харагдах эрх</span>
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
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-xs text-stone-500 font-medium">
                  LaTeX математик кодыг бичихэд бодит үр дүнг шууд урьдчилан харуулна.
                </span>
                <button
                  type="button"
                  onClick={addTheoryRule}
                  className="text-xs px-3 py-1.5 bg-stone-900 hover:bg-black text-white rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Шинэ дүрэм нэмэх</span>
                </button>
              </div>

              <div className="space-y-4">
                {topic.theory.map((rule, idx) => (
                  <div key={rule.id || idx} className="p-4 border border-stone-200 rounded-xl bg-stone-50/60 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
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

                    <LatexInputWithPreview
                      label="Дүрмийн тодорхойлолт текст:"
                      value={rule.ruleText}
                      onChange={(val) => {
                        const updated = [...topic.theory];
                        updated[idx].ruleText = val;
                        setTopic({ ...topic, theory: updated });
                      }}
                      multiline
                      rows={2}
                    />

                    <LatexInputWithPreview
                      label="Үндсэн томьёо (LaTeX):"
                      value={rule.formula || ''}
                      onChange={(val) => {
                        const updated = [...topic.theory];
                        updated[idx].formula = val;
                        setTopic({ ...topic, theory: updated });
                      }}
                      placeholder="Жишээ: a \\vdots 2"
                      previewBlock
                    />

                    <LatexInputWithPreview
                      label="Тайлбар / Санамж:"
                      value={rule.note || ''}
                      onChange={(val) => {
                        const updated = [...topic.theory];
                        updated[idx].note = val;
                        setTopic({ ...topic, theory: updated });
                      }}
                      placeholder="Тайлбар..."
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. EXAMPLES TAB */}
          {activeTab === 'examples' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-xs text-stone-500 font-medium">
                  Жишээ бодлогын нөхцөл, алхамчилсан бодолт, хариуг удирдах.
                </span>
                <button
                  type="button"
                  onClick={addWorkedExample}
                  className="text-xs px-3 py-1.5 bg-stone-900 hover:bg-black text-white rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Шинэ жишээ нэмэх</span>
                </button>
              </div>

              <div className="space-y-4">
                {topic.examples.map((ex, idx) => (
                  <div key={ex.id || idx} className="p-4 border border-stone-200 rounded-xl bg-stone-50/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-stone-900">
                        Жишээ {ex.number}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeWorkedExample(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                        title="Устгах"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <LatexInputWithPreview
                      label="Бодлогын нөхцөл:"
                      value={ex.problem}
                      onChange={(val) => {
                        const updated = [...topic.examples];
                        updated[idx].problem = val;
                        setTopic({ ...topic, examples: updated });
                      }}
                      multiline
                      rows={2}
                    />

                    <LatexInputWithPreview
                      label="Бодолтын алхмууд (Мөр бүр 1 алхам болно):"
                      value={ex.solutionSteps.join('\n')}
                      onChange={(val) => {
                        const updated = [...topic.examples];
                        updated[idx].solutionSteps = val.split('\n');
                        setTopic({ ...topic, examples: updated });
                      }}
                      multiline
                      rows={3}
                    />

                    <LatexInputWithPreview
                      label="Эцсийн хариу:"
                      value={ex.answer}
                      onChange={(val) => {
                        const updated = [...topic.examples];
                        updated[idx].answer = val;
                        setTopic({ ...topic, examples: updated });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. PRACTICE TAB */}
          {activeTab === 'practice' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-xs text-stone-500 font-medium">
                  Бие даах дасгал (Хялбар, Дунд, Ахисан түвшин)
                </span>
                <button
                  type="button"
                  onClick={addPracticeProblem}
                  className="text-xs px-3 py-1.5 bg-stone-900 hover:bg-black text-white rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Шинэ дасгал нэмэх</span>
                </button>
              </div>

              <div className="space-y-4">
                {topic.practice.map((item, idx) => (
                  <div key={item.id || idx} className="p-4 border border-stone-200 rounded-xl bg-stone-50/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-stone-900">
                        Дасгал {item.number}
                      </span>
                      <div className="flex items-center space-x-2">
                        <select
                          value={item.difficulty}
                          onChange={(e) => {
                            const updated = [...topic.practice];
                            updated[idx].difficulty = e.target.value as any;
                            setTopic({ ...topic, practice: updated });
                          }}
                          className="text-xs p-1 rounded border border-stone-300 font-bold bg-white"
                        >
                          <option value="easy">Хялбар</option>
                          <option value="medium">Дунд</option>
                          <option value="hard">Ахисан</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removePracticeProblem(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <LatexInputWithPreview
                      label="Бодлогын нөхцөл:"
                      value={item.question}
                      onChange={(val) => {
                        const updated = [...topic.practice];
                        updated[idx].question = val;
                        setTopic({ ...topic, practice: updated });
                      }}
                      multiline
                      rows={2}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <LatexInputWithPreview
                        label="Зөв хариу:"
                        value={item.answer}
                        onChange={(val) => {
                          const updated = [...topic.practice];
                          updated[idx].answer = val;
                          setTopic({ ...topic, practice: updated });
                        }}
                      />
                      <LatexInputWithPreview
                        label="Зөвлөмж / Санамж:"
                        value={item.hint || ''}
                        onChange={(val) => {
                          const updated = [...topic.practice];
                          updated[idx].hint = val;
                          setTopic({ ...topic, practice: updated });
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. TESTS TAB */}
          {activeTab === 'tests' && (
            <div className="space-y-6">
              {([1, 2, 3] as const).map((tNum) => {
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

                          <LatexInputWithPreview
                            label="Асуулт:"
                            value={q.question}
                            onChange={(val) => {
                              const newQuestions = [...test.questions];
                              newQuestions[qIdx].question = val;
                              setTopic({ ...topic, [testKey]: { ...test, questions: newQuestions } });
                            }}
                            multiline
                            rows={2}
                          />

                          <LatexInputWithPreview
                            label="Зөв хариу:"
                            value={q.answer}
                            onChange={(val) => {
                              const newQuestions = [...test.questions];
                              newQuestions[qIdx].answer = val;
                              setTopic({ ...topic, [testKey]: { ...test, questions: newQuestions } });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 5. VISIBILITY TAB (Moved from main screen into Admin Management) */}
          {activeTab === 'visibility' && (
            <div className="space-y-4 max-w-3xl">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <h3 className="font-bold text-sm text-stone-900 mb-1">
                  Хэрэглэгчдэд харагдах эрхийн удирдлага
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Хүсэлтээр орсон энгийн хэрэглэгчдэд «{topic.title}» хичээлээс ямар хэсгүүд харагдахыг доорх сонголтуудаар тохируулна. Энэ тохиргоо үндсэн дэлгэцэнд давхардахгүй, зөвхөн энэ удирдлагын хэсэгт байрлана.
                </p>
              </div>

              <UserVisibilityPanel
                topicId={topic.id}
                topicTitle={topic.title}
                onPreviewAsUser={onClose}
              />
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
    </div>
  );
};
