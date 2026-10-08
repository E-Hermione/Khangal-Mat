import { addDoc, collection, deleteDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { getDb } from './firebase';
import { TopicPackage } from '../types';

/**
 * Every saved version of a topic's lesson, so an overwritten edit can be brought back:
 * topicHistory/{topicId}/versions/{id} (admin only). The newest 30 are kept.
 */
export type VersionKind = 'save' | 'import' | 'original';

export interface TopicVersion {
  id: string;
  savedAt: number;
  kind: VersionKind;
  topic: TopicPackage;
}

const KEEP = 30;
const versions = (topicId: string) => collection(getDb(), 'topicHistory', topicId, 'versions');

/** A short fingerprint of a version's lesson content, to tell identical versions apart. */
function contentHash(topic: TopicPackage): string {
  const text = topicJson(topic);
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

export async function saveTopicVersion(topic: TopicPackage, kind: VersionKind): Promise<void> {
  // Firestore refuses undefined fields
  const clean = JSON.parse(JSON.stringify(topic)) as TopicPackage;
  const hash = contentHash(clean);
  // The same content already kept: it stays under the date it was first saved
  const same = await getDocs(query(versions(topic.id), where('hash', '==', hash), limit(1)));
  if (!same.empty) return;
  await addDoc(versions(topic.id), { savedAt: Date.now(), kind, hash, topic: clean });
  const old = await getDocs(query(versions(topic.id), orderBy('savedAt', 'desc'), limit(KEEP + 10)));
  await Promise.all(old.docs.slice(KEEP).map((d) => deleteDoc(d.ref)));
}

/** Saves a version; the first time a topic is saved, the version it had before goes in first. */
export async function recordTopicSave(before: TopicPackage, after: TopicPackage, imported: boolean): Promise<void> {
  const existing = await getDocs(query(versions(after.id), limit(1)));
  if (existing.empty) await saveTopicVersion(before, 'original');
  await saveTopicVersion(after, imported ? 'import' : 'save');
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
