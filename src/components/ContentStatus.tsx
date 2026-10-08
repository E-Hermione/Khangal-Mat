import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Circle, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { cloud } from '../services/cloud';
import { TestPackage, TopicPackage } from '../types';

// A topic is complete with at least this many of each
const TEST_QUESTIONS = 15;
const MIN_EXAMPLES = 10;
const MIN_PRACTICE = 15;

const short = (have: number, need: number) => (have < need ? [`${need - have} дутуу`] : []);

interface Part {
  key: string;
  label: string;
  count: number;
  // What the automatic check finds missing in this part, empty when nothing is
  problems: string[];
}

const blank = (s?: string) => !s || !s.trim();

function testPart(key: string, label: string, test?: TestPackage): Part {
  const qs = test?.questions || [];
  const problems: string[] = [];
  if (qs.length < TEST_QUESTIONS) problems.push(`${TEST_QUESTIONS - qs.length} асуулт дутуу`);
  const noAnswer = qs.filter((q) => blank(q.answer) && blank(q.answerHash)).length;
  if (noAnswer) problems.push(`${noAnswer} хариугүй`);
  const noSolution = qs.filter((q) => blank(q.solution)).length;
  if (noSolution) problems.push(`${noSolution} бодолтгүй`);
  return { key, label, count: qs.length, problems };
}

function partsOf(t: TopicPackage): Part[] {
  const theory = t.theory || [];
  const examples = t.examples || [];
  const practice = t.practice || [];
  const exNoSolution = examples.filter((e) => blank(e.solution)).length;
  const prNoSolution = practice.filter((p) => blank(p.solution)).length;
  return [
    { key: 'theory', label: 'Онол', count: theory.length, problems: theory.length ? [] : ['хоосон'] },
    {
      key: 'examples',
      label: 'Жишээ',
      count: examples.length,
      problems: [...short(examples.length, MIN_EXAMPLES), ...(exNoSolution ? [`${exNoSolution} бодолтгүй`] : [])],
    },
    {
      key: 'practice',
      label: 'Дасгал',
      count: practice.length,
      problems: [...short(practice.length, MIN_PRACTICE), ...(prNoSolution ? [`${prNoSolution} бодолтгүй`] : [])],
    },
    testPart('test1', 'Сорил 1', t.test1),
    testPart('test2', 'Сорил 2', t.test2),
    testPart('test3', 'Сорил 3', t.test3),
  ];
}

interface Node {
  topic: TopicPackage;
  parts: Part[];
  children: Node[];
}

// Which groups are open is remembered on this device only
const OPEN_KEY = 'contentStatusOpen';
const readOpen = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) || '[]');
  } catch {
    return [];
  }
};

/**
 * The general view's home page: the topics grade by grade and chapter by chapter, each opening into
 * its parts. The admin checks a part once they have looked it over; checked parts (and topics and
 * chapters with everything checked) are hidden until "show checked" is on.
 */
const ContentStatus: React.FC<{ topics: TopicPackage[]; onOpenTopic: (topicId: string) => void }> = ({
  topics,
  onOpenTopic,
}) => {
  const [showChecked, setShowChecked] = useState(false);
  const [open, setOpen] = useState<Set<string>>(() => new Set(readOpen()));
  const [checks, setChecks] = useState<Record<string, string[]>>(() => cloud.getAppSettings().contentChecks || {});

  useEffect(() => {
    const refresh = () => setChecks(cloud.getAppSettings().contentChecks || {});
    window.addEventListener('app-settings-updated', refresh);
    return () => window.removeEventListener('app-settings-updated', refresh);
  }, []);

  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify([...next]));
      } catch {
        // not remembered, still works
      }
      return next;
    });

  const isChecked = (topicId: string, part: string) => (checks[topicId] || []).includes(part);
  const toggleCheck = (topicId: string, part: string) => {
    const now = checks[topicId] || [];
    const list = now.includes(part) ? now.filter((p) => p !== part) : [...now, part];
    const next = { ...checks, [topicId]: list };
    if (!list.length) delete next[topicId];
    setChecks(next);
    cloud.setAppSettings({ contentChecks: next });
  };

  // grade -> chapter -> topics (subtopics under their parent), in the topic list's order
  const tree = useMemo(() => {
    const order = cloud.getAppSettings().topicOrder || [];
    const pos = (t: TopicPackage) => {
      const i = order.indexOf(t.id);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    const sorted = [...topics].sort((a, b) => pos(a) - pos(b));
    const ids = new Set(topics.map((t) => t.id));
    const node = (t: TopicPackage): Node => ({
      topic: t,
      parts: partsOf(t),
      children: sorted.filter((c) => c.parentId === t.id).map(node),
    });
    const roots = sorted.filter((t) => !t.parentId || !ids.has(t.parentId));
    const grades = [...new Set(roots.map((t) => t.grade))].sort((a, b) => a - b);
    return grades.map((grade) => {
      const inGrade = roots.filter((t) => t.grade === grade);
      const chapters = [...new Set(inGrade.map((t) => t.category?.trim() || 'Бусад сэдэв'))];
      return {
        grade,
        chapters: chapters.map((name) => ({
          name,
          nodes: inGrade.filter((t) => (t.category?.trim() || 'Бусад сэдэв') === name).map(node),
        })),
      };
    });
  }, [topics]);

  // A topic with subtopics holds its lesson in them; otherwise its own six parts count
  const ownParts = (n: Node) => (n.children.length ? [] : n.parts);
  const tally = (n: Node): [number, number] => {
    const own = ownParts(n);
    let done = own.filter((p) => isChecked(n.topic.id, p.key)).length;
    let all = own.length;
    for (const c of n.children) {
      const [d, a] = tally(c);
      done += d;
      all += a;
    }
    return [done, all];
  };
  const hasProblems = (n: Node): boolean =>
    ownParts(n).some((p) => p.problems.length > 0 && !isChecked(n.topic.id, p.key)) || n.children.some(hasProblems);
  const isDone = (n: Node) => {
    const [d, a] = tally(n);
    return a > 0 && d === a;
  };
  const sumTally = (nodes: Node[]) =>
    nodes.reduce<[number, number]>(
      (acc, n) => {
        const [d, a] = tally(n);
        return [acc[0] + d, acc[1] + a];
      },
      [0, 0]
    );

  const allNodes = tree.flatMap((g) => g.chapters.flatMap((c) => c.nodes));
  const [doneParts, allParts] = sumTally(allNodes);

  const Progress: React.FC<{ done: number; all: number }> = ({ done, all }) => (
    <span
      className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md ${
        all > 0 && done === all ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
      }`}
    >
      {done}/{all}
    </span>
  );

  const Toggle: React.FC<{ id: string }> = ({ id }) =>
    open.has(id) ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />;

  const renderNode = (n: Node, depth: number): React.ReactNode => {
    if (!showChecked && isDone(n)) return null;
    const id = `t:${n.topic.id}`;
    const [done, all] = tally(n);
    const parts = ownParts(n).filter((p) => showChecked || !isChecked(n.topic.id, p.key));
    return (
      <div key={n.topic.id} className={depth ? 'ml-5 border-l border-stone-200 pl-2' : ''}>
        <div className="flex items-center gap-2 py-1.5">
          <button
            type="button"
            onClick={() => toggleOpen(id)}
            className="flex items-center gap-2 min-w-0 text-left text-sm font-bold text-stone-900 cursor-pointer"
          >
            <Toggle id={id} />
            {isDone(n) ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="w-4 h-4 shrink-0 text-stone-300" />
            )}
            <span className="truncate">{n.topic.title}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenTopic(n.topic.id)}
            title="Сэдвийг нээх"
            className="p-1 rounded text-stone-400 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <span className="flex-1" />
          {hasProblems(n) && (
            <span className="shrink-0 text-[11px] font-bold text-amber-700">дутуу бий</span>
          )}
          <Progress done={done} all={all} />
        </div>
        {open.has(id) && (
          <div className="ml-6 mb-2">
            {parts.map((p) => {
              const checked = isChecked(n.topic.id, p.key);
              return (
                <label
                  key={p.key}
                  className={`flex items-center gap-3 px-2 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-stone-50 ${
                    checked ? 'text-stone-400' : 'text-stone-800'
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleCheck(n.topic.id, p.key)} />
                  <span className="w-16 font-bold">{p.label}</span>
                  <span className="w-8 text-right tabular-nums">{p.count}</span>
                  {p.problems.length > 0 ? (
                    <span className="text-amber-700">{p.problems.join(', ')}</span>
                  ) : (
                    <span className="text-emerald-700">тоо бүрэн</span>
                  )}
                </label>
              );
            })}
            {n.children.map((c) => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="mt-6" data-testid="content-status">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <h2 className="text-lg font-black text-stone-900">Сэдвүүдийн шалгалт</h2>
        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800">
          {doneParts}/{allParts} хэсэг шалгасан
        </span>
        <button
          type="button"
          onClick={() => setShowChecked((v) => !v)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-bold text-stone-700 hover:bg-stone-100 cursor-pointer"
        >
          {showChecked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showChecked ? 'Шалгасныг нуух' : 'Шалгасныг харах'}
        </button>
      </div>
      <p className="text-xs text-stone-500 mb-4">
        Сэдвийг дарж задлаад, хэсэг бүрийг шалгаж дуусмагц чагтал. Чагталсан хэсэг нуугдана. Шар бичиг нь
        автоматаар олдсон дутуу ({MIN_EXAMPLES} жишээ, {MIN_PRACTICE} дасгал, сорил бүр {TEST_QUESTIONS} асуулт, хариу ба
        бодолт).
      </p>
      {tree.map(({ grade, chapters }) => {
        const gid = `g:${grade}`;
        const gradeNodes = chapters.flatMap((c) => c.nodes);
        const [gd, ga] = sumTally(gradeNodes);
        if (!showChecked && ga > 0 && gd === ga) return null;
        return (
          <div key={grade} className="mb-3 rounded-xl border border-stone-200 bg-white">
            <button
              type="button"
              onClick={() => toggleOpen(gid)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-black text-stone-900 cursor-pointer"
            >
              <Toggle id={gid} />
              {grade}-р анги
              <span className="flex-1" />
              <Progress done={gd} all={ga} />
            </button>
            {open.has(gid) && (
              <div className="px-3 pb-2">
                {chapters.map((c) => {
                  const cid = `c:${grade}:${c.name}`;
                  const [cd, ca] = sumTally(c.nodes);
                  if (!showChecked && ca > 0 && cd === ca) return null;
                  return (
                    <div key={c.name} className="border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => toggleOpen(cid)}
                        className="w-full flex items-center gap-2 py-2 text-sm font-bold text-stone-700 cursor-pointer"
                      >
                        <Toggle id={cid} />
                        {c.name}
                        <span className="flex-1" />
                        <Progress done={cd} all={ca} />
                      </button>
                      {open.has(cid) && <div className="ml-4 pb-1">{c.nodes.map((n) => renderNode(n, 0))}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
};

export default ContentStatus;
