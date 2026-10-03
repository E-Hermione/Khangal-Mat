import { addDoc, collection, doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { getDb } from './firebase';
import { userPermissionsService } from './userPermissionsService';

/**
 * Payment by bank transfer. The student picks how many months, sees the amount, the bank account
 * and the transfer note to use (their ID and phone), and tells the admin they paid. The admin
 * checks the bank statement and confirms, which extends the student's access period.
 * - settings/payment: bank account and prices (admin writes, members read)
 * - paymentRequests/{id}: one per "I paid" (the student creates, the admin confirms or rejects)
 */

export interface PaymentOption {
  months: number;
  price: number;
}

export interface PaymentSettings {
  bankName: string;
  accountNumber: string;
  accountName: string;
  // Price of one month; each period costs months × this
  monthlyPrice?: number;
  // Older settings: periods priced one by one
  options: PaymentOption[];
}

export const EMPTY_PAYMENT_SETTINGS: PaymentSettings = { bankName: '', accountNumber: '', accountName: '', options: [] };

// Periods a student can pay for
export const PAYMENT_MONTHS = [1, 2, 3, 6, 12];

/** The periods on offer and what each costs. */
export function paymentOptions(s: PaymentSettings): PaymentOption[] {
  if (s.monthlyPrice && s.monthlyPrice > 0) {
    return PAYMENT_MONTHS.map((months) => ({ months, price: months * s.monthlyPrice! }));
  }
  return s.options || [];
}

export interface PaymentRequest {
  id: string;
  uid: string;
  userId: string;
  phoneNumber: string;
  fullName: string;
  months: number;
  amount: number;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  decidedAt?: number;
  // Access end set when approved
  paidUntil?: number;
}

export function transferNote(userId: string, phone: string): string {
  return [userId, phone].filter(Boolean).join(' ');
}

export function formatMoney(n: number): string {
  return `${n.toLocaleString('en-US')}₮`;
}

export function subscribePaymentSettings(onChange: (s: PaymentSettings) => void): () => void {
  return onSnapshot(
    doc(getDb(), 'settings', 'payment'),
    (snap) => onChange({ ...EMPTY_PAYMENT_SETTINGS, ...(snap.data() as Partial<PaymentSettings> | undefined) }),
    (err) => {
      console.error('Payment settings failed to load', err);
      onChange(EMPTY_PAYMENT_SETTINGS);
    }
  );
}

export async function savePaymentSettings(s: PaymentSettings): Promise<void> {
  await setDoc(doc(getDb(), 'settings', 'payment'), s);
}

export async function submitPaymentRequest(
  req: Omit<PaymentRequest, 'id' | 'status' | 'createdAt'>
): Promise<void> {
  await addDoc(collection(getDb(), 'paymentRequests'), { ...req, status: 'pending', createdAt: Date.now() });
}

function toRequests(docs: { id: string; data: () => unknown }[]): PaymentRequest[] {
  return docs
    .map((d) => ({ ...(d.data() as Omit<PaymentRequest, 'id'>), id: d.id }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Student: their own requests, newest first. */
export function subscribeMyPaymentRequests(uid: string, onChange: (list: PaymentRequest[]) => void): () => void {
  return onSnapshot(
    query(collection(getDb(), 'paymentRequests'), where('uid', '==', uid)),
    (snap) => onChange(toRequests(snap.docs)),
    (err) => console.error('Payment requests failed to load', err)
  );
}

/** Admin: every request, newest first. */
export function subscribeAllPaymentRequests(onChange: (list: PaymentRequest[]) => void): () => void {
  return onSnapshot(
    collection(getDb(), 'paymentRequests'),
    (snap) => onChange(toRequests(snap.docs)),
    (err) => console.error('Payment requests failed to load', err)
  );
}

/** Access end after adding `months` to what the user already has (or to today). */
export function extendedUntil(currentEnd: number | null | undefined, months: number): number {
  const now = Date.now();
  const d = new Date(typeof currentEnd === 'number' && currentEnd > now ? currentEnd : now);
  d.setMonth(d.getMonth() + months);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Admin: confirms the money arrived and extends the student's access. */
export async function approvePayment(req: PaymentRequest): Promise<number> {
  const perms = userPermissionsService.getUserPermissions(req.userId);
  const paidUntil = extendedUntil(perms.expiresAt, req.months);
  userPermissionsService.saveUserPermissions(req.userId, { ...perms, isBlocked: false, expiresAt: paidUntil });
  await updateDoc(doc(getDb(), 'paymentRequests', req.id), { status: 'approved', decidedAt: Date.now(), paidUntil });
  return paidUntil;
}

export async function rejectPayment(req: PaymentRequest): Promise<void> {
  await updateDoc(doc(getDb(), 'paymentRequests', req.id), { status: 'rejected', decidedAt: Date.now() });
}
