import { LoggedInDevice, AuthUser } from '../types';

const STORAGE_KEY_DEVICES = 'math_app_active_devices';
const STORAGE_KEY_CURRENT_DEVICE_ID = 'math_app_current_device_id';
const STORAGE_KEY_AUTH = 'math_app_auth_user';

export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(STORAGE_KEY_CURRENT_DEVICE_ID);
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEY_CURRENT_DEVICE_ID, deviceId);
  }
  return deviceId;
}

export function detectCurrentDevice(phoneNumber: string): LoggedInDevice {
  const ua = navigator.userAgent;
  let os = 'Windows';
  let type: 'desktop' | 'mobile' | 'tablet' = 'desktop';

  if (/iPad|tablet/i.test(ua)) {
    os = 'iPadOS';
    type = 'tablet';
  } else if (/iPhone/i.test(ua)) {
    os = 'iOS (iPhone)';
    type = 'mobile';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    type = /Mobile/i.test(ua) ? 'mobile' : 'tablet';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
    type = 'desktop';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    type = 'desktop';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows 11';
    type = 'desktop';
  }

  let browser = 'Chrome';
  if (/Edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
  }

  const deviceId = getOrCreateDeviceId();
  const name = `${browser} • ${os}`;

  return {
    id: deviceId,
    name,
    type,
    browser,
    os,
    // The browser cannot see its public IP or location
    ip: '',
    location: '',
    lastActive: 'Яг одоо идэвхтэй',
    isCurrent: true,
    phoneNumber,
  };
}

export function getStoredAuth(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return null;
}

export function saveStoredAuth(auth: AuthUser): void {
  localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(auth));
  // Clean up the device list older versions kept in this browser (now in Firestore)
  localStorage.removeItem(STORAGE_KEY_DEVICES);
}

export function clearStoredAuth(): void {
  localStorage.removeItem(STORAGE_KEY_AUTH);
}
