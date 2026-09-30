import React, { useState, useRef, useEffect } from 'react';
import { Search, X, BookOpen, ChevronRight } from 'lucide-react';
import { GradeNumber } from '../types';
import { GRADE_TOPICS_CATALOG } from '../data/initialData';

interface SearchResultItem {
  id: string;
  grade: GradeNumber;
  title: string;
  category: string;
  hasFullPackage: boolean;
}

interface SearchBarProps {
  onSelectResult: (grade: GradeNumber, topicId: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSelectResult }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter topics
  const results: SearchResultItem[] = React.useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const found: SearchResultItem[] = [];
    Object.entries(GRADE_TOPICS_CATALOG).forEach(([gradeStr, topics]) => {
      const grade = Number(gradeStr) as GradeNumber;
      topics.forEach((t) => {
        if (
          t.title.toLowerCase().includes(trimmed) ||
          t.category.toLowerCase().includes(trimmed) ||
          `${grade}-р анги`.includes(trimmed) ||
          `${grade} анги`.includes(trimmed)
        ) {
          found.push({
            id: t.id,
            grade,
            title: t.title,
            category: t.category,
            hasFullPackage: t.hasFullPackage,
          });
        }
      });
    });

    return found;
  }, [query]);

  return (
    <div className="relative w-full max-w-md no-print" ref={dropdownRef}>
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Сэдэв хайх (жишээ: бутархай, тэгшитгэл, хуваагдах...)"
          className="w-full pl-9 pr-8 py-2 bg-white border border-stone-300 rounded-lg text-xs md:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition-all shadow-2xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-stone-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto p-1.5 space-y-1">
          {results.length === 0 ? (
            <div className="py-4 text-center text-xs text-stone-500">
              «{query}» түлхүүр үгээр тохирох сэдэв олдсонгүй.
            </div>
          ) : (
            results.map((res) => (
              <button
                key={`${res.grade}-${res.id}`}
                type="button"
                onClick={() => {
                  onSelectResult(res.grade, res.id);
                  setIsOpen(false);
                  setQuery('');
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-stone-50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs md:text-sm font-semibold text-stone-900 group-hover:text-amber-800">
                    {res.title}
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-stone-500 mt-0.5">
                    <span className="font-bold text-stone-700">{res.grade}-р анги</span>
                    <span>•</span>
                    <span>{res.category}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  {res.hasFullPackage && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-medium">
                      Бүрэн багц
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-amber-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
