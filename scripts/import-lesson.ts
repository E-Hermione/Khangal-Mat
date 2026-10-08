/**
 * Puts one part of a topic's lesson on the live site from a .json file, the way the editor's
 * «Файлаас оруулах» does: only that part changes, answers go to the protected topicAnswers, and
 * the topic's history gets a row for the file.
 *
 *   FIREBASE_SERVICE_ACCOUNT='{...}' npx tsx scripts/import-lesson.ts <topicId> <part> <file.json> [--dry]
 *
 * part: theory | examples | practice | test1 | test2 | test3
 * The key comes from FIREBASE_SERVICE_ACCOUNT_B64 (or FIREBASE_SERVICE_ACCOUNT).
 * Lesson content never goes in this repository: the file is passed in from outside.
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { mergeAnswers, splitTopic } from '../src/services/answers';
import { getQuestionOptions } from '../src/utils/examGrading';
import { withExampleSolutions } from '../src/utils/exampleSolution';
import { TopicPackage } from '../src/types';

const PARTS = ['theory', 'examples', 'practice', 'test1', 'test2', 'test3'] as const;
type Part = (typeof PARTS)[number];

const [topicId, part, file] = process.argv.slice(2) as [string, Part, string];
const dry = process.argv.includes('--dry');
if (!topicId || !PARTS.includes(part) || !file) {
  console.error('Usage: import-lesson.ts <topicId> <part> <file.json> [--dry]');
  process.exit(1);
}

// The key: FIREBASE_SERVICE_ACCOUNT_B64 (the .json file in base64, safe in any environment
// setting) or FIREBASE_SERVICE_ACCOUNT (the .json text itself)
function serviceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  return JSON.parse(b64 ? Buffer.from(b64.trim(), 'base64').toString('utf8') : process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
}

// Against the local emulator (FIRESTORE_EMULATOR_HOST set) no key is needed
initializeApp(
  process.env.FIRESTORE_EMULATOR_HOST
    ? { projectId: process.env.GCLOUD_PROJECT || 'demo-matmate' }
    : { credential: cert(serviceAccount()) }
);
const db = getFirestore();
const clean = <T>(x: T): T => JSON.parse(JSON.stringify(x));

const topicRef = db.doc(`topics/${topicId}`);
const snap = await topicRef.get();
if (!snap.exists) throw new Error(`No topic ${topicId}`);
const answers = (await db.doc(`topicAnswers/${topicId}`).get()).data();
const before = withExampleSolutions(mergeAnswers(snap.data() as TopicPackage, answers as never));

// The part from the file: on its own (a list, or the test) or inside a whole-topic file
const data = JSON.parse(readFileSync(file, 'utf8'));
const own = part.startsWith('test') ? (Array.isArray(data?.questions) ? data : undefined) : Array.isArray(data) ? data : undefined;
const value = own ?? data?.[part];
const pre = (id: string) => (id.startsWith(`${topicId}-`) ? id : `${topicId}-${id}`);
const withIds = <T extends { id: string }>(list: T[] = []) => list.map((x) => ({ ...x, id: pre(x.id) }));
const after = { ...before } as TopicPackage;
if (part.startsWith('test')) {
  if (!Array.isArray(value?.questions)) throw new Error(`No ${part} in ${file}`);
  const n = Number(part.slice(4)) as 1 | 2 | 3;
  after[part as 'test1'] = { ...value, id: pre(value.id || part), testNumber: n, questions: withIds(value.questions) };
} else {
  if (!Array.isArray(value)) throw new Error(`No ${part} in ${file}`);
  (after as unknown as Record<string, unknown>)[part] = withIds(value);
}
const next = withExampleSolutions(after);

const count = (t: TopicPackage) => (part.startsWith('test') ? t[part as 'test1']?.questions?.length : (t[part as 'theory'] as unknown[])?.length) ?? 0;
console.log(`${topicId} · ${part}: ${count(before)} → ${count(next)} items${dry ? ' (dry run, nothing written)' : ''}`);
if (dry) process.exit(0);

// Same split as the site: public lesson, protected answers, the tests for every member
const { publicTopic, answers: hidden } = splitTopic(next, getQuestionOptions);
const batch = db.batch();
batch.set(topicRef, clean(publicTopic));
batch.set(db.doc(`topicAnswers/${topicId}`), clean(hidden));
batch.set(db.doc(`topicTests/${topicId}`), clean({ test1: publicTopic.test1, test2: publicTopic.test2, test3: publicTopic.test3 }));

// History: the file gets its row (the same file name updates its row), and is the one in use
const versions = db.collection(`topicHistory/${topicId}/versions`);
const all = await versions.get();
all.docs.filter((d) => d.data().current).forEach((d) => batch.update(d.ref, { current: false }));
const name = basename(file);
const same = all.docs.find((d) => d.data().file === name);
if (same) {
  batch.update(same.ref, { topic: clean(next), updatedAt: Date.now(), current: true, parts: FieldValue.arrayUnion(part) });
} else {
  if (all.empty) batch.set(versions.doc(), { savedAt: Date.now() - 1, kind: 'original', topic: clean(before), current: false, parts: [...PARTS] });
  batch.set(versions.doc(), { savedAt: Date.now(), kind: 'import', topic: clean(next), current: true, parts: [part], file: name });
}
await batch.commit();
console.log('Saved.');
