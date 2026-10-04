import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
  updateDoc,
  Unsubscribe,
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
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  screenProtection: false,
  deviceLimit: true,
  copyProtection: false,
  placementEnabled: true,
  placementPerTopic: 3,
  freeTopicIds: [],
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
}

/**
 * Subscribes to everything the signed-in user may read and resolves once each listener
 * has delivered its first snapshot.
 */
export function startCloudSync({ isAdmin, userId }: CloudSyncOptions): Promise<void> {
  stopCloudSync();
  const db = getDb();

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

  listen((onFirst, onError) =>
    onSnapshot(
      collection(db, 'topics'),
      (snap) => {
        state.topics = snap.docs.map((d) => d.data() as TopicPackage);
        if (!isAdmin) syncMemberAnswers();
        notify('topics-updated');
        onFirst();
      },
      onError
    )
  );

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
  state = emptyState();
}

export const cloud = {
  // Topics
  /** Topics with the answers this user may see merged back in. */
  getTopics(): TopicPackage[] {
    return state.topics.map((t) => mergeAnswers(t, state.answers[t.id]));
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
    const db = getDb();
    const batch = writeBatch(db);
    batch.set(doc(db, 'topics', topic.id), publicTopic);
    batch.set(doc(db, 'topicAnswers', topic.id), answers);
    write(batch.commit());
  },
  deleteTopic(topicId: string) {
    state.topics = state.topics.filter((t) => t.id !== topicId);
    delete state.answers[topicId];
    notify('topics-updated');
    const db = getDb();
    const batch = writeBatch(db);
    batch.delete(doc(db, 'topics', topicId));
    batch.delete(doc(db, 'topicAnswers', topicId));
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
    const ops: Op[] = [
      ...parts.flatMap((p): Op[] => [
        (b) => b.set(doc(db, 'topics', p.id), p.publicTopic),
        (b) => b.set(doc(db, 'topicAnswers', p.id), p.answers),
      ]),
      ...removed.flatMap((t): Op[] => [
        (b) => b.delete(doc(db, 'topics', t.id)),
        (b) => b.delete(doc(db, 'topicAnswers', t.id)),
      ]),
    ];
    const commits: Promise<void>[] = [];
    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      ops.slice(i, i + 400).forEach((op) => op(batch));
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
