import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  updateDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './firebase';
import { TopicPackage, UserPermissions, DefaultPermissionsConfig, AccessRequest, UserProfile } from '../types';

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
}

export const DEFAULT_APP_SETTINGS: AppSettings = { screenProtection: false, deviceLimit: true };

interface CloudState {
  topics: TopicPackage[];
  visibility: VisibilityDoc | null;
  defaultPermissions: DefaultPermissionsConfig | null;
  appSettings: AppSettings;
  userPermissions: Record<string, UserPermissions>;
  users: UserProfile[];
  requests: AccessRequest[];
}

const emptyState = (): CloudState => ({
  topics: [],
  visibility: null,
  defaultPermissions: null,
  appSettings: DEFAULT_APP_SETTINGS,
  userPermissions: {},
  users: [],
  requests: [],
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
    listen((onFirst, onError) =>
      onSnapshot(
        collection(db, 'accessRequests'),
        (snap) => {
          state.requests = snap.docs.map((d) => ({ ...(d.data() as AccessRequest), id: d.id }));
          notify('access-requests-updated');
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
  state = emptyState();
}

export const cloud = {
  // Topics
  getTopics(): TopicPackage[] {
    return state.topics;
  },
  setTopic(topic: TopicPackage) {
    const i = state.topics.findIndex((t) => t.id === topic.id);
    state.topics = i >= 0 ? state.topics.map((t, j) => (j === i ? topic : t)) : [...state.topics, topic];
    notify('topics-updated');
    write(setDoc(doc(getDb(), 'topics', topic.id), clean(topic)));
  },
  deleteTopic(topicId: string) {
    state.topics = state.topics.filter((t) => t.id !== topicId);
    notify('topics-updated');
    write(deleteDoc(doc(getDb(), 'topics', topicId)));
  },
  /** Replaces the whole topic collection (import, reset to defaults, first-time seeding). */
  replaceTopics(topics: TopicPackage[]): Promise<void> {
    const db = getDb();
    const keep = new Set(topics.map((t) => t.id));
    const removed = state.topics.filter((t) => !keep.has(t.id));
    state.topics = topics;
    notify('topics-updated');
    // Batches are limited to 500 writes
    const ops = [
      ...topics.map((t) => (b: ReturnType<typeof writeBatch>) => b.set(doc(db, 'topics', t.id), clean(t))),
      ...removed.map((t) => (b: ReturnType<typeof writeBatch>) => b.delete(doc(db, 'topics', t.id))),
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

  // Topic unlock requests (admin reads; members only create)
  getRequests(): AccessRequest[] {
    return state.requests;
  },
  addRequest(request: AccessRequest): Promise<void> {
    return setDoc(doc(getDb(), 'accessRequests', request.id), clean(request));
  },
  updateRequest(id: string, update: Partial<AccessRequest>) {
    state.requests = state.requests.map((r) => (r.id === id ? { ...r, ...update } : r));
    notify('access-requests-updated');
    write(updateDoc(doc(getDb(), 'accessRequests', id), clean(update)));
  },
  deleteRequest(id: string) {
    state.requests = state.requests.filter((r) => r.id !== id);
    notify('access-requests-updated');
    write(deleteDoc(doc(getDb(), 'accessRequests', id)));
  },
};
