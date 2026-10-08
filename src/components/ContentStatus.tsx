import React, { useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cloud } from '../services/cloud';
import { TestPackage, TopicPackage } from '../types';

// A topic is complete with at least this many of each
const TEST_QUESTIONS = 15;
const MIN_EXAMPLES = 10;
const MIN_PRACTICE = 15;

const short = (have: number, need: number) => (have < need ? [`${need - have} дутуу`] : []);

interface Part {
  label: string;
  count: number;
  // What is missing in this part, empty when it is complete
  problems: string[];
}

const blank = (s?: string) => !s || !s.trim();

function testPart(label: string, test?: TestPackage): Part {
  const qs = test?.questions || [];
  const problems: string[] = [];
  if (qs.length < TEST_QUESTIONS) problems.push(`${TEST_QUESTIONS - qs.length} асуулт дутуу`);
  const noAnswer = qs.filter((q) => blank(q.answer) && blank(q.answerHash)).length;
  if (noAnswer) problems.push(`${noAnswer} хариугүй`);
  const noSolution = qs.filter((q) => blank(q.solution)).length;
  if (noSolution) problems.push(`${noSolution} бодолтгүй`);
  return { label, count: qs.length, problems };
}

function partsOf(t: TopicPackage): Part[] {
  const theory = t.theory || [];
  const examples = t.examples || [];
  const practice = t.practice || [];
  const exNoSolution = examples.filter((e) => blank(e.solution)).length;
  const prNoSolution = practice.filter((p) => blank(p.solution)).length;
  return [
    { label: 'Онол', count: theory.length, problems: theory.length ? [] : ['хоосон'] },
    {
      label: 'Жишээ',
      count: examples.length,
      problems: [...short(examples.length, MIN_EXAMPLES), ...(exNoSolution ? [`${exNoSolution} бодолтгүй`] : [])],
    },
    {
      label: 'Дасгал',
      count: practice.length,
      problems: [...short(practice.length, MIN_PRACTICE), ...(prNoSolution ? [`${prNoSolution} бодолтгүй`] : [])],
    },
    testPart('Сорил 1', t.test1),
    testPart('Сорил 2', t.test2),
    testPart('Сорил 3', t.test3),
  ];
}

/**
 * The general view's home page: every topic with how complete each part of it is, so the admin
 * sees at a glance which topics are ready and what is still missing in the others.
 */
const ContentStatus: React.FC<{ topics: TopicPackage[]; onOpenTopic: (topicId: string) => void }> = ({
  topics,
  onOpenTopic,
}) => {
  const [onlyMissing, setOnlyMissing] = useState(false);

  const rows = useMemo(() => {
    const order = cloud.getAppSettings().topicOrder || [];
    const pos = (id: string) => {
      const i = order.indexOf(id);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    // Topics that only group subtopics hold no lesson of their own
    const parents = new Set(topics.map((t) => t.parentId).filter(Boolean));
    return topics
      .filter((t) => !parents.has(t.id))
      .map((t) => {
        const parts = partsOf(t);
        return { topic: t, parts, ready: parts.every((p) => p.problems.length === 0) };
      })
      .sort((a, b) => a.topic.grade - b.topic.grade || pos(a.topic.id) - pos(b.topic.id));
  }, [topics]);

  const ready = rows.filter((r) => r.ready).length;
  const grades = [...new Set(rows.map((r) => r.topic.grade))];

  return (
    <section className="mt-6" data-testid="content-status">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h2 className="text-lg font-black text-stone-900">Сэдвүүдийн бэлэн байдал</h2>
        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800">{ready} бүрэн</span>
        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-800">
          {rows.length - ready} дутуу
        </span>
        <label className="ml-auto flex items-center gap-2 text-xs font-bold text-stone-600 cursor-pointer">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Зөвхөн дутууг харуулах
        </label>
      </div>
      <p className="text-xs text-stone-500 mb-4">
        Бүрэн сэдэв: онолтой, {MIN_EXAMPLES}-аас доошгүй жишээ, {MIN_PRACTICE}-аас доошгүй дасгал, сорил бүр {TEST_QUESTIONS} асуулттай, бүх бодлого хариу ба бодолттой.
      </p>
      {grades.map((g) => {
        const list = rows.filter((r) => r.topic.grade === g && !(onlyMissing && r.ready));
        if (!list.length) return null;
        return (
          <div key={g} className="mb-5">
            <h3 className="text-sm font-black text-stone-700 mb-2">{g}-р анги</h3>
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-xs">
                <thead className="bg-stone-100 text-stone-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold">Сэдэв</th>
                    {list[0].parts.map((p) => (
                      <th key={p.label} className="px-2 py-2 font-bold whitespace-nowrap">
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map(({ topic, parts, ready }) => (
                    <tr key={topic.id} className="border-t border-stone-100">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => onOpenTopic(topic.id)}
                          className="flex items-center gap-2 text-left font-bold text-stone-900 hover:underline cursor-pointer"
                        >
                          {ready ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                          )}
                          {topic.title}
                        </button>
                      </td>
                      {parts.map((p) => (
                        <td
                          key={p.label}
                          className={`px-2 py-2 text-center whitespace-nowrap ${
                            p.problems.length ? 'bg-amber-50 text-amber-800' : 'text-emerald-700'
                          }`}
                          title={p.problems.join(', ')}
                        >
                          <div className="font-bold">{p.problems.length ? p.count : `✓ ${p.count}`}</div>
                          {p.problems.length > 0 && <div className="text-[10px]">{p.problems.join(', ')}</div>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default ContentStatus;
