import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getDb, callFunction } from './firebase';
import { AuthUser, GradeNumber, UserProfile } from '../types';
import { getOrCreateDeviceId } from '../utils/deviceManager';

// Must match ADMIN_EMAIL in functions/src/index.ts and firestore.rules
export const ADMIN_EMAIL = 'ehangal625@gmail.com';

function authErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { code?: string }).code;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Утасны дугаар (имэйл) эсвэл нууц үг буруу байна.';
    case 'auth/too-many-requests':
      return 'Хэт олон удаа оролдлоо. Түр хүлээгээд дахин оролдоно уу.';
    case 'auth/weak-password':
      return 'Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой.';
    case 'auth/network-request-failed':
      return 'Интернэт холболтоо шалгана уу.';
  }
  return err instanceof Error && !code ? err.message : fallback;
}

export interface RegistrationData {
  email: string;
  password: string;
  lastName: string;
  firstName: string;
  phoneNumber: string;
  grade: GradeNumber | 'teacher' | null;
  school: string;
}

/**
 * Creates the sign-in account and, through the completeRegistration function, the profile.
 * The email must already have been verified with a code.
 */
export async function registerAccount(data: RegistrationData): Promise<void> {
  if (data.password.trim().length < 6) {
    throw new Error('Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой.');
  }
  if (data.grade === null) {
    throw new Error('Ангиа сонгоно уу.');
  }

  const auth = getFirebaseAuth();
  const email = data.email.trim().toLowerCase();
  const password = data.password.trim();

  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    // A previous attempt may have created the sign-in account but not the profile
    if ((err as { code?: string }).code !== 'auth/email-already-in-use') {
      throw new Error(authErrorMessage(err, 'Бүртгэл үүсгэж чадсангүй.'));
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      throw new Error('Энэ имэйл хаяг аль хэдийн бүртгэлтэй байна. Нэвтэрнэ үү.');
    }
  }

  await callFunction(
    'completeRegistration',
    {
      lastName: data.lastName,
      firstName: data.firstName,
      phoneNumber: data.phoneNumber,
      grade: data.grade,
      school: data.school,
    },
    'Бүртгэл үүсгэж чадсангүй. Дахин оролдоно уу.'
  );

  // Pick up email_verified=true set by the function; the security rules require it
  await auth.currentUser?.getIdToken(true);
}

/** Signs in with an 8-digit phone number or an email address. */
export async function signInWithIdentifier(identifier: string, password: string): Promise<void> {
  const id = identifier.trim().toLowerCase();
  let email = id;

  if (/^\d{8}$/.test(id.replace(/[\s-]/g, ''))) {
    const res = await callFunction<{ phoneNumber: string }, { email: string }>(
      'resolveLoginEmail',
      { phoneNumber: id.replace(/[\s-]/g, '') },
      'Нэвтэрч чадсангүй. Дахин оролдоно уу.'
    );
    email = res.email;
  }

  try {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password.trim());
  } catch (err) {
    throw new Error(authErrorMessage(err, 'Нэвтэрч чадсангүй. Дахин оролдоно уу.'));
  }
}

export type SessionResult =
  | { status: 'ok'; user: AuthUser; profile: UserProfile | null; isAdmin: boolean }
  | { status: 'incomplete' }
  | { status: 'blocked' };

/** Builds the app's user from the Firebase account and its Firestore profile. */
export async function loadSession(fbUser: User): Promise<SessionResult> {
  const token = await fbUser.getIdTokenResult();
  const isAdmin = token.claims.email === ADMIN_EMAIL && token.claims.email_verified === true;

  const snap = await getDoc(doc(getDb(), 'users', fbUser.uid));
  const profile = snap.exists() ? (snap.data() as UserProfile) : null;

  if (!profile && !isAdmin) return { status: 'incomplete' };
  if (profile && !profile.active && !isAdmin) return { status: 'blocked' };

  return {
    status: 'ok',
    isAdmin,
    profile,
    user: {
      userId: isAdmin ? 'ADMIN-01' : profile!.userId,
      email: fbUser.email || profile?.email,
      phoneNumber: profile?.phoneNumber,
      username: fbUser.email || undefined,
      name: profile?.fullName || 'Админ',
      role: isAdmin ? 'admin' : 'teacher',
      loggedInAt: new Date().toISOString(),
      deviceId: getOrCreateDeviceId(),
    },
  };
}

export function signOutUser(): Promise<void> {
  return signOut(getFirebaseAuth());
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user?.email) throw new Error('Эхлээд нэвтэрнэ үү.');
  if (newPassword.trim().length < 6) throw new Error('Шинэ нууц үг дор хаяж 6 тэмдэгттэй байх ёстой.');

  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword.trim()));
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      throw new Error('Одоогийн нууц үг буруу байна.');
    }
    throw new Error(authErrorMessage(err, 'Нууц үг солиход алдаа гарлаа.'));
  }
  try {
    await updatePassword(user, newPassword.trim());
  } catch (err) {
    throw new Error(authErrorMessage(err, 'Нууц үг солиход алдаа гарлаа.'));
  }
}

export async function updateMyProfile(update: { fullName: string; phoneNumber: string }): Promise<UserProfile> {
  return callFunction('updateMyProfile', update, 'Мэдээлэл хадгалж чадсангүй. Дахин оролдоно уу.');
}

export async function adminDeleteUser(uid: string): Promise<void> {
  await callFunction('adminDeleteUser', { uid }, 'Хэрэглэгчийг устгаж чадсангүй.');
}
