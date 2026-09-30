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

// Placeholder devices the original demo added to every browser
const DEMO_DEVICE_IDS = new Set(['dev_iphone_sample', 'dev_macbook_sample']);

export function getStoredDevices(phoneNumber?: string): LoggedInDevice[] {
  const currentDeviceId = getOrCreateDeviceId();

  try {
    const raw = localStorage.getItem(STORAGE_KEY_DEVICES);
    if (raw) {
      const parsed: LoggedInDevice[] = JSON.parse(raw);
      const devices = parsed
        .filter((d) => !DEMO_DEVICE_IDS.has(d.id))
        .map((d) => ({
          ...d,
          // Drop the made-up IP/location the demo stored for this device
          ...(d.id === currentDeviceId ? { ip: '', location: '' } : {}),
          // Devices are per browser; the account's phone number is not tied to them
          phoneNumber: undefined,
          isCurrent: d.id === currentDeviceId,
          lastActive: d.id === currentDeviceId ? 'Яг одоо идэвхтэй' : d.lastActive,
        }));
      if (devices.length > 0) return devices;
    }
  } catch {
    // ignore parse error
  }

  const initialDevices = [{ ...detectCurrentDevice(phoneNumber || ''), phoneNumber: undefined }];
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
