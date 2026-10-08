/**
 * Adds an empty topic (or subtopic) to the live site, the way the admin's «Сэдэв нэмэх» does: the
 * topic, its answers, its list entry and its tests, and its place at the end of the topic list.
 * Fill it afterwards with import-lesson.ts. Prints the new topic's id.
 *
 *   npx tsx scripts/create-topic.ts --grade 6 --category "Тоо тоолол" --title "…" [--parent <topicId>] [--dry]
 *
 * An existing topic with the same title under the same parent is reused, so running it twice is safe.
 * The key comes from FIREBASE_SERVICE_ACCOUNT_B64 (or FIREBASE_SERVICE_ACCOUNT).
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { splitTopic } from '../src/services/answers';
import { getQuestionOptions } from '../src/utils/examGrading';
import { newTopic } from '../src/utils/newTopic';
import { GradeNumber } from '../src/types';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const grade = Number(arg('grade')) as GradeNumber;
const category = arg('category');
const title = arg('title');
const parentId = arg('parent');
const dry = process.argv.includes('--dry');
if (!grade || !category || !title) {
  console.error('Usage: create-topic.ts --grade <n> --category <name> --title <title> [--parent <topicId>] [--dry]');
  process.exit(1);
}

function serviceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  return JSON.parse(b64 ? Buffer.from(b64.trim(), 'base64').toString('utf8') : process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
}
initializeApp(
  process.env.FIRESTORE_EMULATOR_HOST
    ? { projectId: process.env.GCLOUD_PROJECT || 'demo-matmate' }
    : { credential: cert(serviceAccount()) }
);
const db = getFirestore();
const clean = <T>(x: T): T => JSON.parse(JSON.stringify(x));

if (parentId && !(await db.doc(`topics/${parentId}`).get()).exists) throw new Error(`No topic ${parentId}`);
const same = (await db.collection('topics').where('grade', '==', grade).where('title', '==', title).get()).docs.find(
  (d) => (d.data().parentId || undefined) === parentId
);
if (same) {
  console.log(`${same.id} (already there)`);
  process.exit(0);
}

const topic = newTopic({ grade, category, title, parentId });
console.log(`${topic.id}${dry ? ' (dry run, nothing written)' : ''}`);
if (dry) process.exit(0);

const { publicTopic, answers } = splitTopic(topic, getQuestionOptions);
const index = clean({ id: topic.id, grade, category, title, description: '', parentId });
const batch = db.batch();
batch.set(db.doc(`topics/${topic.id}`), clean(publicTopic));
batch.set(db.doc(`topicAnswers/${topic.id}`), clean(answers));
batch.set(db.doc(`topicIndex/${topic.id}`), index);
batch.set(db.doc(`topicTests/${topic.id}`), clean({ test1: publicTopic.test1, test2: publicTopic.test2, test3: publicTopic.test3 }));
batch.set(db.doc('settings/app'), { topicOrder: FieldValue.arrayUnion(topic.id) }, { merge: true });
await batch.commit();
