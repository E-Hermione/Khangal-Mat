import { useEffect, useState } from 'react';
import { deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { subscribeAttempts, AttemptMap } from './examAttempts';
import { userPermissionsService } from './userPermissionsService';
import { storageService } from './storageService';
import { cloud } from './cloud';
import { GRADE_TOPICS_CATALOG } from '../data/initialData';
import { GradeNumber, TestQuestion, TopicPackage } from '../types';
import { getQuestionOptions, hasMadeUpOptions, isOptionCorrect } from '../utils/examGrading';

/**
 * Placement test and personal learning plan.
 * The placement test is drawn at random from the topics' basic and middle tests (the student's
 * grade, and the grades below it if the admin chose so), a few questions per topic.
 * - users/{uid}/placement/result: the student's answers and the topics of the questions they got
 *   wrong. Those topics are their plan; they open once the student has paid (an access period
 *   set on their permissions).
 * A topic's tests unlock in turn: scoring 85% or more on the basic test opens the middle one, and
 * on the middle one opens the advanced one. Passing them fills the topic to 35%, 70% and 100%;
 * at 100% the topic is done.
 */

export const PASS_PERCENT = 85;

export interface PlacementQuestion {
  topicId: string;
  question: TestQuestion;
}

export interface PlacementTest {
  grade: GradeNumber;
  questions: PlacementQuestion[];
}

export interface PlacementResult {
  grade: GradeNumber;
  takenAt: number;
  answers: Record<string, string>;
  correct: number;
  total: number;
  // Topics to study, in test order, with the numbers of the questions missed on each
  plan: { topicId: string; missed: number[] }[];
}

/* ---------------------------- topics ---------------------------- */

export interface TopicMeta {
  id: string;
  title: string;
  grade: GradeNumber;
  category: string;
}

/** Every topic the site knows: the catalog plus topics the admin created. */
export function allTopicMetas(): TopicMeta[] {
  const map = new Map<string, TopicMeta>();
  for (const [g, items] of Object.entries(GRADE_TOPICS_CATALOG)) {
    for (const t of items) map.set(t.id, { id: t.id, title: t.title, grade: Number(g) as GradeNumber, category: t.category });
  }
  for (const t of storageService.getTopics()) {
    map.set(t.id, { id: t.id, title: t.title, grade: t.grade, category: t.category || 'Ерөнхий сэдэв' });
  }
  return [...map.values()].sort((a, b) => a.grade - b.grade);
}

export function topicMeta(topicId: string): TopicMeta {
  return allTopicMetas().find((t) => t.id === topicId) || { id: topicId, title: topicId, grade: 6, category: '' };
}

// Points a topic's test is out of, as the exams page builds it
function testMaxPoints(topicId: string, tier: 1 | 2 | 3): number {
  const saved = storageService.getTopics().find((t) => t.id === topicId);
  const pkg = saved?.[`test${tier}` as 'test1' | 'test2' | 'test3'];
  if (pkg?.questions?.length && pkg.totalPoints) return pkg.totalPoints;
  return tier === 1 ? 10 : tier === 2 ? 15 : 20;
}

// How full a topic is after passing its basic, middle and advanced tests
export const TIER_PROGRESS = [0, 35, 70, 100];

/** Best result on one test of a topic in percent, or null if never taken. */
export function tierPercent(topicId: string, tier: 1 | 2 | 3, attempts: AttemptMap): number | null {
  const a = attempts[`${topicId}-test${tier}`];
  if (!a) return null;
  const max = a.maxPoints || testMaxPoints(topicId, tier);
  return max > 0 ? Math.round(((a.bestScore ?? a.score ?? 0) / max) * 100) : 0;
}

/** How many tests in a row, from the basic one, scored 85% or more (0-3). */
export function tiersPassed(topicId: string, attempts: AttemptMap): number {
  let passed = 0;
  for (const tier of [1, 2, 3] as const) {
    if ((tierPercent(topicId, tier, attempts) ?? 0) < PASS_PERCENT) break;
    passed++;
  }
  return passed;
}

export function topicProgress(topicId: string, attempts: AttemptMap): number {
  return TIER_PROGRESS[tiersPassed(topicId, attempts)];
}

/** Tests the student may take: the basic one, and each next one after passing the previous. */
export function unlockedTiers(topicId: string, attempts: AttemptMap): (1 | 2 | 3)[] {
  return ([1, 2, 3] as const).slice(0, Math.min(3, tiersPassed(topicId, attempts) + 1));
}

export function isTopicDone(topicId: string, attempts: AttemptMap): boolean {
  return tiersPassed(topicId, attempts) === 3;
}

/* ---------------------------- placement test ---------------------------- */

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Questions with the teacher's own choices only: open questions get made-up ones
function questionPool(t: TopicPackage): TestQuestion[] {
  return [...(t.test1?.questions || []), ...(t.test2?.questions || [])].filter((q) => !hasMadeUpOptions(q));
}

// Topics the admin filled in (with their own test questions) that a placement test may draw from
function placementTopics(grade: GradeNumber, lowerGrades: boolean) {
  return storageService
    .getTopics()
    .filter((t) => (lowerGrades ? t.grade <= grade : t.grade === grade))
    .filter((t) => questionPool(t).length > 0)
    .sort((a, b) => a.grade - b.grade);
}

// At least 3 questions per topic, so one slip does not put a topic in the plan
export const MIN_PLACEMENT_PER_TOPIC = 3;

function placementPerTopic(): number {
  return Math.max(MIN_PLACEMENT_PER_TOPIC, cloud.getAppSettings().placementPerTopic || 0);
}

/** How many topics and questions a grade's placement test would have. */
export function placementSize(grade: GradeNumber): { topics: number; questions: number } {
  const s = cloud.getAppSettings();
  const topics = placementTopics(grade, s.placementLowerGrades);
  const per = placementPerTopic();
  const questions = topics.reduce(
    (sum, t) => sum + Math.min(per, questionPool(t).length),
    0
  );
  return { topics: topics.length, questions };
}

/** A fresh random placement test for a grade, or null if there is nothing to draw from. */
export function buildPlacementTest(grade: GradeNumber): PlacementTest | null {
  const s = cloud.getAppSettings();
  const per = placementPerTopic();
  const questions: PlacementQuestion[] = [];
  for (const t of placementTopics(grade, s.placementLowerGrades)) {
    const pool = questionPool(t);
    for (const q of shuffle(pool).slice(0, per)) questions.push({ topicId: t.id, question: q });
  }
  return questions.length > 0 ? { grade, questions } : null;
}

export async function loadPlacementResult(uid: string): Promise<PlacementResult | null> {
  const snap = await getDoc(doc(getDb(), 'users', uid, 'placement', 'result'));
  return snap.exists() ? (snap.data() as PlacementResult) : null;
}

/** Admin: lets the student take the placement test again. */
export async function resetPlacementResult(uid: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', uid, 'placement', 'result'));
}

/* ---------------------------- student ---------------------------- */

export function gradePlacement(test: PlacementTest, answers: Record<string, string>): PlacementResult {
  let correct = 0;
  const plan: PlacementResult['plan'] = [];
  test.questions.forEach((q, i) => {
    const chosen = answers[q.question.id] || '';
    if (isOptionCorrect(chosen, q.question, getQuestionOptions(q.question))) {
      correct++;
      return;
    }
    const entry = plan.find((p) => p.topicId === q.topicId);
    if (entry) entry.missed.push(i + 1);
    else plan.push({ topicId: q.topicId, missed: [i + 1] });
  });
  return { grade: test.grade, takenAt: Date.now(), answers, correct, total: test.questions.length, plan };
}

export async function savePlacementResult(uid: string, result: PlacementResult): Promise<void> {
  await setDoc(doc(getDb(), 'users', uid, 'placement', 'result'), result);
}

interface PlanState {
  uid: string | null;
  userId: string | null;
  grade: GradeNumber | null;
  // undefined while loading
  result: PlacementResult | null | undefined;
  attempts: AttemptMap;
}

const state: PlanState = { uid: null, userId: null, grade: null, result: undefined, attempts: {} };
let unsubs: (() => void)[] = [];

function notify() {
  window.dispatchEvent(new Event('learning-plan-updated'));
}

/** Starts for a signed-in student: their grade's placement test, their result and test scores. */
export function startLearningPlan(uid: string, userId: string, grade: GradeNumber | null) {
  stopLearningPlan();
  Object.assign(state, { uid, userId, grade, result: undefined, attempts: {} });
  const db = getDb();
  const onError = (what: string) => (err: unknown) => {
    console.error(`${what} failed to load`, err);
  };
  unsubs.push(
    onSnapshot(
      doc(db, 'users', uid, 'placement', 'result'),
      (snap) => {
        state.result = snap.exists() ? (snap.data() as PlacementResult) : null;
        notify();
      },
      (err) => {
        onError('Placement result')(err);
        state.result = null;
        notify();
      }
    )
  );
  unsubs.push(
    subscribeAttempts(uid, (attempts) => {
      state.attempts = attempts;
      notify();
    })
  );
  notify();
}

export function stopLearningPlan() {
  unsubs.forEach((u) => u());
  unsubs = [];
  Object.assign(state, { uid: null, userId: null, grade: null, result: undefined, attempts: {} });
  notify();
}

export const learningPlan = {
  get state(): Readonly<PlanState> {
    return state;
  },
  /** Still loading what decides whether the student must take the test first. */
  isLoading(): boolean {
    return !!state.uid && state.result === undefined;
  },
  /** The admin turned the placement test on, it has questions, and the student has not taken it. */
  needsPlacement(): boolean {
    return (
      !!state.uid &&
      !!state.grade &&
      state.result === null &&
      cloud.getAppSettings().placementEnabled &&
      placementSize(state.grade).questions > 0
    );
  },
  /** The student has taken the test, so their access follows their plan. */
  hasPlan(): boolean {
    return !!state.uid && !!state.result;
  },
  isPaid(): boolean {
    if (!state.userId) return false;
    const perms = userPermissionsService.getUserPermissions(state.userId);
    return !perms.isBlocked && typeof perms.expiresAt === 'number' && Date.now() < perms.expiresAt;
  },
  paidUntil(): number | null {
    if (!state.userId) return null;
    const e = userPermissionsService.getUserPermissions(state.userId).expiresAt;
    return typeof e === 'number' ? e : null;
  },
  inPlan(topicId: string): boolean {
    return !!state.result?.plan.some((p) => p.topicId === topicId);
  },
  /** For students with a plan: 'open', or why the topic is closed. null for everyone else. */
  topicGate(topicId: string): 'open' | 'unpaid' | 'not-in-plan' | null {
    if (!this.hasPlan()) return null;
    if (!this.inPlan(topicId)) return 'not-in-plan';
    return this.isPaid() ? 'open' : 'unpaid';
  },
  isDone(topicId: string): boolean {
    return isTopicDone(topicId, state.attempts);
  },
  progress(topicId: string): number {
    return topicProgress(topicId, state.attempts);
  },
  unlockedTiers(topicId: string): (1 | 2 | 3)[] {
    return unlockedTiers(topicId, state.attempts);
  },
};

/** Re-renders a component when the plan, results or permissions change. */
export function useLearningPlanVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    const events = ['learning-plan-updated', 'user-permissions-updated', 'app-settings-updated', 'topics-updated'];
    events.forEach((e) => window.addEventListener(e, bump));
    return () => events.forEach((e) => window.removeEventListener(e, bump));
  }, []);
  return version;
}
