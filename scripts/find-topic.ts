/**
 * Finds a topic's id on the live site by (part of) its title, to use with import-lesson.ts.
 *   npx tsx scripts/find-topic.ts "Энгийн бутархай"
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
const key = JSON.parse(b64 ? Buffer.from(b64.trim(), 'base64').toString('utf8') : process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId: 'demo-matmate' } : { credential: cert(key) });

const q = (process.argv[2] || '').toLowerCase();
const snap = await getFirestore().collection('topicIndex').get();
snap.docs
  .map((d) => ({ id: d.id, ...(d.data() as { title?: string; grade?: number }) }))
  .filter((t) => (t.title || '').toLowerCase().includes(q))
  .sort((a, b) => (a.grade || 0) - (b.grade || 0))
  .forEach((t) => console.log(`${t.grade}-р анги · ${t.title} · ${t.id}`));
