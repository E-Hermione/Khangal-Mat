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
    ip: '202.131.226.45 (Улаанбаатар)',
    location: 'Монгол, Улаанбаатар',
    lastActive: 'Яг одоо идэвхтэй',
    isCurrent: true,
    phoneNumber,
  };
}

export function getStoredDevices(phoneNumber?: string): LoggedInDevice[] {
  const currentDeviceId = getOrCreateDeviceId();
  const phone = phoneNumber || '89163999';

  try {
    const raw = localStorage.getItem(STORAGE_KEY_DEVICES);
    if (raw) {
      const parsed: LoggedInDevice[] = JSON.parse(raw);
      // Ensure the current device is marked as isCurrent: true
      return parsed.map((d) => ({
        ...d,
        isCurrent: d.id === currentDeviceId,
        lastActive: d.id === currentDeviceId ? 'Яг одоо идэвхтэй' : d.lastActive,
      }));
    }
  } catch {
    // ignore parse error
  }

  // Initial demo seed if none exists
  const current = detectCurrentDevice(phone);
  const initialDevices: LoggedInDevice[] = [
    current,
    {
      id: 'dev_iphone_sample',
      name: 'Safari • iOS (iPhone 15)',
      type: 'mobile',
      browser: 'Safari',
      os: 'iOS 17.5',
      ip: '103.57.94.12 (Улаанбаатар, Юнител)',
      location: 'Монгол, Улаанбаатар',
      lastActive: '2 цагийн өмнө',
      isCurrent: false,
      phoneNumber: phone,
    },
    {
      id: 'dev_macbook_sample',
      name: 'Chrome • macOS (MacBook Air)',
      type: 'desktop',
      browser: 'Chrome 128',
      os: 'macOS Sonoma',
      ip: '66.181.161.200 (Дархан)',
      location: 'Монгол, Дархан-Уул',
      lastActive: 'Өчигдөр 19:42',
      isCurrent: false,
      phoneNumber: phone,
    },
  ];

  localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(initialDevices));
  return initialDevices;
}

export function saveStoredDevices(devices: LoggedInDevice[]): void {
  localStorage.setItem(STORAGE_KEY_DEVICES, JSON.stringify(devices));
}

export function removeDeviceById(deviceId: string): LoggedInDevice[] {
  const devices = getStoredDevices();
  const updated = devices.filter((d) => d.id !== deviceId);
  saveStoredDevices(updated);
  return updated;
}

export function removeAllOtherDevices(): LoggedInDevice[] {
  const currentDeviceId = getOrCreateDeviceId();
  const devices = getStoredDevices();
  const updated = devices.filter((d) => d.id === currentDeviceId);
  saveStoredDevices(updated);
  return updated;
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
  // Also register/update this device in devices list
  const currentDeviceId = getOrCreateDeviceId();
  const devices = getStoredDevices(auth.phoneNumber);
  const exists = devices.some((d) => d.id === currentDeviceId);
  if (!exists) {
    const current = detectCurrentDevice(auth.phoneNumber);
    saveStoredDevices([current, ...devices]);
  }
}

export function clearStoredAuth(): void {
  localStorage.removeItem(STORAGE_KEY_AUTH);
}
