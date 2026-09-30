import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
  User,
} from 'firebase/auth';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { getFirebaseAuth, getDb } from './firebase';
import { AuthUser, GradeNumber, UserProfile } from '../types';
import { getOrCreateDeviceId } from '../utils/deviceManager';

// Must match isAdmin() in firestore.rules
export const ADMIN_EMAIL = 'ehangal625@gmail.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authErrorMessage(err: unknown, fallback: string): string {
  const code = (err as { code?: string }).code;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Утасны дугаар (имэйл) эсвэл нууц үг буруу байна.';
    case 'auth/invalid-email':
      return 'Зөв имэйл хаяг оруулна уу.';
    case 'auth/too-many-requests':
      return 'Хэт олон удаа оролдлоо. Түр хүлээгээд дахин оролдоно уу.';
    case 'auth/weak-password':
      return 'Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой.';
    case 'auth/network-request-failed':
      return 'Интернэт холболтоо шалгана уу.';
    case 'permission-denied':
      return 'Энэ утасны дугаар аль хэдийн бүртгэлтэй байна.';
  }
  return err instanceof Error && !code ? err.message : fallback;
}

// Same USR-#### id the app has always used, derived from the phone number
export function generateUserId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return `USR-${(Math.abs(hash) % 9000) + 1000}`;
}

function cleanPhone(raw: string): string {
  const phone = raw.replace(/[\s-]/g, '');
  if (!/^\d{8}$/.test(phone)) throw new Error('Утасны дугаар 8 оронтой тоо байх ёстой.');
  return phone;
}

/** Emails the Firebase verification link to the signed-in user. */
export async function sendVerificationEmail(): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Эхлээд нэвтэрнэ үү.');
  try {
    await sendEmailVerification(user, { url: window.location.origin });
  } catch (err) {
    throw new Error(authErrorMessage(err, 'Баталгаажуулах имэйл илгээж чадсангүй.'));
  }
}

/**
 * Reloads the signed-in user and, once they have clicked the link, refreshes the token so the
 * security rules see email_verified=true. Resolves with whether the email is verified.
 */
export async function refreshEmailVerified(): Promise<boolean> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return false;
  await user.reload();
  if (!user.emailVerified) return false;
  await user.getIdToken(true);
  return true;
}

// While registerAccount runs, the app ignores sign-in changes so the form stays up
// until the profile exists (or the attempt fails).
let registering = false;
export function isRegistering(): boolean {
  return registering;
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
 * Creates the sign-in account and the profile, then emails the verification link.
 * Content stays locked (by the security rules) until the email is verified.
 */
export async function registerAccount(data: RegistrationData): Promise<void> {
  const email = data.email.trim().toLowerCase();
  const password = data.password.trim();
  const lastName = data.lastName.trim();
  const firstName = data.firstName.trim();
  const school = data.school.trim();

  if (!EMAIL_RE.test(email)) throw new Error('Зөв имэйл хаяг оруулна уу.');
  if (!lastName || !firstName) throw new Error('Овог, нэрээ заавал оруулна уу.');
  const phoneNumber = cleanPhone(data.phoneNumber);
  if (data.grade === null) throw new Error('Ангиа сонгоно уу.');
  if (!school) throw new Error('Сургуулийнхаа нэрийг оруулна уу.');
  if (password.length < 6) throw new Error('Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой.');

  const grade = data.grade;
  const auth = getFirebaseAuth();
  registering = true;
  try {
    await signInOrCreate(email, password);
    await createProfileIfMissing({
      uid: auth.currentUser!.uid,
      userId: generateUserId(phoneNumber),
      email,
      phoneNumber,
      lastName,
      firstName,
      fullName: `${lastName} ${firstName}`,
      school,
      accountType: grade === 'teacher' ? 'teacher' : 'student',
      grades: grade === 'teacher' ? [] : [grade],
      active: true,
      createdAt: Date.now(),
    });
    if (!auth.currentUser!.emailVerified) {
      await sendVerificationEmail();
    }
  } catch (err) {
    // Leave no half-registered session behind; the user can retry with the same email
    await signOut(auth).catch(() => {});
    throw err;
  } finally {
    registering = false;
  }
}

async function signInOrCreate(email: string, password: string): Promise<void> {
  const auth = getFirebaseAuth();
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
}

async function createProfileIfMissing(profile: UserProfile): Promise<void> {
  const db = getDb();
  if ((await getDoc(doc(db, 'users', profile.uid))).exists()) return;

  // The phone document is only creatable if nobody has it yet, which keeps numbers unique
  const batch = writeBatch(db);
  batch.set(doc(db, 'phones', profile.phoneNumber), { uid: profile.uid, email: profile.email });
  batch.set(doc(db, 'users', profile.uid), profile);
  try {
    await batch.commit();
  } catch (err) {
    throw new Error(authErrorMessage(err, 'Бүртгэл үүсгэж чадсангүй. Дахин оролдоно уу.'));
  }
}

/** Signs in with an 8-digit phone number or an email address. */
export async function signInWithIdentifier(identifier: string, password: string): Promise<void> {
  const id = identifier.trim().toLowerCase();
  let email = id;

  const digits = id.replace(/[\s-]/g, '');
  if (/^\d{8}$/.test(digits)) {
    const phone = await getDoc(doc(getDb(), 'phones', digits)).catch(() => null);
    if (!phone?.exists()) throw new Error('Утасны дугаар (имэйл) эсвэл нууц үг буруу байна.');
    email = phone.data().email as string;
  }

  try {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password.trim());
  } catch (err) {
    throw new Error(authErrorMessage(err, 'Нэвтэрч чадсангүй. Дахин оролдоно уу.'));
  }
}

export type SessionResult =
  | { status: 'ok'; user: AuthUser; profile: UserProfile | null; isAdmin: boolean }
  | { status: 'unverified'; email: string }
  | { status: 'incomplete' }
  | { status: 'blocked' };

/** Builds the app's user from the Firebase account and its Firestore profile. */
export async function loadSession(fbUser: User): Promise<SessionResult> {
  if (!fbUser.emailVerified) {
    return { status: 'unverified', email: fbUser.email || '' };
  }

  const token = await fbUser.getIdTokenResult();
  if (token.claims.email_verified !== true) {
    // Verified since this token was issued
    await fbUser.getIdToken(true);
  }
  const isAdmin = fbUser.email === ADMIN_EMAIL;

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

/** Updates the signed-in user's name and phone number (keeping phone numbers unique). */
export async function updateMyProfile(update: { fullName: string; phoneNumber: string }): Promise<UserProfile> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('Эхлээд нэвтэрнэ үү.');
  const fullName = update.fullName.trim();
  if (!fullName) throw new Error('Овог нэрээ заавал оруулна уу.');
  const phoneNumber = cleanPhone(update.phoneNumber);

  const db = getDb();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Хэрэглэгчийн бүртгэл олдсонгүй.');
  const profile = snap.data() as UserProfile;

  const batch = writeBatch(db);
  batch.update(ref, { fullName, phoneNumber });
  if (profile.phoneNumber !== phoneNumber) {
    batch.set(doc(db, 'phones', phoneNumber), { uid: user.uid, email: profile.email });
    batch.delete(doc(db, 'phones', profile.phoneNumber));
  }
  try {
    await batch.commit();
  } catch (err) {
    const code = (err as { code?: string }).code;
    throw new Error(
      code === 'permission-denied'
        ? 'Энэ утасны дугаар өөр хэрэглэгчид бүртгэлтэй байна.'
        : 'Мэдээлэл хадгалж чадсангүй. Дахин оролдоно уу.'
    );
  }
  return { ...profile, fullName, phoneNumber };
}

/**
 * Admin: removes a user's profile and phone number. Without a profile the account can no longer
 * see any content; the email/password sign-in itself stays in Firebase Authentication.
 */
export async function adminDeleteUser(uid: string, phoneNumber: string): Promise<void> {
  const db = getDb();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', uid));
  if (phoneNumber) batch.delete(doc(db, 'phones', phoneNumber));
  try {
    await batch.commit();
  } catch {
    throw new Error('Хэрэглэгчийг устгаж чадсангүй.');
  }
}
