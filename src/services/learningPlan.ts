import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { subscribeAttempts, AttemptMap } from './examAttempts';
import { userPermissionsService } from './userPermissionsService';
import { storageService } from './storageService';
import { cloud } from './cloud';
import { generateTopicTests } from '../utils/topicTests';
import { GRADE_TOPICS_CATALOG } from '../data/initialData';
import { GradeNumber, TestQuestion, TopicPackage } from '../types';
import { getQuestionOptions, hasMadeUpOptions, isOptionCorrect } from '../utils/examGrading';

/**
 * Placement test and personal learning plan.
 * A grade's placement test is drawn at random from the basic and middle tests of that grade's
 * topics, a few questions per topic.
 * Placement tests are free and every grade's (6-12) is open to every student; retaking one replaces its result.
 * - users/{uid}/placement/g{grade}: the student's answers on that grade's test and the topics of
 *   the questions they got wrong. Together these topics are their plan. Those topics are their plan; they open once the student has paid (an access period
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

/** One attempt's latest score in percent. */
export function attemptPercent(examId: string, attempt: { score?: number; maxPoints?: number }): number {
  const m = examId.match(/^(.*)-test([123])$/);
  const max = attempt.maxPoints || (m ? testMaxPoints(m[1], Number(m[2]) as 1 | 2 | 3) : 0);
  return max > 0 ? Math.round(((attempt.score ?? 0) / max) * 100) : 0;
}

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

// A topic's three tests as the topic-tests page shows them (sample tests when the admin has not written its own)
function topicTests(t: TopicMeta): TopicPackage['test1'][] {
  const saved = storageService.getTopics().find((s) => s.id === t.id);
  if (saved?.test1?.questions?.length && saved.test2?.questions?.length && saved.test3?.questions?.length) {
    return [saved.test1, saved.test2, saved.test3];
  }
  const g = generateTopicTests(t.id, saved?.title || t.title, t.grade, saved?.category || t.category);
  return [g.test1, g.test2, g.test3];
}

// Choice questions of a topic's tests (open questions get made-up choices, so they are left out)
function questionPool(t: TopicMeta): TestQuestion[] {
  return topicTests(t)
    .flatMap((test) => test?.questions || [])
    .filter((q) => !hasMadeUpOptions(q));
}

// Every topic of that grade; each has topic tests to draw from
function placementTopics(grade: GradeNumber): TopicMeta[] {
  return allTopicMetas().filter((t) => t.grade === grade && questionPool(t).length > 0);
}

// At least 3 questions per topic, so one slip does not put a topic in the plan
export const MIN_PLACEMENT_PER_TOPIC = 3;

function placementPerTopic(): number {
  return Math.max(MIN_PLACEMENT_PER_TOPIC, cloud.getAppSettings().placementPerTopic || 0);
}

// Up to `per` random questions from each topic, never the same question twice
function drawQuestions(grade: GradeNumber, random: boolean): PlacementQuestion[] {
  const per = placementPerTopic();
  const used = new Set<string>();
  const questions: PlacementQuestion[] = [];
  for (const t of placementTopics(grade)) {
    const pool = questionPool(t);
    const fresh = (random ? shuffle(pool) : pool).filter((q) => {
      const key = q.id;
      if (used.has(key)) return false;
      used.add(key);
      return true;
    });
    for (const q of fresh.slice(0, per)) questions.push({ topicId: t.id, question: q });
  }
  return questions;
}

/** How many topics and questions a grade's placement test would have. */
export function placementSize(grade: GradeNumber): { topics: number; questions: number } {
  const questions = drawQuestions(grade, false);
  return { topics: new Set(questions.map((q) => q.topicId)).size, questions: questions.length };
}

/** A fresh placement test for a grade: questions from each of its topic tests, mixed together. */
export function buildPlacementTest(grade: GradeNumber): PlacementTest | null {
  const questions = shuffle(drawQuestions(grade, true));
  return questions.length > 0 ? { grade, questions } : null;
}

export const GRADES: GradeNumber[] = [6, 7, 8, 9, 10, 11, 12];

function sortResults(list: PlacementResult[]): PlacementResult[] {
  return [...list].sort((a, b) => a.grade - b.grade || a.takenAt - b.takenAt);
}

/** The topics of all of a student's results, in grade order, without repeats. */
export function combinedPlan(results: PlacementResult[]): (PlacementResult['plan'][number] & { grade: GradeNumber })[] {
  const plan: (PlacementResult['plan'][number] & { grade: GradeNumber })[] = [];
  for (const r of sortResults(results)) {
    for (const p of r.plan) {
      if (!plan.some((x) => x.topicId === p.topicId)) plan.push({ ...p, grade: r.grade });
    }
  }
  return plan;
}

export async function loadPlacementResults(uid: string): Promise<PlacementResult[]> {
  const snap = await getDocs(collection(getDb(), 'users', uid, 'placement'));
  return sortResults(snap.docs.map((d) => d.data() as PlacementResult));
}

/** Admin: removes all of a student's placement results so they can take the tests again. */
export async function resetPlacementResults(uid: string): Promise<void> {
  const snap = await getDocs(collection(getDb(), 'users', uid, 'placement'));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
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
  // Questions are mixed, so list the plan in the course's topic order
  const order = allTopicMetas().map((t) => t.id);
  plan.sort((a, b) => order.indexOf(a.topicId) - order.indexOf(b.topicId));
  return { grade: test.grade, takenAt: Date.now(), answers, correct, total: test.questions.length, plan };
}

export async function savePlacementResult(uid: string, result: PlacementResult): Promise<void> {
  await setDoc(doc(getDb(), 'users', uid, 'placement', `g${result.grade}`), result);
}

interface PlanState {
  uid: string | null;
  userId: string | null;
  grade: GradeNumber | null;
  // undefined while loading
  results: PlacementResult[] | undefined;
  attempts: AttemptMap;
  // Admin's "view as user": pretend the account has paid (true) or not (false)
  paidOverride: boolean | null;
}

const state: PlanState = { uid: null, userId: null, grade: null, results: undefined, attempts: {}, paidOverride: null };
let unsubs: (() => void)[] = [];

function notify() {
  window.dispatchEvent(new Event('learning-plan-updated'));
}

/** Starts for a signed-in student: their grade's placement test, their result and test scores. */
export function startLearningPlan(uid: string, userId: string, grade: GradeNumber | null, paidOverride: boolean | null = null) {
  stopLearningPlan();
  Object.assign(state, { uid, userId, grade, results: undefined, attempts: {}, paidOverride });
  const db = getDb();
  const onError = (what: string) => (err: unknown) => {
    console.error(`${what} failed to load`, err);
  };
  unsubs.push(
    onSnapshot(
      collection(db, 'users', uid, 'placement'),
      (snap) => {
        state.results = sortResults(snap.docs.map((d) => d.data() as PlacementResult));
        notify();
      },
      (err) => {
        onError('Placement results')(err);
        state.results = [];
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
  Object.assign(state, { uid: null, userId: null, grade: null, results: undefined, attempts: {}, paidOverride: null });
  notify();
}

export const learningPlan = {
  get state(): Readonly<PlanState> {
    return state;
  },
  /** Still loading what decides whether the student must take the test first. */
  isLoading(): boolean {
    return !!state.uid && state.results === undefined;
  },
  /** A grade's placement test exists (it can be taken again; the new result replaces the old). */
  canTakePlacement(grade: GradeNumber): boolean {
    return (
      !!state.uid &&
      !!state.results &&
      cloud.getAppSettings().placementEnabled &&
      placementSize(grade).questions > 0
    );
  },
  resultFor(grade: GradeNumber): PlacementResult | undefined {
    return state.results?.find((r) => r.grade === grade);
  },
  /** Placement tests are on and the student has not taken any yet (lessons wait for one). */
  needsPlacement(): boolean {
    return !!state.results && state.results.length === 0 && GRADES.some((g) => this.canTakePlacement(g));
  },
  /** The student has taken a placement test, so their access follows their plan. */
  hasPlan(): boolean {
    return !!state.uid && !!state.results && state.results.length > 0;
  },
  /** Topics to study from all the student's placement tests. */
  plan() {
    return combinedPlan(state.results || []);
  },
  isPaid(): boolean {
    if (state.paidOverride !== null) return state.paidOverride;
    if (!state.userId) return false;
    const perms = userPermissionsService.getUserPermissions(state.userId);
    return !perms.isBlocked && typeof perms.expiresAt === 'number' && Date.now() < perms.expiresAt;
  },
  paidUntil(): number | null {
    if (state.paidOverride !== null) return state.paidOverride ? Date.now() + 30 * 24 * 3600 * 1000 : null;
    if (!state.userId) return null;
    const e = userPermissionsService.getUserPermissions(state.userId).expiresAt;
    return typeof e === 'number' ? e : null;
  },
  inPlan(topicId: string): boolean {
    return this.plan().some((p) => p.topicId === topicId);
  },
  /** Students whose access follows the placement test (taken, or still to take). */
  isGated(): boolean {
    return this.hasPlan() || this.needsPlacement();
  },
  /** For those students: 'open', or why the topic is closed. null for everyone else. */
  /** A free sample topic the admin opened for everyone. */
  isFree(topicId: string): boolean {
    return (cloud.getAppSettings().freeTopicIds || []).includes(topicId);
  },
  topicGate(topicId: string): 'open' | 'needs-placement' | 'unpaid' | 'not-in-plan' | null {
    if (this.isFree(topicId) && !!state.uid) return 'open';
    if (this.needsPlacement()) return 'needs-placement';
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
