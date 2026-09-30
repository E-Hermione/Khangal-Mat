import React, { useState, useEffect } from 'react';
import { LoggedInDevice } from '../types';
import {
  Laptop,
  Smartphone,
  Tablet,
  LogOut,
  ShieldCheck,
  Clock,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { getOrCreateDeviceId } from '../utils/deviceManager';
import { getFirebaseAuth } from '../services/firebase';
import { DeviceSession, subscribeDevices, revokeDevice, revokeOtherDevices } from '../services/deviceSessions';

interface ActiveDevicesTabProps {
  onLogoutCurrent: () => void;
}

function formatLastActive(ms: number): string {
  const minutes = Math.floor((Date.now() - ms) / 60000);
  if (minutes < 10) return 'Саяхан идэвхтэй';
  if (minutes < 60) return `${minutes} минутын өмнө`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} өдрийн өмнө`;
  return new Date(ms).toLocaleDateString();
}

export const ActiveDevicesTab: React.FC<ActiveDevicesTabProps> = ({
  onLogoutCurrent,
}) => {
  const uid = getFirebaseAuth().currentUser?.uid;
  const currentDeviceId = getOrCreateDeviceId();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return subscribeDevices(
      uid,
      (list) => {
        setLoadError(false);
        setSessions(list);
      },
      () => setLoadError(true)
    );
  }, [uid]);

  const devices = sessions.map((d) => ({
    ...d,
    isCurrent: d.id === currentDeviceId,
    lastActive: d.id === currentDeviceId ? 'Яг одоо идэвхтэй' : formatLastActive(d.lastActiveAt),
  }));

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleRemoveDevice = async (device: (typeof devices)[number]) => {
    if (device.isCurrent) {
      onLogoutCurrent();
      return;
    }
    if (!uid) return;
    try {
      await revokeDevice(uid, device.id);
      showStatus(`"${device.name}" төхөөрөмжийг амжилттай гаргалаа.`);
    } catch {
      showStatus('Гаргаж чадсангүй. Дахин оролдоно уу.');
    }
  };

  const handleRemoveAllOthers = async () => {
    const others = devices.filter((d) => !d.isCurrent);
    if (others.length === 0) {
      showStatus('Бусад идэвхтэй төхөөрөмж байхгүй байна.');
      return;
    }

    if (uid && window.confirm(`Одоогийнхоос бусад бүх (${others.length}) төхөөрөмжийг системээс гаргах уу?`)) {
      try {
        await revokeOtherDevices(uid, others.map((d) => d.id));
        showStatus('Бусад бүх төхөөрөмжийг амжилттай гаргалаа.');
      } catch {
        showStatus('Гаргаж чадсангүй. Дахин оролдоно уу.');
      }
    }
  };

  const getDeviceIcon = (type: LoggedInDevice['type']) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-5 h-5 text-amber-600" />;
      case 'tablet':
        return <Tablet className="w-5 h-5 text-amber-600" />;
      case 'desktop':
      default:
        return <Laptop className="w-5 h-5 text-amber-600" />;
    }
  };

  const otherDevicesCount = devices.filter((d) => !d.isCurrent).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header Info */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 bg-stone-50 border border-stone-200 rounded-xl">
        <div>
          <h3 className="font-bold text-sm text-stone-900 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Нэвтэрсэн төхөөрөмжүүдийн хяналт</span>
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-xl">
            Таны бүртгэлээр нэвтэрсэн бүх утас, компьютер, таблетууд. Үл мэдэх эсвэл хуучин төхөөрөмжийн эрхийг шууд цуцалж гаргах боломжтой.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {otherDevicesCount > 0 && (
            <button
              type="button"
              onClick={handleRemoveAllOthers}
              className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Бусад бүх төхөөрөмжийг гаргах ({otherDevicesCount})</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {loadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
          Төхөөрөмжийн жагсаалтыг ачаалж чадсангүй. Админ Firestore-ийн дүрмийг шинэчлэх шаардлагатай.
        </div>
      )}
      {!loadError && devices.length === 0 && (
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600">
          Бүртгэгдсэн төхөөрөмж алга. Гараад дахин нэвтэрвэл энэ төхөөрөмж жагсаалтад нэмэгдэнэ.
        </div>
      )}

      {/* Devices List */}
      <div className="space-y-3">
        {devices.map((device) => (
          <div
            key={device.id}
            className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              device.isCurrent
                ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-200'
                : 'bg-white border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-start space-x-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  device.isCurrent
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {getDeviceIcon(device.type)}
              </div>

              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <h4 className="font-bold text-sm text-stone-900">
                    {device.name}
                  </h4>
                  {device.isCurrent ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Энэ төхөөрөмж (Одоо ашиглаж буй)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                      Алсын төхөөрөмж
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-stone-500">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span className={device.isCurrent ? 'font-semibold text-emerald-700' : ''}>
                      {device.lastActive}
                    </span>
                  </div>

                </div>
              </div>
            </div>

            {/* Logout button */}
            <div className="flex items-center justify-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => handleRemoveDevice(device)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  device.isCurrent
                    ? 'text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300'
                    : 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{device.isCurrent ? 'Энэ төхөөрөмжөөс гарах' : 'Гаргах'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Safety Notice */}
      <div className="flex items-start space-x-2.5 p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Аюулгүй байдлын зөвлөмж:</strong> Хэрэв танихгүй эсвэл хуучин ашиглахаа больсон төхөөрөмж жагсаалтад байвал <strong>«Гаргах»</strong> товчийг дарж холболтыг нэн даруй цуцална уу. Цуцалсны дараа тухайн төхөөрөмж системээс гарна (унтраастай байвал дараа нь асаахад).
        </p>
      </div>
    </div>
  );
};
