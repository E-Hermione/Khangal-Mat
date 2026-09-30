import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import nodemailer from 'nodemailer';

// Must match FUNCTIONS_REGION in src/services/firebase.ts
setGlobalOptions({ region: 'asia-east1', maxInstances: 5 });

initializeApp();
const db = getFirestore();
const adminAuth = getAuth();

// Must match ADMIN_EMAIL in src/services/authService.ts and firestore.rules
const ADMIN_EMAIL = 'ehangal625@gmail.com';
// A verified code lets the user finish registration within this window
const REGISTRATION_WINDOW_MS = 30 * 60 * 1000;

// Gmail account that sends the codes, and its 16-character app password
// (Google Account → Security → 2-Step Verification → App passwords).
const GMAIL_USER = defineString('GMAIL_USER');
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeEmail(raw: unknown): string {
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 254) {
    throw new HttpsError('invalid-argument', 'Зөв имэйл хаяг оруулна уу.');
  }
  return email;
}

// Codes are stored hashed under a hash of the email; clients have no Firestore access to them.
function verificationDoc(email: string) {
  return db.collection('emailVerifications').doc(sha256(email));
}

interface VerificationRecord {
  codeHash: string | null;
  expiresAt: Timestamp;
  attempts: number;
  sentAt: Timestamp[];
  verifiedAt?: Timestamp;
  consumedAt?: Timestamp;
}

export const sendEmailCode = onCall({ secrets: [GMAIL_APP_PASSWORD] }, async (request) => {
  const email = normalizeEmail(request.data?.email);
  const ref = verificationDoc(email);
  const now = Date.now();
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = snap.exists ? (snap.data() as VerificationRecord) : null;
    const recentSends = (prev?.sentAt ?? []).filter((t) => now - t.toMillis() < 60 * 60 * 1000);
    const lastSend = recentSends[recentSends.length - 1];

    if (lastSend && now - lastSend.toMillis() < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - lastSend.toMillis())) / 1000);
      throw new HttpsError('resource-exhausted', `Дахин код авахын тулд ${wait} секунд хүлээнэ үү.`);
    }
    if (recentSends.length >= MAX_SENDS_PER_HOUR) {
      throw new HttpsError('resource-exhausted', 'Хэт олон удаа код авсан байна. 1 цагийн дараа дахин оролдоно уу.');
    }

    const record: VerificationRecord = {
      codeHash: sha256(`${email}:${code}`),
      expiresAt: Timestamp.fromMillis(now + CODE_TTL_MS),
      attempts: 0,
      sentAt: [...recentSends, Timestamp.fromMillis(now)],
    };
    tx.set(ref, record);
  });

  const password = GMAIL_APP_PASSWORD.value();
  if (isEmulator && !password) {
    logger.info(`[emulator] verification code for ${email}: ${code}`);
    return { sent: true };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER.value(), pass: password },
  });

  try {
    await transporter.sendMail({
      from: `"Математикийн сургалтын сан" <${GMAIL_USER.value()}>`,
      to: email,
      subject: `Баталгаажуулах код: ${code}`,
      text: `Таны баталгаажуулах код: ${code}\n\nКод 10 минутын дотор хүчинтэй.\nХэрэв та бүртгүүлээгүй бол энэ имэйлийг үл тооно уу.`,
      html: `<p>Таны баталгаажуулах код:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>Код 10 минутын дотор хүчинтэй.<br>Хэрэв та бүртгүүлээгүй бол энэ имэйлийг үл тооно уу.</p>`,
    });
  } catch (err) {
    logger.error('Failed to send verification email', err);
    throw new HttpsError('internal', 'Имэйл илгээж чадсангүй. Хаягаа шалгаад дахин оролдоно уу.');
  }

  return { sent: true };
});

export const verifyEmailCode = onCall(async (request) => {
  const email = normalizeEmail(request.data?.email);
  const code = typeof request.data?.code === 'string' ? request.data.code.trim() : '';
  if (!/^\d{6}$/.test(code)) {
    throw new HttpsError('invalid-argument', '6 оронтой кодоо оруулна уу.');
  }

  const ref = verificationDoc(email);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const record = snap.exists ? (snap.data() as VerificationRecord) : null;

    if (!record || !record.codeHash) {
      throw new HttpsError('failed-precondition', 'Эхлээд код авна уу.');
    }
    if (record.expiresAt.toMillis() < Date.now()) {
      throw new HttpsError('deadline-exceeded', 'Кодын хугацаа дууссан байна. Шинэ код авна уу.');
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      throw new HttpsError('resource-exhausted', 'Хэт олон удаа буруу оруулсан. Шинэ код авна уу.');
    }

    const expected = Buffer.from(record.codeHash, 'hex');
    const actual = Buffer.from(sha256(`${email}:${code}`), 'hex');
    if (!timingSafeEqual(expected, actual)) {
      const attempts = record.attempts + 1;
      tx.update(ref, { attempts });
      const left = MAX_ATTEMPTS - attempts;
      throw new HttpsError(
        'permission-denied',
        left > 0 ? `Код буруу байна. ${left} оролдлого үлдлээ.` : 'Хэт олон удаа буруу оруулсан. Шинэ код авна уу.'
      );
    }

    tx.update(ref, { codeHash: null, verifiedAt: Timestamp.now(), consumedAt: FieldValue.delete() });
    return { verified: true, email };
  });
});

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

const GRADES = [6, 7, 8, 9, 10, 11, 12];

function requireAuth(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Эхлээд нэвтэрнэ үү.');
  }
  return request.auth;
}

function requireAdmin(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  const auth = requireAuth(request);
  if (auth.token.email !== ADMIN_EMAIL || auth.token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Зөвхөн админ хийх боломжтой.');
  }
  return auth;
}

function cleanText(raw: unknown, field: string, max = 100): string {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) throw new HttpsError('invalid-argument', `${field} заавал оруулна уу.`);
  if (value.length > max) throw new HttpsError('invalid-argument', `${field} хэт урт байна.`);
  return value;
}

function cleanPhone(raw: unknown): string {
  const phone = typeof raw === 'string' ? raw.replace(/[\s-]/g, '') : '';
  if (!/^\d{8}$/.test(phone)) {
    throw new HttpsError('invalid-argument', 'Утасны дугаар 8 оронтой тоо байх ёстой.');
  }
  return phone;
}

// Same USR-#### id the web app used before, derived from the phone number
function generateUserId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return `USR-${(Math.abs(hash) % 9000) + 1000}`;
}

/**
 * Creates the profile for the signed-in Firebase user once their email has been verified
 * with a code. Marks the Firebase account's email as verified, which the security rules require.
 */
export const completeRegistration = onCall(async (request) => {
  const auth = requireAuth(request);
  const email = normalizeEmail(auth.token.email);
  const lastName = cleanText(request.data?.lastName, 'Овог');
  const firstName = cleanText(request.data?.firstName, 'Нэр');
  const school = cleanText(request.data?.school, 'Сургууль', 150);
  const phoneNumber = cleanPhone(request.data?.phoneNumber);
  const grade = request.data?.grade;
  if (grade !== 'teacher' && !GRADES.includes(grade)) {
    throw new HttpsError('invalid-argument', 'Ангиа сонгоно уу.');
  }

  const verificationRef = verificationDoc(email);
  const userRef = db.collection('users').doc(auth.uid);
  const phoneRef = db.collection('phones').doc(phoneNumber);

  const profile = await db.runTransaction(async (tx) => {
    const [verification, existingUser, existingPhone] = await Promise.all([
      tx.get(verificationRef),
      tx.get(userRef),
      tx.get(phoneRef),
    ]);

    if (existingUser.exists) {
      throw new HttpsError('already-exists', 'Энэ бүртгэл аль хэдийн үүссэн байна. Нэвтэрнэ үү.');
    }
    const v = verification.exists ? (verification.data() as VerificationRecord) : null;
    if (!v?.verifiedAt || v.consumedAt || Date.now() - v.verifiedAt.toMillis() > REGISTRATION_WINDOW_MS) {
      throw new HttpsError('failed-precondition', 'Имэйл хаягаа кодоор дахин баталгаажуулна уу.');
    }
    if (existingPhone.exists) {
      throw new HttpsError('already-exists', 'Энэ утасны дугаар аль хэдийн бүртгэлтэй байна.');
    }

    const data = {
      uid: auth.uid,
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
    };
    tx.set(userRef, data);
    tx.set(phoneRef, { uid: auth.uid });
    tx.update(verificationRef, { consumedAt: Timestamp.now() });
    return data;
  });

  await adminAuth.updateUser(auth.uid, { emailVerified: true });
  return profile;
});

/** Looks up the email to sign in with for a phone number. */
export const resolveLoginEmail = onCall(async (request) => {
  const phoneNumber = cleanPhone(request.data?.phoneNumber);
  const phone = await db.collection('phones').doc(phoneNumber).get();
  const uid = phone.exists ? (phone.data()?.uid as string) : null;
  const user = uid ? await db.collection('users').doc(uid).get() : null;
  if (!user?.exists) {
    throw new HttpsError('not-found', 'Утасны дугаар эсвэл нууц үг буруу байна.');
  }
  return { email: user.data()?.email as string };
});

/** Updates the caller's name, school and phone number (keeping phone numbers unique). */
export const updateMyProfile = onCall(async (request) => {
  const auth = requireAuth(request);
  const fullName = cleanText(request.data?.fullName, 'Овог нэр');
  const phoneNumber = cleanPhone(request.data?.phoneNumber);
  const school = typeof request.data?.school === 'string' ? request.data.school.trim().slice(0, 150) : undefined;
  const userRef = db.collection('users').doc(auth.uid);

  return db.runTransaction(async (tx) => {
    const user = await tx.get(userRef);
    if (!user.exists) throw new HttpsError('not-found', 'Хэрэглэгчийн бүртгэл олдсонгүй.');
    const oldPhone = user.data()?.phoneNumber as string;

    if (oldPhone !== phoneNumber) {
      const newPhoneRef = db.collection('phones').doc(phoneNumber);
      if ((await tx.get(newPhoneRef)).exists) {
        throw new HttpsError('already-exists', 'Энэ утасны дугаар өөр хэрэглэгчид бүртгэлтэй байна.');
      }
      tx.set(newPhoneRef, { uid: auth.uid });
      if (oldPhone) tx.delete(db.collection('phones').doc(oldPhone));
    }

    const update: { fullName: string; phoneNumber: string; school?: string } = { fullName, phoneNumber };
    if (school !== undefined) update.school = school;
    tx.update(userRef, update);
    return { ...user.data(), ...update };
  });
});

/** Admin: permanently removes a user's sign-in account and profile. */
export const adminDeleteUser = onCall(async (request) => {
  requireAdmin(request);
  const uid = typeof request.data?.uid === 'string' ? request.data.uid : '';
  if (!uid) throw new HttpsError('invalid-argument', 'Хэрэглэгч сонгоно уу.');
  if (uid === request.auth?.uid) throw new HttpsError('failed-precondition', 'Өөрийгөө устгах боломжгүй.');

  const userRef = db.collection('users').doc(uid);
  const user = await userRef.get();
  const phone = user.data()?.phoneNumber as string | undefined;
  const batch = db.batch();
  batch.delete(userRef);
  if (phone) batch.delete(db.collection('phones').doc(phone));
  await batch.commit();
  await adminAuth.deleteUser(uid).catch((err) => {
    if (err?.code !== 'auth/user-not-found') throw err;
  });
  return { deleted: true };
});
