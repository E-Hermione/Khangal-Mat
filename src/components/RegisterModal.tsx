import React, { useState } from 'react';
import { X, UserPlus, Eye, EyeOff } from 'lucide-react';
import { GradeNumber } from '../types';
import { accessRequestService } from '../services/accessRequestService';

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
  const [grades, setGrades] = useState<GradeNumber[]>([]);
  const [school, setSchool] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleGrade = (grade: GradeNumber) => {
    setGrades((prev) => (prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.trim() !== passwordConfirm.trim()) {
      setError('Нууц үг таарахгүй байна.');
      return;
    }

    const res = accessRequestService.registerTeacher({
      lastName,
      firstName,
      phoneNumber,
      grades,
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
              <h2 className="text-sm font-bold text-white">Багшаар бүртгүүлэх</h2>
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
                autoFocus
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
            <label className={labelClass}>Заадаг анги</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_GRADES.map((grade) => {
                const selected = grades.includes(grade);
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => toggleGrade(grade)}
                    aria-pressed={selected}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-amber-500 border-amber-500 text-stone-950'
                        : 'bg-stone-50 border-stone-300 text-stone-600 hover:border-amber-400'
                    }`}
                  >
                    {grade}-р анги
                  </button>
                );
              })}
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
