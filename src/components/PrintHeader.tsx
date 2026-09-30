import React from 'react';

interface PrintHeaderProps {
  grade: number;
  topicTitle: string;
  category?: string;
  isTest?: boolean;
  testNumber?: number;
  testTitle?: string;
  totalPoints?: number;
  teacherVersion?: boolean;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  grade,
  topicTitle,
  category = 'МАТЕМАТИК',
  isTest = false,
  testNumber,
  testTitle,
  totalPoints,
  teacherVersion = false,
}) => {
  return (
    <header className="mb-5 pb-3 border-b-2 border-stone-800 text-stone-950 font-sans">
      {/* Top row: Subject & Grade & Optional Badge */}
      <div className="flex items-center justify-between text-xs tracking-wider uppercase font-semibold text-stone-600 print:text-black">
        <div className="flex items-center space-x-2">
          <span>{category}</span>
          <span>•</span>
          <span className="font-bold text-stone-900 print:text-black">{grade}-Р АНГИ</span>
        </div>
        <div>
          {teacherVersion ? (
            <span className="px-2 py-0.5 border border-stone-800 bg-stone-100 print:bg-stone-200 text-stone-900 font-bold text-[11px] rounded">
              БАГШИЙН ХУВИЛБАР (ХАРИУТАЙ)
            </span>
          ) : (
            <span className="text-[11px] font-medium text-stone-500 print:text-stone-700">
              {isTest ? (testNumber === 1 ? 'АНХАН' : testNumber === 2 ? 'ДУНД' : 'ГҮНЗГИЙ') : 'СУРГАЛТЫН МАТЕРИАЛ'}
            </span>
          )}
        </div>
      </div>

      {/* Main Title */}
      <div className="mt-1.5 flex items-baseline justify-between">
        <h1 className="text-xl md:text-2xl font-black tracking-tight text-stone-950 uppercase print:text-black">
          {topicTitle}
        </h1>
        {isTest && testTitle && (
          <span className="text-sm font-bold text-stone-700 print:text-black uppercase">
            {testTitle}
          </span>
        )}
      </div>

      {/* Student Meta Fields Line (Only shown on Tests) */}
      {isTest && (
        <div className="mt-3 pt-2.5 border-t border-dashed border-stone-400 print:border-stone-600 flex flex-wrap items-center justify-between gap-y-2 text-xs md:text-sm font-medium">
          <div className="flex items-center space-x-1 min-w-[240px]">
            <span className="text-stone-700 print:text-black font-semibold">Сурагчийн нэр:</span>
            <span className="inline-block border-b border-stone-800 print:border-black w-44 md:w-56 pb-0.5"></span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-stone-700 print:text-black font-semibold">Анги:</span>
            <span className="inline-block border-b border-stone-800 print:border-black w-14 pb-0.5"></span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-stone-700 print:text-black font-semibold">Огноо:</span>
            <span className="inline-block border-b border-stone-800 print:border-black w-24 pb-0.5"></span>
          </div>

          {totalPoints !== undefined && (
            <div className="flex items-center space-x-1 bg-stone-100 print:bg-transparent px-2 py-0.5 border border-stone-400 print:border-black rounded">
              <span className="text-stone-800 print:text-black font-bold">Оноо:</span>
              <span className="inline-block w-8 text-center border-b border-stone-800 print:border-black"></span>
              <span className="text-stone-600 print:text-black">/ {totalPoints}</span>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
