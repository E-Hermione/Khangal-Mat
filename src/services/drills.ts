import { doc, getDoc } from 'firebase/firestore';
import { getDb } from './firebase';

/**
 * Practice drills: for each topic, a large stored set of problems with answers and solutions
 * (topicDrills/{topicId}__{part}). Only students with paid access may read them (the rules check it).
 */
export interface DrillItem {
  q: string; // the problem
  a: string; // the answer
  s: string; // the solution
  l: 1 | 2 | 3; // level
}

const cache = new Map<string, Promise<DrillItem[]>>();

export function loadDrills(topicId: string): Promise<DrillItem[]> {
  let p = cache.get(topicId);
  if (!p) {
    p = (async () => {
      const first = await getDoc(doc(getDb(), 'topicDrills', `${topicId}__0`));
      if (!first.exists()) return [];
      const parts = (first.data().parts as number) || 1;
      const rest = await Promise.all(
        Array.from({ length: parts - 1 }, (_, i) => getDoc(doc(getDb(), 'topicDrills', `${topicId}__${i + 1}`)))
      );
      return [first, ...rest].flatMap((d) => (d.exists() ? (d.data().items as DrillItem[]) : []));
    })();
    p.catch(() => cache.delete(topicId));
    cache.set(topicId, p);
  }
  return p;
}

/** How alike two problems are: the share of their words and formula commands in common, numbers left out */
const shape = (t: string) =>
  new Set(
    t
      .replace(/\d+([.,]\d+)?/g, ' # ')
      .toLowerCase()
      .match(/\\[a-z]+|[a-zа-яөүё]{3,}|[+\-:=^|()[\]]/gi) || []
  );
const likeness = (a: Set<string>, b: Set<string>) => {
  let common = 0;
  a.forEach((x) => b.has(x) && common++);
  return common / Math.max(1, a.size + b.size - common);
};

/** The drills most like `question` first (same level preferred), shuffled among equally good ones */
export function rankLike(items: DrillItem[], question: string, level: number): DrillItem[] {
  const target = shape(question);
  return items
    .map((it) => ({ it, score: likeness(target, shape(it.q)) + (it.l === level ? 0.15 : 0) + Math.random() * 0.05 }))
    .sort((x, y) => y.score - x.score)
    .map((x) => x.it);
}
