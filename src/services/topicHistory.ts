import { addDoc, collection, deleteDoc, getDocs, limit, orderBy, query, updateDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { TopicPackage } from '../types';

/**
 * A topic's lesson versions, so an overwritten edit can be brought back:
 * topicHistory/{topicId}/versions/{id} (admin only). A version is one "file": the lesson as it
 * first was, each file import and each restore. Edits saved by hand update the newest version
 * in place (its last-changed time), so they never add rows. The newest 30 are kept.
 */
export type VersionKind = 'save' | 'import' | 'original' | 'restore';
export type SaveMode = 'edit' | 'import' | 'restore';

export interface TopicVersion {
  id: string;
  // When the version began, and when it was last changed by hand
  savedAt: number;
  updatedAt?: number;
  kind: VersionKind;
  topic: TopicPackage;
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
  const seen = new Set<string>();
  const list: TopicVersion[] = [];
  for (const d of snap.docs) {
    const v = { id: d.id, ...(d.data() as Omit<TopicVersion, 'id'>) };
    const hash = contentHash(v.topic);
    if (seen.has(hash)) continue;
    seen.add(hash);
    list.push(v);
  }
  return list.reverse();
}

// Firestore refuses undefined fields
const clean = (topic: TopicPackage) => JSON.parse(JSON.stringify(topic)) as TopicPackage;

async function addVersion(topic: TopicPackage, kind: VersionKind): Promise<void> {
  const t = clean(topic);
  await addDoc(versions(topic.id), { savedAt: Date.now(), kind, hash: contentHash(t), topic: t });
  const old = await getDocs(query(versions(topic.id), orderBy('savedAt', 'desc'), limit(KEEP + 10)));
  await Promise.all(old.docs.slice(KEEP).map((d) => deleteDoc(d.ref)));
}

/**
 * After a save: a hand edit updates the newest version; an import or a restore starts a new one
 * (the first time, the lesson as it was before goes in first, so nothing is lost).
 */
export async function recordTopicSave(before: TopicPackage, after: TopicPackage, mode: SaveMode): Promise<void> {
  const newest = await getDocs(query(versions(after.id), orderBy('savedAt', 'desc'), limit(1)));
  if (mode === 'edit') {
    if (newest.empty) return addVersion(after, 'original');
    const t = clean(after);
    await updateDoc(newest.docs[0].ref, { topic: t, hash: contentHash(t), updatedAt: Date.now() });
    return;
  }
  if (newest.empty) await addVersion(before, 'original');
  await addVersion(after, mode);
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
