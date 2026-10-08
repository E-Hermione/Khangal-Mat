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
}

const KEEP = 30;
const versions = (topicId: string) => collection(getDb(), 'topicHistory', topicId, 'versions');

/** A short fingerprint of a version's lesson content, to tell identical versions apart. */
// Key order and empty fields do not count: Firestore hands maps back with sorted keys
const canonical = (x: unknown): unknown => {
  if (Array.isArray(x)) return x.map(canonical);
  if (x && typeof x === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(x).sort()) {
      const v = (x as Record<string, unknown>)[k];
      if (v === undefined || v === null || v === '' || v === false) continue;
      out[k] = canonical(v);
    }
    return out;
  }
  return x;
};

function contentHash(topic: TopicPackage): string {
  const { description, theory, examples, practice, test1, test2, test3 } = topic;
  const text = JSON.stringify(canonical({ description, theory, examples, practice, test1, test2, test3 }));
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${text.length}-${(h >>> 0).toString(36)}`;
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

async function addVersion(topic: TopicPackage, kind: VersionKind, current: boolean): Promise<void> {
  const t = clean(topic);
  if (current) await clearCurrent(topic.id);
  await addDoc(versions(topic.id), { savedAt: Date.now(), kind, hash: contentHash(t), topic: t, current });
  const old = await getDocs(query(versions(topic.id), orderBy('savedAt', 'desc'), limit(KEEP + 10)));
  await Promise.all(old.docs.slice(KEEP).filter((d) => !d.data().current).map((d) => deleteDoc(d.ref)));
}

/**
 * After a save. A hand edit updates the version in use (its time becomes the edit's time); an
 * import starts a new version and puts it in use (the first time, the lesson as it was before goes
 * in first, so nothing is lost).
 */
export async function recordTopicSave(before: TopicPackage, after: TopicPackage, mode: SaveMode): Promise<void> {
  if (mode === 'edit') {
    const cur = await getDocs(query(versions(after.id), where('current', '==', true), limit(1)));
    const target = cur.empty ? await getDocs(query(versions(after.id), orderBy('savedAt', 'desc'), limit(1))) : cur;
    if (target.empty) return addVersion(after, 'original', true);
    const t = clean(after);
    await updateDoc(target.docs[0].ref, { topic: t, hash: contentHash(t), updatedAt: Date.now(), current: true });
    return;
  }
  const any = await getDocs(query(versions(after.id), limit(1)));
  if (any.empty) await addVersion(before, 'original', false);
  await addVersion(after, 'import', true);
}

/** Removes a version, with any copies of the same content (the list shows them as one). */
export async function deleteTopicVersion(topicId: string, version: TopicVersion): Promise<void> {
  const hash = contentHash(version.topic);
  const all = await getDocs(versions(topicId));
  await Promise.all(
    all.docs.filter((d) => !d.data().current && contentHash(d.data().topic as TopicPackage) === hash).map((d) => deleteDoc(d.ref))
  );
}

/** Puts a saved version in use; no new version is added. */
export async function switchToVersion(topicId: string, versionId: string): Promise<void> {
  await clearCurrent(topicId);
  await updateDoc(doc(versions(topicId), versionId), { current: true });
}

/** The lesson parts of a topic as JSON in the «Файлаас оруулах» format. */
export function topicJson(topic: TopicPackage): string {
  const { description, theory, examples, practice, test1, test2, test3 } = topic;
  return JSON.stringify({ description, theory, examples, practice, test1, test2, test3 }, null, 2);
}

/** The same, saved as a .json file. */
export function downloadTopicJson(topic: TopicPackage, name: string) {
  const blob = new Blob([topicJson(topic)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
