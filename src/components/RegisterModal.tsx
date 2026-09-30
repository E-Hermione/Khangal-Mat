import React, { useState } from 'react';
import { X, UserPlus, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { GradeNumber } from '../types';
import { registerAccount } from '../services/authService';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Called once the account and profile exist and the verification email is sent
  onRegistered: () => void;
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
  const [isBusy, setIsBusy] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.trim() !== passwordConfirm.trim()) {
      setError('Нууц үг таарахгүй байна.');
      return;
    }

    setIsBusy(true);
    try {
      await registerAccount({
        email,
        password,
        lastName,
        firstName,
        phoneNumber,
        grade,
        school,
      });
      onRegistered();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Бүртгэл үүсгэж чадсангүй.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">Бүртгүүлэх</h2>
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

          <div>
            <label className={labelClass}>Имэйл хаяг</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bagsh@gmail.com"
              className={inputClass}
              autoComplete="email"
              autoFocus
            />
            <p className="text-[11px] text-stone-400 mt-1">Энэ хаяг руу баталгаажуулах холбоос очно.</p>
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
            disabled={isBusy}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isBusy ? 'Түр хүлээнэ үү...' : 'Бүртгүүлэх'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
