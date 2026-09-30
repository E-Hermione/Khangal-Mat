import React, { useState } from 'react';
import { TheoryRule, WorkedExample, PracticeProblem, TestQuestion, DifficultyLevel } from '../types';
import { LatexInputWithPreview } from './LatexInputWithPreview';
import { X, Save, Trash2, Plus, HelpCircle } from 'lucide-react';

export type ItemEditorType =
  | { type: 'theory'; item: TheoryRule; isNew?: boolean }
  | { type: 'example'; item: WorkedExample; isNew?: boolean }
  | { type: 'practice'; item: PracticeProblem; isNew?: boolean }
  | { type: 'testQuestion'; testNumber: 1 | 2 | 3; item: TestQuestion; isNew?: boolean };

interface ItemEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: ItemEditorType | null;
  onSaveTheory: (rule: TheoryRule, isNew?: boolean) => void;
  onSaveExample: (example: WorkedExample, isNew?: boolean) => void;
  onSavePractice: (practice: PracticeProblem, isNew?: boolean) => void;
  onSaveTestQuestion: (testNumber: 1 | 2 | 3, question: TestQuestion, isNew?: boolean) => void;
  onDelete?: (target: ItemEditorType) => void;
}

export const ItemEditorModal: React.FC<ItemEditorModalProps> = ({
  isOpen,
  onClose,
  target,
  onSaveTheory,
  onSaveExample,
  onSavePractice,
  onSaveTestQuestion,
  onDelete,
}) => {
  if (!isOpen || !target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {target.type === 'theory' && (
          <TheoryEditor
            initial={target.item}
            isNew={target.isNew}
            onSave={(val) => {
              onSaveTheory(val, target.isNew);
              onClose();
            }}
            onDelete={onDelete ? () => onDelete(target) : undefined}
            onClose={onClose}
          />
        )}

        {target.type === 'example' && (
          <ExampleEditor
            initial={target.item}
            isNew={target.isNew}
            onSave={(val) => {
              onSaveExample(val, target.isNew);
              onClose();
            }}
            onDelete={onDelete ? () => onDelete(target) : undefined}
            onClose={onClose}
          />
        )}

        {target.type === 'practice' && (
          <PracticeEditor
            initial={target.item}
            isNew={target.isNew}
            onSave={(val) => {
              onSavePractice(val, target.isNew);
              onClose();
            }}
            onDelete={onDelete ? () => onDelete(target) : undefined}
            onClose={onClose}
          />
        )}

        {target.type === 'testQuestion' && (
          <TestQuestionEditor
            testNumber={target.testNumber}
            initial={target.item}
            isNew={target.isNew}
            onSave={(val) => {
              onSaveTestQuestion(target.testNumber, val, target.isNew);
              onClose();
            }}
            onDelete={onDelete ? () => onDelete(target) : undefined}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
};

/* --- 1. Theory Editor --- */
function TheoryEditor({
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  initial: TheoryRule;
  isNew?: boolean;
  onSave: (rule: TheoryRule) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [rule, setRule] = useState<TheoryRule>({ ...initial });

  return (
    <>
      <div className="shrink-0 p-4 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-white">
        <h3 className="font-black text-sm md:text-base flex items-center space-x-2">
          <span>{isNew ? 'Шинэ онол, дүрэм нэмэх' : 'Онол, дүрэм засах'}</span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Дүрмийн гарчиг:</label>
            <input
              type="text"
              value={rule.title}
              onChange={(e) => setRule({ ...rule, title: e.target.value })}
              placeholder="Жишээ: Виетийн теорем"
              className="w-full text-xs md:text-sm p-2 bg-white border border-stone-300 rounded-lg font-bold"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Шошго (Badge):</label>
            <input
              type="text"
              value={rule.badge || ''}
              onChange={(e) => setRule({ ...rule, badge: e.target.value })}
              placeholder="Жишээ: Дүрэм, Чанар, Теорем"
              className="w-full text-xs md:text-sm p-2 bg-white border border-stone-300 rounded-lg"
            />
          </div>
        </div>

        <LatexInputWithPreview
          label="Онолын тодорхойлолт, тайлбар бичвэр:"
          value={rule.ruleText}
          onChange={(val) => setRule({ ...rule, ruleText: val })}
          multiline
          rows={3}
          placeholder="Онолын тодорхойлолтоо бичнэ үү. Томьёог $...$ хаалтанд бичиж болно."
        />

        <LatexInputWithPreview
          label="Үндсэн LaTeX томьёо (Formula):"
          value={rule.formula || ''}
          onChange={(val) => setRule({ ...rule, formula: val })}
          placeholder="Жишээ: x_1 + x_2 = -\\frac{b}{a}, \\quad x_1 x_2 = \\frac{c}{a}"
          previewBlock
          helpText="Формула блок болгон төвд том харагдана"
        />

        <LatexInputWithPreview
          label="Нэмэлт тайлбар, санамж (Note):"
          value={rule.note || ''}
          onChange={(val) => setRule({ ...rule, note: val })}
          placeholder="Жишээ: Хэрэв D < 0 бол бодит шийдгүй."
        />
      </div>

      <div className="shrink-0 p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
        {!isNew && onDelete ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Энэ онолын дүрмийг устгах уу?')) {
                onDelete();
                onClose();
              }
            }}
            className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Устгах</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-lg"
          >
            Цуцлах
          </button>
          <button
            type="button"
            onClick={() => onSave(rule)}
            className="px-4 py-1.5 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center space-x-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Хадгалах</span>
          </button>
        </div>
      </div>
    </>
  );
}

/* --- 2. Example Editor --- */
function ExampleEditor({
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  initial: WorkedExample;
  isNew?: boolean;
  onSave: (example: WorkedExample) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [example, setExample] = useState<WorkedExample>({ ...initial });
  const [stepsText, setStepsText] = useState(initial.solutionSteps?.join('\n') || '');

  const handleSave = () => {
    const steps = stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({
      ...example,
      solutionSteps: steps.length > 0 ? steps : ['Шинжилгээ хийж бодолтыг гүйцэтгэнэ.'],
    });
  };

  return (
    <>
      <div className="shrink-0 p-4 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-white">
        <h3 className="font-black text-sm md:text-base">
          {isNew ? 'Шинэ жишээ бодлого нэмэх' : `Жишээ ${example.number} засах`}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Дугаар:</label>
            <input
              type="number"
              value={example.number}
              onChange={(e) => setExample({ ...example, number: Number(e.target.value) })}
              className="w-full text-xs p-2 bg-white border border-stone-300 rounded-lg font-bold"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-stone-700 block mb-1">Гарчиг / Сэдэв (сонголтоор):</label>
            <input
              type="text"
              value={example.title || ''}
              onChange={(e) => setExample({ ...example, title: e.target.value })}
              placeholder="Жишээ: Квадрат тэгшитгэл бодох"
              className="w-full text-xs p-2 bg-white border border-stone-300 rounded-lg"
            />
          </div>
        </div>

        <LatexInputWithPreview
          label="Бодлогын нөхцөл:"
          value={example.problem}
          onChange={(val) => setExample({ ...example, problem: val })}
          multiline
          rows={3}
          placeholder="Жишээ: $2x^2 - 5x + 2 = 0$ тэгшитгэлийн язгууруудыг ол."
        />

        <LatexInputWithPreview
          label="Бодолтын алхмууд (Мөр тус бүрт 1 алхам бичнэ):"
          value={stepsText}
          onChange={(val) => setStepsText(val)}
          multiline
          rows={4}
          placeholder="Алхам 1: Коэффициентүүдийг тодорхойлно: $a=2, b=-5, c=2$&#10;Алхам 2: $D = b^2 - 4ac = 25 - 16 = 9$&#10;Алхам 3: $x_{1,2} = \\frac{5 \\pm 3}{4}$"
          helpText="Мөр шилжүүлэх бүрт алхам болно"
        />

        <LatexInputWithPreview
          label="Эцсийн хариу:"
          value={example.answer}
          onChange={(val) => setExample({ ...example, answer: val })}
          placeholder="Жишээ: $x_1 = 2, \\quad x_2 = \\frac{1}{2}$"
        />
      </div>

      <div className="shrink-0 p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
        {!isNew && onDelete ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Энэ жишээг устгах уу?')) {
                onDelete();
                onClose();
              }
            }}
            className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Устгах</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-lg"
          >
            Цуцлах
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center space-x-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Хадгалах</span>
          </button>
        </div>
      </div>
    </>
  );
}

/* --- 3. Practice Editor --- */
function PracticeEditor({
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  initial: PracticeProblem;
  isNew?: boolean;
  onSave: (practice: PracticeProblem) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [practice, setPractice] = useState<PracticeProblem>({ ...initial });

  return (
    <>
      <div className="shrink-0 p-4 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-white">
        <h3 className="font-black text-sm md:text-base">
          {isNew ? 'Шинэ бие даах дасгал нэмэх' : `Дасгал ${practice.number} засах`}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Дасгалын дугаар:</label>
            <input
              type="number"
              value={practice.number}
              onChange={(e) => setPractice({ ...practice, number: Number(e.target.value) })}
              className="w-full text-xs p-2 bg-white border border-stone-300 rounded-lg font-bold"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Хүндрэлийн түвшин:</label>
            <select
              value={practice.difficulty}
              onChange={(e) => setPractice({ ...practice, difficulty: e.target.value as DifficultyLevel })}
              className="w-full text-xs p-2 bg-white border border-stone-300 rounded-lg font-bold"
            >
              <option value="easy">Хялбар түвшин</option>
              <option value="medium">Дунд түвшин</option>
              <option value="hard">Ахисан түвшин</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Зай (Мөрний тоо):</label>
            <input
              type="number"
              min={2}
              max={15}
              value={practice.workSpaceLines || 4}
              onChange={(e) => setPractice({ ...practice, workSpaceLines: Number(e.target.value) })}
              className="w-full text-xs p-2 bg-white border border-stone-300 rounded-lg"
            />
          </div>
        </div>

        <LatexInputWithPreview
          label="Дасгал бодлогын нөхцөл:"
          value={practice.question}
          onChange={(val) => setPractice({ ...practice, question: val })}
          multiline
          rows={3}
          placeholder="Жишээ: $x^2 - 7x + 12 = 0$ тэгшитгэлийг бод."
        />

        <LatexInputWithPreview
          label="Зөвлөмж / Сануулга (Hint - сонголтоор):"
          value={practice.hint || ''}
          onChange={(val) => setPractice({ ...practice, hint: val })}
          placeholder="Жишээ: Үржигдэхүүн болгон задалж бодно уу."
        />

        <LatexInputWithPreview
          label="Зөв хариу:"
          value={practice.answer}
          onChange={(val) => setPractice({ ...practice, answer: val })}
          placeholder="Жишээ: $x_1 = 3, \\quad x_2 = 4$"
        />

        <LatexInputWithPreview
          label="Дэлгэрэнгүй бодолт / Шалгах заавар (Solution - сонголтоор):"
          value={practice.solution || ''}
          onChange={(val) => setPractice({ ...practice, solution: val })}
          multiline
          rows={3}
          placeholder="Багшийн хувилбар эсвэл шалгах товч бодолт..."
        />
      </div>

      <div className="shrink-0 p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
        {!isNew && onDelete ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Энэ дасгалыг устгах уу?')) {
                onDelete();
                onClose();
              }
            }}
            className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Устгах</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-lg"
          >
            Цуцлах
          </button>
          <button
            type="button"
            onClick={() => onSave(practice)}
            className="px-4 py-1.5 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center space-x-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Хадгалах</span>
          </button>
        </div>
      </div>
    </>
  );
}

/* --- 4. Test Question Editor --- */
function TestQuestionEditor({
  testNumber,
  initial,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  testNumber: 1 | 2 | 3;
  initial: TestQuestion;
  isNew?: boolean;
  onSave: (question: TestQuestion) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState<TestQuestion>({ ...initial });
  const testNames = { 1: 'Анхан шатны сорил', 2: 'Дунд шатны сорил', 3: 'Гүнзгий түвшний сорил' };

  return (
    <>
      <div className="shrink-0 p-4 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-white">
        <div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
            {testNames[testNumber]}
          </span>
          <h3 className="font-black text-sm md:text-base">
            {isNew ? 'Шинэ сорилын асуулт нэмэх' : `Асуулт ${question.number} засах`}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Асуултын дугаар:</label>
            <input
              type="number"
              value={question.number}
              onChange={(e) => setQuestion({ ...question, number: Number(e.target.value) })}
              className="w-full text-xs p-2 bg-white border border-stone-300 rounded-lg font-bold"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Оноо (Points):</label>
            <input
              type="number"
              min={1}
              max={100}
              value={question.points}
              onChange={(e) => setQuestion({ ...question, points: Number(e.target.value) })}
              className="w-full text-xs p-2 bg-white border border-stone-300 rounded-lg font-bold text-amber-900"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-700 block mb-1">Зай (Мөрний тоо):</label>
            <input
              type="number"
              min={2}
              max={15}
              value={question.workSpaceLines || 3}
              onChange={(e) => setQuestion({ ...question, workSpaceLines: Number(e.target.value) })}
              className="w-full text-xs p-2 bg-white border border-stone-300 rounded-lg"
            />
          </div>
        </div>

        <LatexInputWithPreview
          label="Сорилын асуулт / Даалгаврын нөхцөл:"
          value={question.question}
          onChange={(val) => setQuestion({ ...question, question: val })}
          multiline
          rows={3}
          placeholder="Жишээ: Дараах функцийн тодорхойлогдох мужийг ол: $f(x) = \\sqrt{x^2 - 4}$"
        />

        <LatexInputWithPreview
          label="Зөв хариу:"
          value={question.answer}
          onChange={(val) => setQuestion({ ...question, answer: val })}
          placeholder="Жишээ: $(-\\infty, -2] \\cup [2, +\\infty)$"
        />

        <LatexInputWithPreview
          label="Дэлгэрэнгүй бодолт (Solution - сонголтоор):"
          value={question.solution || ''}
          onChange={(val) => setQuestion({ ...question, solution: val })}
          multiline
          rows={3}
          placeholder="Багшийн хувилбарт хэвлэгдэх бодолт..."
        />
      </div>

      <div className="shrink-0 p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
        {!isNew && onDelete ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Энэ асуултыг сорилоос хасах уу?')) {
                onDelete();
                onClose();
              }
            }}
            className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Устгах</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-200 rounded-lg"
          >
            Цуцлах
          </button>
          <button
            type="button"
            onClick={() => onSave(question)}
            className="px-4 py-1.5 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center space-x-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Хадгалах</span>
          </button>
        </div>
      </div>
    </>
  );
}
