import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import nodemailer from 'nodemailer';

// Must match FUNCTIONS_REGION in src/services/firebase.ts
setGlobalOptions({ region: 'asia-east1', maxInstances: 5 });

initializeApp();
const db = getFirestore();

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

    tx.update(ref, { codeHash: null, verifiedAt: Timestamp.now() });
    return { verified: true, email };
  });
});
