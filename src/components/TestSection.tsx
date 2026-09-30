import React from 'react';
import { TestPackage, TestQuestion } from '../types';
import { MathRenderer } from './MathRenderer';
import { PrintHeader } from './PrintHeader';
import { Award, Plus, Edit2, Trash2 } from 'lucide-react';

interface TestSectionProps {
  test: TestPackage;
  grade: number;
  topicTitle: string;
  category?: string;
  isFirstPrintedSection?: boolean;
  includeWorkSpace?: boolean;
  teacherVersion?: boolean;
  isEditable?: boolean;
  onEditQuestion?: (question: TestQuestion) => void;
  onDeleteQuestion?: (questionId: string) => void;
  onAddQuestion?: () => void;
}

export const TestSection: React.FC<TestSectionProps> = ({
  test,
  grade,
  topicTitle,
  category,
  isFirstPrintedSection = false,
  includeWorkSpace = true,
  teacherVersion = false,
  isEditable = false,
  onEditQuestion,
  onDeleteQuestion,
  onAddQuestion,
}) => {
  return (
    <section
      className={`mb-10 ${isFirstPrintedSection ? '' : 'page-break-before'}`}
      id={`section-test-${test.testNumber}`}
    >
      {/* Header specifically formatted for A4 test print */}
      <PrintHeader
        grade={grade}
        topicTitle={topicTitle}
        category={category}
        isTest={true}
        testNumber={test.testNumber}
        testTitle={test.title}
        totalPoints={test.totalPoints}
        teacherVersion={teacherVersion}
      />

      {/* Test Meta and Target skills */}
      <div className="mb-4 pb-2 border-b border-stone-300 print:border-stone-500 flex items-center justify-between text-xs md:text-sm text-stone-600 print:text-black">
        <div>
          <span className="font-bold text-stone-800 print:text-black">Шалгах зорилго: </span>
          <span>{test.targetSkills}</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="font-semibold text-stone-800 print:text-black">
            Нийт оноо: <span className="underline font-bold">{test.totalPoints} оноо</span>
          </div>

          {isEditable && onAddQuestion && (
            <button
              type="button"
              onClick={onAddQuestion}
              className="no-print text-xs px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-md flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Асуулт нэмэх</span>
            </button>
          )}
        </div>
      </div>

      {/* Questions list */}
      {(!test.questions || test.questions.length === 0) ? (
        <div className="p-8 text-center border-2 border-dashed border-stone-200 rounded-xl my-3 text-stone-400">
          <p className="text-xs">Энэ сорилд одоогоор асуулт бүртгэгдээгүй байна.</p>
          {isEditable && onAddQuestion && (
            <button
              type="button"
              onClick={onAddQuestion}
              className="mt-2 text-xs text-amber-700 font-bold hover:underline"
            >
              + Асуулт нэмэх
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 print:space-y-3.5">
          {test.questions.map((q, idx) => (
            <div
              key={q.id || q.number || idx}
              className="avoid-break bg-white border border-stone-300 print:border-stone-800 rounded-lg p-3.5 md:p-4 shadow-xs print:shadow-none relative group"
            >
              {/* Question line with points */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-baseline space-x-1.5 flex-1">
                  <span className="font-extrabold text-sm md:text-base text-stone-950 print:text-black">
                    {q.number}.
                  </span>
                  <div className="text-stone-900 print:text-black text-sm md:text-base leading-relaxed">
                    <MathRenderer content={q.question} />
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <span className="text-xs font-bold text-stone-600 print:text-black bg-stone-100 print:bg-stone-200 border border-stone-300 print:border-stone-600 px-2 py-0.5 rounded">
                    [{q.points} оноо]
                  </span>

                  {isEditable && (
                    <div className="no-print flex items-center space-x-1">
                      {onEditQuestion && (
                        <button
                          type="button"
                          onClick={() => onEditQuestion(q)}
                          title="Асуулт засах"
                          className="p-1 text-stone-500 hover:text-amber-800 hover:bg-stone-100 rounded cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteQuestion && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Асуулт ${q.number}-г хасах уу?`)) {
                              onDeleteQuestion(q.id);
                            }
                          }}
                          title="Асуулт устгах"
                          className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Answer / Solution for teacher version */}
              {teacherVersion && (
                <div className="mt-2.5 p-2.5 bg-amber-50 print:bg-stone-100 border border-amber-200 print:border-stone-500 rounded text-xs md:text-sm">
                  <span className="font-bold text-amber-950 print:text-black">Зөв хариу: </span>
                  <span className="font-mono text-emerald-800 print:text-black font-semibold">
                    <MathRenderer content={q.answer} className="inline" />
                  </span>
                  {q.solution && (
                    <div className="mt-1 text-stone-700 print:text-stone-900">
                      <span className="font-semibold">Бодолт: </span>
                      <MathRenderer content={q.solution} className="inline" />
                    </div>
                  )}
                </div>
              )}

              {/* Workspace for students in print and screen if enabled */}
              {includeWorkSpace && !teacherVersion && (
                <div
                  className="workspace-grid mt-2 mb-1 border-t border-b border-stone-200 print:border-stone-400"
                  style={{ height: `${(q.workSpaceLines || 3) * 23}px` }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom quick add button */}
      {isEditable && onAddQuestion && test.questions && test.questions.length > 0 && (
        <div className="no-print mt-3.5 pt-2 flex justify-center">
          <button
            type="button"
            onClick={onAddQuestion}
            className="text-xs px-3.5 py-1.5 bg-stone-100 hover:bg-amber-50 text-stone-700 hover:text-amber-950 border border-stone-300 hover:border-amber-300 rounded-lg font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-600" />
            <span>Шинэ сорилын асуулт нэмэх</span>
          </button>
        </div>
      )}
    </section>
  );
};
