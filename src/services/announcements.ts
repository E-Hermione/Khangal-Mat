import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDb } from './firebase';

/**
 * Announcements from the admin.
 * - announcements/{id}: every announcement. Members can read only the ones sent to everyone.
 * - users/{uid}/inbox/{id}: a copy for each recipient of an announcement sent to a group.
 * - users/{uid}/announcementReads/{id}: when that user read it (the admin counts these).
 */

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  // Shown until this moment (end of the chosen day); null means no end
  expiresAt?: number | null;
  audience: 'all' | 'group';
  // Admin-facing description of who it went to, e.g. "8-р анги"
  targetLabel: string;
  recipientUids: string[];
}

export type InboxItem = Pick<Announcement, 'id' | 'title' | 'body' | 'createdAt' | 'expiresAt'>;

export function isExpired(a: { expiresAt?: number | null }): boolean {
  return typeof a.expiresAt === 'number' && Date.now() > a.expiresAt;
}

const BATCH_LIMIT = 450;

async function commitInChunks(ops: ((b: ReturnType<typeof writeBatch>) => void)[]) {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(getDb());
    ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch));
    await batch.commit();
  }
}

/** Admin: sends to everyone (recipientUids empty) or to the given accounts. */
export async function sendAnnouncement(
  input: Pick<Announcement, 'title' | 'body' | 'audience' | 'targetLabel' | 'recipientUids' | 'expiresAt'>
): Promise<void> {
  const db = getDb();
  const ref = doc(collection(db, 'announcements'));
  const createdAt = Date.now();
  const recipientUids = input.audience === 'all' ? [] : input.recipientUids;
  const expiresAt = input.expiresAt ?? null;
  const ann: Announcement = { ...input, id: ref.id, createdAt, recipientUids, expiresAt };
  const item: InboxItem = { id: ref.id, title: input.title, body: input.body, createdAt, expiresAt };
  await commitInChunks([
    (b) => b.set(ref, ann),
    ...recipientUids.map((uid) => (b: ReturnType<typeof writeBatch>) => b.set(doc(db, 'users', uid, 'inbox', ref.id), item)),
  ]);
}

/** Admin: changes until when it is shown (also on the recipients' copies). */
export async function updateAnnouncementExpiry(ann: Announcement, expiresAt: number | null): Promise<void> {
  const db = getDb();
  await commitInChunks([
    (b) => b.update(doc(db, 'announcements', ann.id), { expiresAt }),
    ...ann.recipientUids.map((uid) => (b: ReturnType<typeof writeBatch>) => b.update(doc(db, 'users', uid, 'inbox', ann.id), { expiresAt })),
  ]);
}

/** Admin: removes it for everyone. */
export async function deleteAnnouncement(ann: Announcement): Promise<void> {
  const db = getDb();
  const reads = await getDocs(query(collectionGroup(db, 'announcementReads'), where('announcementId', '==', ann.id)));
  await commitInChunks([
    ...ann.recipientUids.map((uid) => (b: ReturnType<typeof writeBatch>) => b.delete(doc(db, 'users', uid, 'inbox', ann.id))),
    ...reads.docs.map((d) => (b: ReturnType<typeof writeBatch>) => b.delete(d.ref)),
    (b) => b.delete(doc(db, 'announcements', ann.id)),
  ]);
}

/** Admin: all announcements, newest first, with how many recipients read each one. */
export async function loadAnnouncementsWithReads(): Promise<(Announcement & { readCount: number })[]> {
  const db = getDb();
  const [anns, reads] = await Promise.all([
    getDocs(collection(db, 'announcements')),
    getDocs(collectionGroup(db, 'announcementReads')),
  ]);
  const counts = new Map<string, number>();
  reads.docs.forEach((d) => {
    const id = d.data().announcementId as string;
    counts.set(id, (counts.get(id) || 0) + 1);
  });
  return anns.docs
    .map((d) => ({ ...(d.data() as Announcement), readCount: counts.get(d.id) || 0 }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Member: everything addressed to this account, plus which ones were already read. */
export function subscribeMyAnnouncements(
  uid: string,
  onChange: (items: InboxItem[], readIds: Set<string>) => void
): () => void {
  const db = getDb();
  let common: InboxItem[] = [];
  let personal: InboxItem[] = [];
  let readIds = new Set<string>();
  const emit = () => {
    const byId = new Map<string, InboxItem>();
    [...common, ...personal].forEach((a) => byId.set(a.id, a));
    // Past their end date they are no longer shown
    const live = [...byId.values()].filter((a) => !isExpired(a));
    onChange(live.sort((a, b) => b.createdAt - a.createdAt), readIds);
  };
  const onError = (err: unknown) => console.error('Announcements failed to load', err);
  const toItem = (d: { id: string; data: () => Record<string, unknown> }): InboxItem => {
    const x = d.data();
    return {
      id: d.id,
      title: String(x.title || ''),
      body: String(x.body || ''),
      createdAt: Number(x.createdAt) || 0,
      expiresAt: typeof x.expiresAt === 'number' ? x.expiresAt : null,
    };
  };

  const unsubs = [
    onSnapshot(
      query(collection(db, 'announcements'), where('audience', '==', 'all')),
      (snap) => {
        common = snap.docs.map(toItem);
        emit();
      },
      onError
    ),
    onSnapshot(
      collection(db, 'users', uid, 'inbox'),
      (snap) => {
        personal = snap.docs.map(toItem);
        emit();
      },
      onError
    ),
    onSnapshot(
      collection(db, 'users', uid, 'announcementReads'),
      (snap) => {
        readIds = new Set(snap.docs.map((d) => d.id));
        emit();
      },
      onError
    ),
  ];
  return () => unsubs.forEach((u) => u());
}

export async function markAnnouncementsRead(uid: string, ids: string[]): Promise<void> {
  const db = getDb();
  await Promise.all(
    ids.map((id) =>
      setDoc(doc(db, 'users', uid, 'announcementReads', id), { announcementId: id, uid, at: Date.now() })
    )
  );
}
