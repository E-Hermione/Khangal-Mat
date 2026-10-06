import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
  updateDoc,
  Unsubscribe,
  WriteBatch,
} from 'firebase/firestore';
import { getDb } from './firebase';
import { TopicPackage, UserPermissions, DefaultPermissionsConfig, UserProfile } from '../types';
import { TopicAnswers, splitTopic, mergeAnswers, answersVisibleFor, needsAnswerRewrite } from './answers';
import { getQuestionOptions } from '../utils/examGrading';

/**
 * In-memory mirror of the Firestore data the app uses. Services read from it synchronously
 * (as they did from localStorage); writes update the mirror immediately and are sent to Firestore.
 * Snapshot listeners keep it in sync with changes made on other devices.
 */

// Loose shape; visibilityService fills in defaults
export type VisibilityDoc = Record<string, unknown>;

// Site-wide switches the admin controls in Settings (settings/app)
export interface AppSettings {
  screenProtection: boolean;
  deviceLimit: boolean;
  copyProtection: boolean;
  // New students first take a placement test drawn at random from the topics' tests
  placementEnabled: boolean;
  placementPerTopic: number;
  // Topics open to everyone as a free sample of the lessons (chosen by the admin)
  freeTopicIds: string[];
  // Built-in catalog topics the admin deleted from the topic list
  removedTopicIds: string[];
  // Categories the admin added that have no topics yet
  extraCategories: { grade: number; name: string }[];
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  screenProtection: false,
  deviceLimit: true,
  copyProtection: false,
  placementEnabled: true,
  placementPerTopic: 3,
  freeTopicIds: [],
  removedTopicIds: [],
  extraCategories: [],
};

interface CloudState {
  topics: TopicPackage[];
  // topicAnswers/{id}, for the topics this user may see answers of
  answers: Record<string, TopicAnswers>;
  visibility: VisibilityDoc | null;
  defaultPermissions: DefaultPermissionsConfig | null;
  appSettings: AppSettings;
  userPermissions: Record<string, UserPermissions>;
  users: UserProfile[];
}

const emptyState = (): CloudState => ({
  topics: [],
  answers: {},
  visibility: null,
  defaultPermissions: null,
  appSettings: DEFAULT_APP_SETTINGS,
  userPermissions: {},
  users: [],
});

let state: CloudState = emptyState();
let unsubscribers: Unsubscribe[] = [];

// Events the existing components already listen to
function notify(...events: string[]) {
  for (const name of new Set(['cloud-data-updated', ...events])) {
    window.dispatchEvent(new CustomEvent(name));
  }
}

function reportWriteError(err: unknown) {
  console.error('Firestore write failed', err);
  window.alert('Өөрчлөлтийг хадгалж чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу.');
}

/** Firestore rejects `undefined` values; JSON round-trip drops them. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function write(promise: Promise<unknown>) {
  promise.catch(reportWriteError);
}

function split(topic: TopicPackage) {
  const { publicTopic, answers } = splitTopic(topic, getQuestionOptions);
  return { publicTopic: clean(publicTopic), answers: clean(answers) };
}

/**
 * Lessons are protected: members read the topic list (topicIndex) and the topic tests (topicTests,
 * without answers) of every topic, but a topic's lesson content (topics/{id}) only when the rules
 * allow it: a free sample topic, or their own grade's topics while their access is paid.
 */
export type TopicIndexEntry = Pick<
  TopicPackage,
  'id' | 'grade' | 'visibleGrades' | 'category' | 'title' | 'code' | 'description' | 'parentId' | 'order'
>;
type TopicTests = Pick<TopicPackage, 'test1' | 'test2' | 'test3'>;

function indexOf(t: TopicPackage): TopicIndexEntry {
  return clean({
    id: t.id,
    grade: t.grade,
    visibleGrades: t.visibleGrades,
    category: t.category,
    title: t.title,
    code: t.code,
    description: t.description,
    parentId: t.parentId,
    order: t.order,
  });
}

function testsOf(publicTopic: TopicPackage): TopicTests {
  return clean({ test1: publicTopic.test1, test2: publicTopic.test2, test3: publicTopic.test3 });
}

// Writes (or deletes) the four documents a topic is stored in
function putTopic(b: WriteBatch, id: string, publicTopic: TopicPackage, answers: TopicAnswers) {
  const db = getDb();
  b.set(doc(db, 'topics', id), publicTopic);
  b.set(doc(db, 'topicAnswers', id), answers);
  b.set(doc(db, 'topicIndex', id), indexOf(publicTopic));
  b.set(doc(db, 'topicTests', id), testsOf(publicTopic));
}
function dropTopic(b: WriteBatch, id: string) {
  const db = getDb();
  for (const col of ['topics', 'topicAnswers', 'topicIndex', 'topicTests']) b.delete(doc(db, col, id));
}

// Member side: the list, the tests, and the lesson content they may read
const memberIndex = new Map<string, TopicIndexEntry>();
const memberTests = new Map<string, TopicTests>();
const memberContent = new Map<string, TopicPackage>();
const contentSubs = new Map<string, Unsubscribe>();
let memberGrade: number | null = null;
// Admin side: topics that already have their list entry
const indexedIds = new Set<string>();

function memberMayRead(entry: TopicIndexEntry): boolean {
  if ((state.appSettings.freeTopicIds || []).includes(entry.id)) return true;
  if (!memberGrade) return false;
  const perms = Object.values(state.userPermissions)[0];
  const paid = !!perms && !perms.isBlocked && typeof perms.expiresAt === 'number' && perms.expiresAt > Date.now();
  return paid && (entry.grade === memberGrade || (entry.visibleGrades || []).includes(memberGrade as never));
}

function rebuildMemberTopics() {
  state.topics = [...memberIndex.values()].map(
    (e) =>
      memberContent.get(e.id) ||
      ({ ...e, theory: [], examples: [], practice: [], ...memberTests.get(e.id) } as unknown as TopicPackage)
  );
  syncMemberAnswers();
  notify('topics-updated');
}

function syncMemberContent() {
  for (const entry of memberIndex.values()) {
    const ok = memberMayRead(entry);
    const sub = contentSubs.get(entry.id);
    if (ok && !sub) {
      contentSubs.set(
        entry.id,
        onSnapshot(
          doc(getDb(), 'topics', entry.id),
          (snap) => {
            if (snap.exists()) memberContent.set(entry.id, snap.data() as TopicPackage);
            else memberContent.delete(entry.id);
            rebuildMemberTopics();
          },
          () => {
            // Not allowed after all (the rules decide): the lesson stays closed
            contentSubs.delete(entry.id);
            memberContent.delete(entry.id);
            rebuildMemberTopics();
          }
        )
      );
    } else if (!ok && sub) {
      sub();
      contentSubs.delete(entry.id);
      memberContent.delete(entry.id);
    }
  }
  rebuildMemberTopics();
}

// Members read answers topic by topic, only where the admin made them visible (the rules check
// the same thing). Re-evaluated whenever topics or visibility settings change.
const answerSubs = new Map<string, Unsubscribe>();

function syncMemberAnswers() {
  for (const topic of state.topics) {
    const visible = answersVisibleFor(topic.id, state.visibility);
    const sub = answerSubs.get(topic.id);
    if (visible && !sub) {
      answerSubs.set(
        topic.id,
        onSnapshot(
          doc(getDb(), 'topicAnswers', topic.id),
          (snap) => {
            if (snap.exists()) state.answers[topic.id] = snap.data() as TopicAnswers;
            else delete state.answers[topic.id];
            notify('topics-updated');
          },
          () => {
            answerSubs.delete(topic.id);
            delete state.answers[topic.id];
          }
        )
      );
    } else if (!visible && sub) {
      sub();
      answerSubs.delete(topic.id);
      delete state.answers[topic.id];
      notify('topics-updated');
    }
  }
}

export interface CloudSyncOptions {
  isAdmin: boolean;
  userId?: string;
  // The member's own grade (decides which lessons a paid member may read)
  grade?: number | null;
}

/**
 * Subscribes to everything the signed-in user may read and resolves once each listener
 * has delivered its first snapshot.
 */
export function startCloudSync({ isAdmin, userId, grade }: CloudSyncOptions): Promise<void> {
  stopCloudSync();
  const db = getDb();
  memberGrade = grade ?? null;

  const waits: Promise<void>[] = [];
  const listen = (
    subscribe: (onFirst: () => void, onError: (err: unknown) => void) => Unsubscribe
  ) => {
    waits.push(
      new Promise<void>((resolve, reject) => {
        let first = true;
        unsubscribers.push(
          subscribe(
            () => {
              if (first) {
                first = false;
                resolve();
              }
            },
            (err) => {
              console.error('Firestore listener failed', err);
              if (first) reject(err);
            }
          )
        );
      })
    );
  };

  if (isAdmin) {
    listen((onFirst, onError) =>
      onSnapshot(
        collection(db, 'topics'),
        (snap) => {
          state.topics = snap.docs.map((d) => d.data() as TopicPackage);
          notify('topics-updated');
          onFirst();
        },
        onError
      )
    );
    listen((onFirst, onError) =>
      onSnapshot(
        collection(db, 'topicIndex'),
        (snap) => {
          indexedIds.clear();
          snap.docs.forEach((d) => indexedIds.add(d.id));
          onFirst();
        },
        onError
      )
    );
  } else {
    listen((onFirst, onError) =>
      onSnapshot(
        collection(db, 'topicIndex'),
        (snap) => {
          memberIndex.clear();
          snap.docs.forEach((d) => memberIndex.set(d.id, d.data() as TopicIndexEntry));
          syncMemberContent();
          onFirst();
        },
        onError
      )
    );
    listen((onFirst, onError) =>
      onSnapshot(
        collection(db, 'topicTests'),
        (snap) => {
          memberTests.clear();
          snap.docs.forEach((d) => memberTests.set(d.id, d.data() as TopicTests));
          rebuildMemberTopics();
          onFirst();
        },
        onError
      )
    );
  }

  listen((onFirst, onError) =>
    onSnapshot(
      doc(db, 'settings', 'visibility'),
      (snap) => {
        state.visibility = snap.exists() ? (snap.data() as VisibilityDoc) : null;
        if (!isAdmin) syncMemberAnswers();
        notify('visibility-settings-updated');
        onFirst();
      },
      onError
    )
  );

  listen((onFirst, onError) =>
    onSnapshot(
      doc(db, 'settings', 'defaultPermissions'),
      (snap) => {
        state.defaultPermissions = snap.exists() ? (snap.data() as DefaultPermissionsConfig) : null;
        notify('user-permissions-updated');
        onFirst();
      },
      onError
    )
  );

  listen((onFirst, onError) =>
    onSnapshot(
      doc(db, 'settings', 'app'),
      (snap) => {
        state.appSettings = { ...DEFAULT_APP_SETTINGS, ...(snap.exists() ? (snap.data() as Partial<AppSettings>) : {}) };
        if (!isAdmin) syncMemberContent();
        notify('app-settings-updated');
        onFirst();
      },
      onError
    )
  );

  if (isAdmin) {
    listen((onFirst, onError) =>
      onSnapshot(
        collection(db, 'topicAnswers'),
        (snap) => {
          state.answers = Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as TopicAnswers]));
          notify('topics-updated');
          onFirst();
        },
        onError
      )
    );
    listen((onFirst, onError) =>
      onSnapshot(
        collection(db, 'userPermissions'),
        (snap) => {
          state.userPermissions = Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as UserPermissions]));
          notify('user-permissions-updated');
          onFirst();
        },
        onError
      )
    );
    listen((onFirst, onError) =>
      onSnapshot(
        collection(db, 'users'),
        (snap) => {
          state.users = snap.docs.map((d) => d.data() as UserProfile);
          notify('users-updated');
          onFirst();
        },
        onError
      )
    );
  } else if (userId) {
    listen((onFirst, onError) =>
      onSnapshot(
        doc(db, 'userPermissions', userId),
        (snap) => {
          state.userPermissions = snap.exists() ? { [userId]: snap.data() as UserPermissions } : {};
          syncMemberContent();
          notify('user-permissions-updated');
          onFirst();
        },
        onError
      )
    );
  }

  return Promise.all(waits).then(() => undefined);
}

export function stopCloudSync() {
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
  answerSubs.forEach((u) => u());
  answerSubs.clear();
  contentSubs.forEach((u) => u());
  contentSubs.clear();
  memberIndex.clear();
  memberTests.clear();
  memberContent.clear();
  indexedIds.clear();
  memberGrade = null;
  state = emptyState();
}

export const cloud = {
  // Topics
  /** Topics with the answers this user may see merged back in. */
  getTopics(): TopicPackage[] {
    return state.topics.map((t) => mergeAnswers(t, state.answers[t.id]));
  },
  /** Admin: topics stored before lessons were protected get their list entry and tests documents. */
  backfillTopicIndex(): Promise<void> {
    const missing = state.topics.filter((t) => !indexedIds.has(t.id));
    if (missing.length === 0) return Promise.resolve();
    const db = getDb();
    const commits: Promise<void>[] = [];
    for (let i = 0; i < missing.length; i += 200) {
      const batch = writeBatch(db);
      for (const t of missing.slice(i, i + 200)) {
        batch.set(doc(db, 'topicIndex', t.id), indexOf(t));
        batch.set(doc(db, 'topicTests', t.id), testsOf(t));
        indexedIds.add(t.id);
      }
      commits.push(batch.commit());
    }
    return Promise.all(commits).then(() => undefined);
  },
  /** True if some stored topic carries inline answers or an outdated answer key. */
  hasTopicsNeedingAnswerRewrite(): boolean {
    return state.topics.some(needsAnswerRewrite);
  },
  setTopic(topic: TopicPackage) {
    const { publicTopic, answers } = split(topic);
    const i = state.topics.findIndex((t) => t.id === topic.id);
    state.topics = i >= 0 ? state.topics.map((t, j) => (j === i ? publicTopic : t)) : [...state.topics, publicTopic];
    state.answers[topic.id] = answers;
    notify('topics-updated');
    const batch = writeBatch(getDb());
    putTopic(batch, topic.id, publicTopic, answers);
    indexedIds.add(topic.id);
    write(batch.commit());
  },
  deleteTopic(topicId: string) {
    state.topics = state.topics.filter((t) => t.id !== topicId);
    delete state.answers[topicId];
    notify('topics-updated');
    const batch = writeBatch(getDb());
    dropTopic(batch, topicId);
    write(batch.commit());
  },
  /** Replaces the whole topic collection (import, reset to defaults, first-time seeding). */
  replaceTopics(topics: TopicPackage[]): Promise<void> {
    const db = getDb();
    const keep = new Set(topics.map((t) => t.id));
    const removed = state.topics.filter((t) => !keep.has(t.id));
    const parts = topics.map((t) => ({ id: t.id, ...split(t) }));
    state.topics = parts.map((p) => p.publicTopic);
    state.answers = Object.fromEntries(parts.map((p) => [p.id, p.answers]));
    notify('topics-updated');
    // Batches are limited to 500 writes
    type Op = (b: ReturnType<typeof writeBatch>) => void;
    // Each topic is four documents; 100 topics per batch stays under the 500-write limit
    const ops: Op[] = [
      ...parts.map((p): Op => (b) => putTopic(b, p.id, p.publicTopic, p.answers)),
      ...removed.map((t): Op => (b) => dropTopic(b, t.id)),
    ];
    parts.forEach((p) => indexedIds.add(p.id));
    const commits: Promise<void>[] = [];
    for (let i = 0; i < ops.length; i += 100) {
      const batch = writeBatch(db);
      ops.slice(i, i + 100).forEach((op) => op(batch));
      commits.push(batch.commit());
    }
    const all = Promise.all(commits).then(() => undefined);
    write(all);
    return all;
  },

  // Site-wide settings
  getVisibility(): VisibilityDoc | null {
    return state.visibility;
  },
  setVisibility(settings: VisibilityDoc) {
    state.visibility = settings;
    notify('visibility-settings-updated');
    write(setDoc(doc(getDb(), 'settings', 'visibility'), clean(settings)));
  },
  getAppSettings(): AppSettings {
    return state.appSettings;
  },
  setAppSettings(update: Partial<AppSettings>) {
    state.appSettings = { ...state.appSettings, ...update };
    notify('app-settings-updated');
    write(setDoc(doc(getDb(), 'settings', 'app'), clean(state.appSettings)));
  },
  getDefaultPermissions(): DefaultPermissionsConfig | null {
    return state.defaultPermissions;
  },
  setDefaultPermissions(config: DefaultPermissionsConfig) {
    state.defaultPermissions = config;
    notify('user-permissions-updated');
    write(setDoc(doc(getDb(), 'settings', 'defaultPermissions'), clean(config)));
  },

  // Per-user permissions (admin sees all, a member only their own)
  getUserPermissions(): Record<string, UserPermissions> {
    return state.userPermissions;
  },
  setUserPermissions(userId: string, perms: UserPermissions) {
    state.userPermissions = { ...state.userPermissions, [userId]: perms };
    notify('user-permissions-updated');
    write(setDoc(doc(getDb(), 'userPermissions', userId), clean(perms)));
  },

  // Accounts (admin only)
  getUsers(): UserProfile[] {
    return state.users;
  },
  updateUser(uid: string, update: Partial<UserProfile>) {
    state.users = state.users.map((u) => (u.uid === uid ? { ...u, ...update } : u));
    notify('users-updated');
    write(updateDoc(doc(getDb(), 'users', uid), clean(update)));
  },
  removeUserLocally(uid: string) {
    state.users = state.users.filter((u) => u.uid !== uid);
    notify('users-updated');
  },
};
