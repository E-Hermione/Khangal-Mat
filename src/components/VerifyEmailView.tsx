import React, { useState } from 'react';
import { MailCheck, RefreshCw, LogOut } from 'lucide-react';
import { refreshEmailVerified, sendVerificationEmail, signOutUser } from '../services/authService';

interface VerifyEmailViewProps {
  email: string;
  // Called once the email is verified so the app can open the session
  onVerified: () => void;
}

export const VerifyEmailView: React.FC<VerifyEmailViewProps> = ({ email, onVerified }) => {
  const [message, setMessage] = useState<{ type: 'info' | 'error'; text: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleCheck = async () => {
    setMessage(null);
    setIsBusy(true);
    try {
      if (await refreshEmailVerified()) {
        onVerified();
      } else {
        setMessage({ type: 'error', text: 'Имэйл хараахан баталгаажаагүй байна. Имэйл дэх холбоос дээр дарна уу.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Шалгаж чадсангүй. Дахин оролдоно уу.' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleResend = async () => {
    setMessage(null);
    setIsBusy(true);
    try {
      await sendVerificationEmail();
      setMessage({ type: 'info', text: 'Холбоосыг дахин илгээлээ.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Илгээж чадсангүй.' });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-b from-stone-900 to-stone-950 px-8 py-8 text-white text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto mb-3">
            <MailCheck className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Имэйлээ баталгаажуулна уу</h1>
        </div>

        <div className="p-8 space-y-4">
          <p className="text-sm text-stone-700">
            <span className="font-bold break-all">{email}</span> хаяг руу баталгаажуулах холбоос илгээлээ.
            Холбоос дээр дарсны дараа доорх товчийг дарна уу. Имэйл олдохгүй бол Spam хавтсаа шалгаарай.
          </p>

          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border ${
                message.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="button"
            onClick={handleCheck}
            disabled={isBusy}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            <MailCheck className="w-4 h-4" />
            <span>Баталгаажуулсан, үргэлжлүүлэх</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={isBusy}
              className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Дахин илгээх</span>
            </button>
            <button
              type="button"
              onClick={() => signOutUser()}
              className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Гарах</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
