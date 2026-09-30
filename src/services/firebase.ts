import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';

// Firebase web config comes from VITE_FIREBASE_* variables (see .env.example).
// These values are public identifiers, not secrets.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

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
    // Verification emails in Mongolian where Firebase supports it
    auth.languageCode = 'mn';
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
