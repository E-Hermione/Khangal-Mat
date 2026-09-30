import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getFunctions, httpsCallable, connectFunctionsEmulator, Functions } from 'firebase/functions';

// Firebase web config comes from VITE_FIREBASE_* variables (see .env.example).
// These values are public identifiers, not secrets.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId);

// Must match the region in functions/src/index.ts
const FUNCTIONS_REGION = 'asia-east1';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;

function splitHost(hostPort: string): [string, number] {
  const [host, port] = hostPort.split(':');
  return [host, Number(port)];
}

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase тохируулаагүй байна. Админд хандана уу.');
  }
  if (!app) app = initializeApp(config);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
    if (emulatorHost) {
      connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
    }
  }
  return auth;
}

export function getDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
    const emulatorHost = import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST;
    if (emulatorHost) connectFirestoreEmulator(db, ...splitHost(emulatorHost));
  }
  return db;
}

function getFirebaseFunctions(): Functions {
  if (!functions) {
    functions = getFunctions(getFirebaseApp(), FUNCTIONS_REGION);
    const emulatorHost = import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST;
    if (emulatorHost) connectFunctionsEmulator(functions, ...splitHost(emulatorHost));
  }
  return functions;
}

function callableErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { code?: string }).code;
  // HttpsError messages from our functions are already user-facing Mongolian text;
  // the SDK may append the HTTP status, e.g. "... [429]".
  if (code?.startsWith('functions/') && err instanceof Error && err.message !== 'internal') {
    return err.message.replace(/\s*\[\d+\]$/, '');
  }
  return fallback;
}

/** Calls a Cloud Function, turning its error into an Error with a user-facing message. */
export async function callFunction<Req, Res>(name: string, data: Req, fallbackError: string): Promise<Res> {
  try {
    const res = await httpsCallable<Req, Res>(getFirebaseFunctions(), name)(data);
    return res.data;
  } catch (err) {
    throw new Error(callableErrorMessage(err, fallbackError));
  }
}

/** Emails a 6-digit verification code to the address. */
export async function sendEmailCode(email: string): Promise<void> {
  await callFunction('sendEmailCode', { email }, 'Код илгээж чадсангүй. Дахин оролдоно уу.');
}

/** Checks the code the user typed; resolves with the verified email. */
export async function verifyEmailCode(email: string, code: string): Promise<string> {
  const res = await callFunction<{ email: string; code: string }, { verified: boolean; email: string }>(
    'verifyEmailCode',
    { email, code },
    'Кодыг шалгаж чадсангүй. Дахин оролдоно уу.'
  );
  return res.email;
}
