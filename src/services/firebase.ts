import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, connectAuthEmulator, Auth } from 'firebase/auth';
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
let functions: Functions | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase тохируулаагүй байна. Админд хандана уу.');
  }
  if (!app) app = initializeApp(config);
  return app;
}

function getFirebaseFunctions(): Functions {
  if (!functions) {
    functions = getFunctions(getFirebaseApp(), FUNCTIONS_REGION);
    const emulatorHost = import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST;
    if (emulatorHost) {
      const [host, port] = emulatorHost.split(':');
      connectFunctionsEmulator(functions, host, Number(port));
    }
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

/** Emails a 6-digit verification code to the address. */
export async function sendEmailCode(email: string): Promise<void> {
  try {
    await httpsCallable(getFirebaseFunctions(), 'sendEmailCode')({ email });
  } catch (err) {
    throw new Error(callableErrorMessage(err, 'Код илгээж чадсангүй. Дахин оролдоно уу.'));
  }
}

/** Checks the code the user typed; resolves with the verified email. */
export async function verifyEmailCode(email: string, code: string): Promise<string> {
  try {
    const res = await httpsCallable<{ email: string; code: string }, { verified: boolean; email: string }>(
      getFirebaseFunctions(),
      'verifyEmailCode'
    )({ email, code });
    return res.data.email;
  } catch (err) {
    throw new Error(callableErrorMessage(err, 'Кодыг шалгаж чадсангүй. Дахин оролдоно уу.'));
  }
}

function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    const emulatorHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
    if (emulatorHost) {
      connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
    }
  }
  return auth;
}

export interface VerifiedGoogleAccount {
  email: string;
  displayName: string;
}

/**
 * Opens the Google sign-in popup and returns the account's email once Google has verified it.
 * The Firebase session is not kept; the app still manages its own login state.
 */
export async function verifyGmailWithGoogle(): Promise<VerifiedGoogleAccount> {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase тохируулаагүй байна. Админд хандана уу.');
  }

  const firebaseAuth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    const result = await signInWithPopup(firebaseAuth, provider);
    const { email, emailVerified, displayName } = result.user;
    if (!email || !emailVerified) {
      throw new Error('Google бүртгэлийн имэйл баталгаажаагүй байна.');
    }
    return { email: email.toLowerCase(), displayName: displayName || '' };
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error('Google-ээр нэвтрэх цонхыг хаасан байна.');
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('Хөтөч popup цонхыг хаасан байна. Зөвшөөрөөд дахин оролдоно уу.');
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error('Энэ домэйн Firebase-д зөвшөөрөгдөөгүй байна. Админд хандана уу.');
    }
    if (err instanceof Error && !code) throw err;
    throw new Error('Google-ээр баталгаажуулж чадсангүй. Дахин оролдоно уу.');
  } finally {
    await signOut(firebaseAuth).catch(() => {});
  }
}
