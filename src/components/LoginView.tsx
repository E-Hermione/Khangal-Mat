import React, { useState } from 'react';
import { AuthUser } from '../types';
import {
  Lock,
  Phone,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { getOrCreateDeviceId, saveStoredAuth } from '../utils/deviceManager';
import { accessRequestService } from '../services/accessRequestService';
import { RegisterModal } from './RegisterModal';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedIdentifier = identifier.trim();
    const trimmedPass = password.trim();

    if (!trimmedIdentifier) {
      setError('Утасны дугаараа оруулна уу.');
      return;
    }

    if (!trimmedPass) {
      setError('Нууц үгээ оруулна уу.');
      return;
    }

    const validation = accessRequestService.validateLogin(trimmedIdentifier, trimmedPass);

    if (!validation.valid || !validation.user) {
      setError(validation.error || 'Утасны дугаар эсвэл нууц үг буруу байна.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const deviceId = getOrCreateDeviceId();
      const user: AuthUser = {
        userId: validation.user!.userId,
        phoneNumber: validation.user!.phoneNumber,
        email: validation.user!.email,
        name: validation.user!.name,
        role: validation.user!.role,
        loggedInAt: new Date().toISOString(),
        deviceId,
      };

      saveStoredAuth(user);
      setIsLoading(false);
      onLoginSuccess(user);
    }, 250);
  };

  const handleAutoLogin = (loginId: string, pass: string) => {
    setIdentifier(loginId);
    setPassword(pass);
    setError(null);

    const validation = accessRequestService.validateLogin(loginId, pass);
    if (validation.valid && validation.user) {
      const deviceId = getOrCreateDeviceId();
      const user: AuthUser = {
        userId: validation.user.userId,
        phoneNumber: validation.user.phoneNumber,
        email: validation.user.email,
        name: validation.user.name,
        role: validation.user.role,
        loggedInAt: new Date().toISOString(),
        deviceId,
      };
      saveStoredAuth(user);
      onLoginSuccess(user);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-b from-stone-900 to-stone-950 px-8 py-8 text-white text-center relative">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 font-black text-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            ∑
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">
            Математикийн сургалтын сан
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Багшийн системд нэвтрэх хэсэг
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Утасны дугаар
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  inputMode="tel"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Жишээ: 99112233"
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Нууц үг
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Нууц үгээ оруулна уу"
                  className="w-full pl-9 pr-10 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Нэвтэрч байна...' : 'Системд нэвтрэх'}</span>
            </button>
          </form>

          {/* Register Button */}
          <div className="mt-6 pt-5 border-t border-stone-200 text-center">
            <button
              type="button"
              onClick={() => setRegisterModalOpen(true)}
              className="inline-flex items-center space-x-2 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50/80 hover:bg-amber-100/80 px-3.5 py-2 rounded-xl border border-amber-200 transition-colors cursor-pointer w-full justify-center"
            >
              <UserPlus className="w-4 h-4 text-amber-600" />
              <span>Шинээр бүртгүүлэх</span>
            </button>
            <p className="text-[11px] text-stone-400 mt-2">
              Овог нэр, утас, анги, сургуулиа оруулаад шууд нэвтэрнэ
            </p>
          </div>
        </div>
      </div>

      <RegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onRegistered={(phone, pass) => {
          setRegisterModalOpen(false);
          handleAutoLogin(phone, pass);
        }}
      />
    </div>
  );
};

