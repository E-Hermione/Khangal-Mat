import React, { useState, useEffect } from 'react';
import { LoggedInDevice } from '../types';
import {
  Laptop,
  Smartphone,
  Tablet,
  LogOut,
  ShieldCheck,
  Globe,
  Clock,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  getStoredDevices,
  removeDeviceById,
  removeAllOtherDevices,
} from '../utils/deviceManager';

interface ActiveDevicesTabProps {
  onLogoutCurrent: () => void;
}

export const ActiveDevicesTab: React.FC<ActiveDevicesTabProps> = ({
  onLogoutCurrent,
}) => {
  const [devices, setDevices] = useState<LoggedInDevice[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshList = () => {
    setDevices(getStoredDevices());
  };

  useEffect(() => {
    refreshList();
  }, []);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleRemoveDevice = (device: LoggedInDevice) => {
    if (device.isCurrent) {
      removeDeviceById(device.id);
      onLogoutCurrent();
      return;
    }

    const updated = removeDeviceById(device.id);
    setDevices(updated);
    showStatus(`"${device.name}" төхөөрөмжийг амжилттай гаргалаа.`);
  };

  const handleRemoveAllOthers = () => {
    const otherCount = devices.filter((d) => !d.isCurrent).length;
    if (otherCount === 0) {
      showStatus('Бусад идэвхтэй төхөөрөмж байхгүй байна.');
      return;
    }

    if (window.confirm(`Одоогийнхоос бусад бүх (${otherCount}) төхөөрөмжийг системээс гаргах уу?`)) {
      const updated = removeAllOtherDevices();
      setDevices(updated);
      showStatus('Бусад бүх төхөөрөмжийг амжилттай гаргалаа.');
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
          <button
            type="button"
            onClick={refreshList}
            className="p-1.5 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
            title="Шинэчлэх"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

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
                    <Globe className="w-3.5 h-3.5 text-stone-400" />
                    <span>{device.ip}</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span className={device.isCurrent ? 'font-semibold text-emerald-700' : ''}>
                      {device.lastActive}
                    </span>
                  </div>

                  {device.phoneNumber && (
                    <div className="text-[11px] text-stone-400">
                      Дугаар: <span className="font-medium text-stone-600">{device.phoneNumber}</span>
                    </div>
                  )}
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
          <strong>Аюулгүй байдлын зөвлөмж:</strong> Хэрэв танихгүй эсвэл хуучин ашиглахаа больсон төхөөрөмж жагсаалтад байвал <strong>«Гаргах»</strong> товчийг дарж холболтыг нэн даруй цуцална уу. Цуцалсны дараа тухайн төхөөрөмж автоматаар системээс гарна.
        </p>
      </div>
    </div>
  );
};
