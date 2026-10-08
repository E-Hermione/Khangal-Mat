import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { getDb } from './firebase';
import { TopicPackage } from '../types';

/**
 * A topic's lesson versions, so an overwritten edit can be brought back:
 * topicHistory/{topicId}/versions/{id} (admin only). A version is one "file": the lesson as it
 * first was, and each file import. One version is in use; edits saved by hand update it in place
 * (its time), and switching to another version adds nothing. The newest 30 are kept.
 */
export type VersionKind = 'save' | 'import' | 'original' | 'restore';
export type SaveMode = 'edit' | 'import';

export interface TopicVersion {
  id: string;
  // When the version began, and when it was last changed by hand
  savedAt: number;
  updatedAt?: number;
  kind: VersionKind;
  topic: TopicPackage;
  // The version in use on the site
  current?: boolean;
  // The parts a file brought in with this version (unset on older versions)
  parts?: string[];
}

const KEEP = 30;
const versions = (topicId: string) => collection(getDb(), 'topicHistory', topicId, 'versions');

// Key order, empty fields and what saving derives (a test question's answer check) do not count:
// Firestore hands maps back with sorted keys
const canonical = (x: unknown): unknown => {
  if (Array.isArray(x)) return x.map(canonical);
  if (x && typeof x === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(x).sort()) {
      const v = (x as Record<string, unknown>)[k];
      if (v === undefined || v === null || v === '' || v === false || k === 'answerHash') continue;
      out[k] = canonical(v);
    }
    return out;
  }
  return x;
};

/** A short fingerprint of any lesson content (a whole topic or one part of it). */
export function partHash(value: unknown): string {
  const text = JSON.stringify(canonical(value ?? null));
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${text.length}-${(h >>> 0).toString(36)}`;
}

function contentHash(topic: TopicPackage): string {
  const { description, theory, examples, practice, test1, test2, test3 } = topic;
  return partHash({ description, theory, examples, practice, test1, test2, test3 });
}

/** Newest first; a content saved several times shows once, with the date it was first saved. */
export async function loadTopicVersions(topicId: string): Promise<TopicVersion[]> {
  const snap = await getDocs(query(versions(topicId), orderBy('savedAt', 'asc')));
  const seen = new Map<string, TopicVersion>();
  const list: TopicVersion[] = [];
  for (const d of snap.docs) {
    const v = { id: d.id, ...(d.data() as Omit<TopicVersion, 'id'>) };
    const hash = contentHash(v.topic);
    const same = seen.get(hash);
    if (same) {
      if (v.current) same.current = true;
      continue;
    }
    seen.set(hash, v);
    list.push(v);
  }
  return list.reverse();
}

// Firestore refuses undefined fields
const clean = (topic: TopicPackage) => JSON.parse(JSON.stringify(topic)) as TopicPackage;

// Only one version is the one in use («current»)
async function clearCurrent(topicId: string): Promise<void> {
  const cur = await getDocs(query(versions(topicId), where('current', '==', true)));
  await Promise.all(cur.docs.map((d) => updateDoc(d.ref, { current: false })));
}

export const LESSON_PARTS = ['theory', 'examples', 'practice', 'test1', 'test2', 'test3'] as const;

async function addVersion(topic: TopicPackage, kind: VersionKind, current: boolean, parts: string[] = [...LESSON_PARTS]): Promise<void> {
  const t = clean(topic);
  if (current) await clearCurrent(topic.id);
  await addDoc(versions(topic.id), { savedAt: Date.now(), kind, hash: contentHash(t), topic: t, current, parts });
  const old = await getDocs(query(versions(topic.id), orderBy('savedAt', 'desc'), limit(KEEP + 10)));
  await Promise.all(old.docs.slice(KEEP).filter((d) => !d.data().current).map((d) => deleteDoc(d.ref)));
}

/**
 * After a save. A hand edit updates the version in use (its time becomes the edit's time); an
 * import starts a new version and puts it in use (the first time, the lesson as it was before goes
 * in first, so nothing is lost).
 */
/** A lesson with nothing in it (it was deleted): never kept as a version. */
export const isEmptyLesson = (t: TopicPackage) =>
  !t.theory?.length &&
  !t.examples?.length &&
  !t.practice?.length &&
  !t.test1?.questions?.length &&
  !t.test2?.questions?.length &&
  !t.test3?.questions?.length;

// History writes run one after another; opening the history waits for them
let pending: Promise<unknown> = Promise.resolve();
const queued = <T>(job: () => Promise<T>): Promise<T> => {
  const run = pending.then(job, job);
  pending = run.catch(() => undefined);
  return run;
};

export function recordTopicSave(before: TopicPackage, after: TopicPackage, mode: SaveMode): Promise<void> {
  return queued(() => recordTopicSaveNow(before, after, mode));
}

async function recordTopicSaveNow(before: TopicPackage, after: TopicPackage, mode: SaveMode): Promise<void> {
  if (isEmptyLesson(after)) return;
  if (mode === 'edit') {
    const cur = await getDocs(query(versions(after.id), where('current', '==', true), limit(1)));
    const target = cur.empty ? await getDocs(query(versions(after.id), orderBy('savedAt', 'desc'), limit(1))) : cur;
    if (target.empty) return addVersion(after, 'original', true);
    const t = clean(after);
    await updateDoc(target.docs[0].ref, { topic: t, hash: contentHash(t), updatedAt: Date.now(), current: true });
    return;
  }
  const any = await getDocs(query(versions(after.id), limit(1)));
  if (any.empty && !isEmptyLesson(before)) await addVersion(before, 'original', false);
  // The parts this import brought in (each part's own history lists only these)
  const parts = LESSON_PARTS.filter((k) => partHash(before[k]) !== partHash(after[k]));
  await addVersion(after, 'import', true, parts);
}

/**
 * The lesson as it is on the site is always in the history, marked as the one in use: added if
 * no version holds it (e.g. the history was emptied), marked if a version does.
 */
export function ensureCurrentVersion(saved: TopicPackage): Promise<void> {
  return queued(() => ensureCurrentNow(saved));
}

async function ensureCurrentNow(saved: TopicPackage): Promise<void> {
  if (isEmptyLesson(saved)) return;
  const hash = contentHash(clean(saved));
  const all = await getDocs(versions(saved.id));
  const same = all.docs.filter((d) => contentHash(d.data().topic as TopicPackage) === hash);
  if (!same.length) return addVersion(saved, 'original', true);
  if (same.some((d) => d.data().current)) return;
  await clearCurrent(saved.id);
  await updateDoc(same[0].ref, { current: true });
}

/**
 * Removes a version, with any copies of the same content (the list shows them as one). The version
 * in use goes only when it is the last one left (the editor then empties the lesson on the site).
 */
export function deleteTopicVersion(topicId: string, version: TopicVersion, inUseToo = false): Promise<void> {
  return queued(async () => {
    const hash = contentHash(version.topic);
    const all = await getDocs(versions(topicId));
    await Promise.all(
      all.docs
        .filter((d) => (inUseToo || !d.data().current) && contentHash(d.data().topic as TopicPackage) === hash)
        .map((d) => deleteDoc(d.ref))
    );
  });
}

/** Puts a saved version in use; no new version is added. */
export function switchToVersion(topicId: string, versionId: string): Promise<void> {
  return queued(async () => {
    await clearCurrent(topicId);
    await updateDoc(doc(versions(topicId), versionId), { current: true });
  });
}

/** The lesson parts of a topic as JSON in the «Файлаас оруулах» format. */
export function topicJson(topic: TopicPackage): string {
  const { description, theory, examples, practice, test1, test2, test3 } = topic;
  return JSON.stringify({ description, theory, examples, practice, test1, test2, test3 }, null, 2);
}
