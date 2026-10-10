import { arrayRemove, arrayUnion, Bytes, deleteDoc, doc, getDoc, runTransaction, setDoc, writeBatch } from 'firebase/firestore';
import { getDb } from './firebase';

/**
 * Extra material for a topic: PDF files the admin adds, to read and print (admin only).
 * The list is topicMaterials/{topicId} { files: [...] }; a file's bytes are kept in pieces of at
 * most CHUNK bytes in topicMaterialChunks/{fileId}_{i} (a Firestore document holds at most 1 MiB),
 * so no separate file storage is needed.
 */
export interface TopicMaterial {
  id: string;
  name: string;
  size: number;
  chunks: number;
  uploadedAt: number;
}

const CHUNK = 900_000;
export const MAX_MATERIAL_BYTES = 25 * 1024 * 1024;

const listDoc = (topicId: string) => doc(getDb(), 'topicMaterials', topicId);
const chunkDoc = (fileId: string, i: number) => doc(getDb(), 'topicMaterialChunks', `${fileId}_${i}`);

export async function loadMaterials(topicId: string): Promise<TopicMaterial[]> {
  const snap = await getDoc(listDoc(topicId));
  const files = (snap.exists() ? (snap.data().files as TopicMaterial[]) : []) || [];
  return [...files].sort((a, b) => a.uploadedAt - b.uploadedAt);
}

export async function uploadMaterial(topicId: string, file: File, onProgress?: (done: number) => void): Promise<TopicMaterial> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Зөвхөн PDF файл оруулна.');
  if (file.size > MAX_MATERIAL_BYTES) throw new Error('Файл 25 MB-аас их байна.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const chunks = Math.max(1, Math.ceil(bytes.length / CHUNK));
  // A few pieces per batch keeps each request well under Firestore's 10 MiB limit
  for (let i = 0; i < chunks; i += 5) {
    const batch = writeBatch(getDb());
    for (let k = i; k < Math.min(chunks, i + 5); k++) {
      batch.set(chunkDoc(id, k), { topicId, fileId: id, i: k, data: Bytes.fromUint8Array(bytes.subarray(k * CHUNK, (k + 1) * CHUNK)) });
    }
    await batch.commit();
    onProgress?.(Math.min(1, (i + 5) / chunks));
  }
  const meta: TopicMaterial = { id, name: file.name, size: file.size, chunks, uploadedAt: Date.now() };
  await setDoc(listDoc(topicId), { files: arrayUnion(meta) }, { merge: true });
  return meta;
}

export async function materialBlob(m: TopicMaterial): Promise<Blob> {
  const parts = await Promise.all(
    Array.from({ length: m.chunks }, async (_, i) => {
      const snap = await getDoc(chunkDoc(m.id, i));
      if (!snap.exists()) throw new Error('Файлын хэсэг олдсонгүй.');
      return (snap.data().data as Bytes).toUint8Array();
    })
  );
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

export async function deleteMaterial(topicId: string, m: TopicMaterial): Promise<void> {
  await setDoc(listDoc(topicId), { files: arrayRemove(m) }, { merge: true });
  await Promise.all(Array.from({ length: m.chunks }, (_, i) => deleteDoc(chunkDoc(m.id, i))));
}

// A new name for a file (kept with .pdf at the end)
export async function renameMaterial(topicId: string, m: TopicMaterial, name: string): Promise<TopicMaterial> {
  const clean = name.trim().replace(/\.pdf$/i, '');
  if (!clean) throw new Error('Нэр хоосон байж болохгүй.');
  const next = { ...m, name: `${clean}.pdf` };
  await runTransaction(getDb(), async (tx) => {
    const snap = await tx.get(listDoc(topicId));
    const files = ((snap.exists() ? snap.data().files : []) || []) as TopicMaterial[];
    tx.set(listDoc(topicId), { files: files.map((f) => (f.id === m.id ? next : f)) }, { merge: true });
  });
  return next;
}
