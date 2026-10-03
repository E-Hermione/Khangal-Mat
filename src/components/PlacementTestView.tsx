import React, { useState } from 'react';
import { ClipboardCheck, Send } from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { buildPlacementTest, gradePlacement, savePlacementResult } from '../services/learningPlan';
import { GradeNumber } from '../types';
import { getQuestionOptions } from '../utils/examGrading';


const NoGuessingNotice: React.FC = () => (
  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-left text-sm text-amber-950 space-y-1" data-testid="no-guessing">
    <div className="font-black">⚠️ Таамаглаж бүү сонгоорой!</div>
    <div>
      Мэдэхгүй бодлогоо <b>хоосон үлдээгээрэй</b>. Тааж сонгосон хариулт зөв таарвал тухайн сэдэв таны төлөвлөгөөнд орохгүй
      бөгөөд та мэдэхгүй сэдвээ алгасах болно. Сонголтоо дахин дарж арилгаж болно.
    </div>
  </div>
);

/** The placement test a new student takes before anything else, drawn at random from the topics' tests. */
export const PlacementTestView: React.FC<{ uid: string; grade: GradeNumber }> = ({ uid, grade }) => {
  // Drawn once when the page opens
  const [test] = useState(() => buildPlacementTest(grade));
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!test) return null;
  const answered = test.questions.filter((q) => answers[q.question.id]).length;

  const handleSubmit = async () => {
    const left = test.questions.length - answered;
    if (!window.confirm(left > 0 ? `${left} бодлого хоосон үлдсэн байна. Шалгалтыг дуусгах уу?` : 'Шалгалтыг дуусгах уу?')) return;
    setSaving(true);
    setError(null);
    try {
      // The plan page takes over once the result is saved
      await savePlacementResult(uid, gradePlacement(test, answers));
    } catch (err) {
      console.error(err);
      setError('Хадгалж чадсангүй. Интернэт холболтоо шалгаад дахин илгээнэ үү.');
      setSaving(false);
    }
  };

  if (!started) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <ClipboardCheck className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black text-stone-900">Түвшин тогтоох шалгалт</h1>
        <p className="text-sm text-stone-600 leading-relaxed">
          Эхлээд {test.grade}-р ангийн түвшин тогтоох шалгалт өгнө үү ({test.questions.length} бодлого). Таны алдсан
          бодлогууд дээр үндэслэн танд зориулсан сургалтын төлөвлөгөө гарна. Дахин өгвөл өмнөх дүн шинэ дүнгээр солигдоно.
        </p>
        <NoGuessingNotice />
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white text-sm font-bold cursor-pointer"
        >
          Шалгалт эхлэх
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4" data-testid="placement-test">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-stone-900">Түвшин тогтоох шалгалт</h1>
        <span className="text-xs font-bold text-stone-500">
          {answered}/{test.questions.length} хариулсан
        </span>
      </div>
      <NoGuessingNotice />

      {test.questions.map(({ question: q }, i) => (
        <div key={q.id} className="bg-white rounded-xl border border-stone-200 p-5 space-y-3">
          <div className="flex gap-2 text-sm text-stone-900">
            <span className="font-black shrink-0">{i + 1}.</span>
            <MathRenderer content={q.question} />
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {getQuestionOptions(q).map(({ letter, text }) => {
              const chosen = answers[q.id] === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  // Clicking the chosen option again clears it (unknown questions stay blank)
                  onClick={() =>
                    setAnswers((prev) => {
                      const next = { ...prev };
                      if (next[q.id] === letter) delete next[q.id];
                      else next[q.id] = letter;
                      return next;
                    })
                  }
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm cursor-pointer transition-colors ${
                    chosen ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-400' : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      chosen ? 'bg-amber-500 text-stone-950' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {letter}
                  </span>
                  <MathRenderer content={text} />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {error && <div className="text-sm text-red-700">{error}</div>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
      >
        <Send className="w-4 h-4 text-amber-400" />
        {saving ? 'Илгээж байна…' : 'Шалгалт дуусгах'}
      </button>
    </div>
  );
};
