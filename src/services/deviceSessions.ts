import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { getDb } from './firebase';
import { detectCurrentDevice, getOrCreateDeviceId } from '../utils/deviceManager';
import { LoggedInDevice } from '../types';

/**
 * Signed-in devices, stored in users/{uid}/devices/{deviceId}. Each browser keeps its own
 * device id. "Signing out" another device marks it revoked; that device signs itself out as
 * soon as it sees the change (or on its next start if it was offline).
 */

export interface DeviceSession {
  id: string;
  name: string;
  type: LoggedInDevice['type'];
  browser: string;
  os: string;
  createdAt: number;
  lastActiveAt: number;
  revoked: boolean;
}

const HEARTBEAT_MS = 5 * 60 * 1000;

let stopWatch: (() => void) | null = null;

function deviceRef(uid: string, deviceId: string) {
  return doc(getDb(), 'users', uid, 'devices', deviceId);
}

/**
 * Records this browser as a signed-in device. Resolves 'revoked' if the user signed this
 * device out from another one; the record is then removed so a fresh sign-in works.
 */
export async function registerCurrentDevice(uid: string): Promise<'ok' | 'revoked'> {
  const id = getOrCreateDeviceId();
  const ref = deviceRef(uid, id);
  const snap = await getDoc(ref);

  if (snap.exists() && snap.data().revoked) {
    await deleteDoc(ref);
    return 'revoked';
  }

  const info = detectCurrentDevice('');
  const now = Date.now();
  const session: DeviceSession = {
    id,
    name: info.name,
    type: info.type,
    browser: info.browser,
    os: info.os,
    createdAt: snap.exists() ? (snap.data().createdAt as number) : now,
    lastActiveAt: now,
    revoked: false,
  };
  await setDoc(ref, session);
  return 'ok';
}

/** Keeps this device's "last active" fresh and calls onRevoked if it is signed out remotely. */
export function watchCurrentDevice(uid: string, onRevoked: () => void) {
  stopDeviceWatch();
  const ref = deviceRef(uid, getOrCreateDeviceId());

  const unsubscribe = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists() || snap.data().revoked) {
        stopDeviceWatch();
        onRevoked();
      }
    },
    (err) => console.error('Device watch failed', err)
  );
  const timer = setInterval(() => {
    updateDoc(ref, { lastActiveAt: Date.now() }).catch(() => {});
  }, HEARTBEAT_MS);

  stopWatch = () => {
    unsubscribe();
    clearInterval(timer);
  };
}

export function stopDeviceWatch() {
  stopWatch?.();
  stopWatch = null;
}

/** Removes this device's record when the user signs out here. */
export async function forgetCurrentDevice(uid: string): Promise<void> {
  stopDeviceWatch();
  await deleteDoc(deviceRef(uid, getOrCreateDeviceId())).catch(() => {});
}

export function subscribeDevices(
  uid: string,
  onChange: (devices: DeviceSession[]) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    collection(getDb(), 'users', uid, 'devices'),
    (snap) => {
      const devices = snap.docs
        .map((d) => d.data() as DeviceSession)
        .filter((d) => !d.revoked)
        .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
      onChange(devices);
    },
    (err) => {
      console.error('Device list failed', err);
      onError?.(err);
    }
  );
}

export async function revokeDevice(uid: string, deviceId: string): Promise<void> {
  await updateDoc(deviceRef(uid, deviceId), { revoked: true });
}

export async function revokeOtherDevices(uid: string, deviceIds: string[]): Promise<void> {
  const batch = writeBatch(getDb());
  deviceIds.forEach((id) => batch.update(deviceRef(uid, id), { revoked: true }));
  await batch.commit();
}
