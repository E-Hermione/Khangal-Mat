import { GradeNumber, TestPackage, TopicPackage } from '../types';

const TIERS = ['Анхан', 'Дунд', 'Ахисан'] as const;

function emptyTest(n: 1 | 2 | 3, id: string): TestPackage {
  return { id: `${id}-test${n}`, testNumber: n, title: TIERS[n - 1], subtitle: '', targetSkills: '', totalPoints: 0, questions: [] };
}

/** An empty topic (or subtopic) the admin adds from the topic list and then fills in. */
export function newTopic(fields: {
  grade: GradeNumber;
  category: string;
  title: string;
  parentId?: string;
  order?: number;
  visibleGrades?: GradeNumber[];
}): TopicPackage {
  const id = `g${fields.grade}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return {
    id,
    grade: fields.grade,
    visibleGrades: fields.visibleGrades,
    category: fields.category,
    title: fields.title,
    description: '',
    parentId: fields.parentId,
    order: fields.order,
    theory: [],
    examples: [],
    practice: [],
    test1: emptyTest(1, id),
    test2: emptyTest(2, id),
    test3: emptyTest(3, id),
  };
}
