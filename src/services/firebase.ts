import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, connectAuthEmulator, Auth } from 'firebase/auth';

// Firebase web config comes from VITE_FIREBASE_* variables (see .env.example).
// These values are public identifiers, not secrets.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId);

let auth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (!auth) {
    const app: FirebaseApp = initializeApp(config);
    auth = getAuth(app);
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
