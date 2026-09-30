import React, { useState } from 'react';
import { X, UserPlus, Eye, EyeOff, ChevronDown, CheckCircle2 } from 'lucide-react';
import { GradeNumber } from '../types';
import { accessRequestService } from '../services/accessRequestService';
import { sendEmailCode, verifyEmailCode } from '../services/firebase';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Called with the new account's credentials so the login screen can sign in right away
  onRegistered: (phoneNumber: string, password: string) => void;
}

const ALL_GRADES: GradeNumber[] = [6, 7, 8, 9, 10, 11, 12];

const inputClass =
  'w-full px-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all';
const labelClass = 'block text-xs font-bold text-stone-700 mb-1.5';

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onRegistered }) => {
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [grade, setGrade] = useState<GradeNumber | 'teacher' | null>(null);
  const [school, setSchool] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendCode = async () => {
    setError(null);
    setInfo(null);
    const target = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setError('Зөв имэйл хаяг оруулна уу.');
      return;
    }
    setIsBusy(true);
    try {
      await sendEmailCode(target);
      setCodeSentTo(target);
      setCode('');
      setInfo(`${target} хаяг руу 6 оронтой код илгээлээ. Spam хавтсаа ч шалгаарай.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Код илгээж чадсангүй.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!codeSentTo) return;
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError('6 оронтой кодоо оруулна уу.');
      return;
    }
    setIsBusy(true);
    try {
      const verified = await verifyEmailCode(codeSentTo, code.trim());
      setVerifiedEmail(verified);
      setInfo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Кодыг шалгаж чадсангүй.');
    } finally {
      setIsBusy(false);
    }
  };

  const resetEmail = () => {
    setVerifiedEmail(null);
    setCodeSentTo(null);
    setCode('');
    setInfo(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.trim() !== passwordConfirm.trim()) {
      setError('Нууц үг таарахгүй байна.');
      return;
    }

    if (!verifiedEmail) {
      setError('Эхлээд имэйл хаягаа баталгаажуулна уу.');
      return;
    }

    const res = accessRequestService.registerUser({
      lastName,
      firstName,
      phoneNumber,
      email: verifiedEmail,
      grade,
      school,
      password,
    });

    if (!res.success || !res.account) {
      setError(res.message);
      return;
    }

    onRegistered(res.account.phoneNumber || '', password.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Бүртгүүлэх</h2>
              <p className="text-[11px] text-stone-400">Бүртгүүлсний дараа шууд нэвтэрнэ</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Хаах"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {info && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
              {info}
            </div>
          )}

          <div>
            <label className={labelClass}>Имэйл хаяг</label>
            {verifiedEmail ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 min-w-0 text-sm text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate" data-testid="verified-email">{verifiedEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={resetEmail}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 shrink-0 cursor-pointer"
                >
                  Солих
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (codeSentTo) resetEmail();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendCode();
                      }
                    }}
                    placeholder="bagsh@gmail.com"
                    className={inputClass}
                    autoComplete="email"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isBusy}
                    className="px-3 bg-stone-900 hover:bg-stone-800 text-amber-400 text-xs font-bold rounded-xl shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {codeSentTo ? 'Дахин илгээх' : 'Код авах'}
                  </button>
                </div>
                {codeSentTo && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerifyCode();
                        }
                      }}
                      placeholder="6 оронтой код"
                      className={`${inputClass} tracking-[0.4em] font-mono`}
                      autoComplete="one-time-code"
                      aria-label="Баталгаажуулах код"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={isBusy || code.length !== 6}
                      className="px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      Баталгаажуулах
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Овог</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Бат"
                className={inputClass}
                autoComplete="family-name"
              />
            </div>
            <div>
              <label className={labelClass}>Нэр</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Сараа"
                className={inputClass}
                autoComplete="given-name"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Утасны дугаар</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="99112233"
              maxLength={10}
              className={inputClass}
              autoComplete="tel"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="register-grade">Анги</label>
            <div className="relative">
              <select
                id="register-grade"
                value={grade ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setGrade(v === '' ? null : v === 'teacher' ? 'teacher' : (Number(v) as GradeNumber));
                }}
                className={`${inputClass} appearance-none pr-9 cursor-pointer ${grade === null ? 'text-stone-400' : ''}`}
              >
                <option value="" disabled>
                  Сонгоно уу
                </option>
                {ALL_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}-р анги
                  </option>
                ))}
                <option value="teacher">Багш</option>
              </select>
              <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Сургууль</label>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="Жишээ: 1-р сургууль"
              className={inputClass}
              autoComplete="organization"
            />
          </div>

          <div>
            <label className={labelClass}>Нууц үг</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Дор хаяж 6 тэмдэгт"
                className={`${inputClass} pr-10`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Нууц үг давтах</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Бүртгүүлээд нэвтрэх</span>
          </button>
        </form>
      </div>
    </div>
  );
};
