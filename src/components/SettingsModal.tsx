import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Shield,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Printer,
  Sparkles,
  Save,
  KeyRound,
  Smartphone,
} from 'lucide-react';
import { AuthUser } from '../types';
import { accessRequestService } from '../services/accessRequestService';
import { saveStoredAuth } from '../utils/deviceManager';
import { ActiveDevicesTab } from './ActiveDevicesTab';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  onUpdateCurrentUser: (updatedUser: AuthUser) => void;
  onLogout: () => void;
  screenProtectionEnabled: boolean;
  onToggleScreenProtection: (enabled: boolean) => void;
  isAdmin?: boolean;
}

type SettingsView = 'main' | 'profile' | 'security' | 'system' | 'devices';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateCurrentUser,
  onLogout,
  screenProtectionEnabled,
  onToggleScreenProtection,
  isAdmin,
}) => {
  const isUserAdmin = isAdmin ?? (currentUser.role === 'admin');
  const [currentView, setCurrentView] = useState<SettingsView>('main');

  // Form states for profile
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber || '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Form states for password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Additional system preference toggles
  const [autoWorkspace, setAutoWorkspace] = useState(true);
  const [highContrastPrint, setHighContrastPrint] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // Reset to main view and update inputs when modal is opened or user changes
  useEffect(() => {
    if (isOpen) {
      setCurrentView('main');
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhoneNumber(currentUser.phoneNumber || '');
      setProfileMsg(null);
      setPasswordMsg(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setIsSavingProfile(true);

    const res = accessRequestService.updateUserProfile(currentUser, {
      name,
      email,
      phoneNumber,
    });

    setIsSavingProfile(false);
    if (res.success && res.updatedUser) {
      setProfileMsg({ type: 'success', text: res.message });
      saveStoredAuth(res.updatedUser);
      onUpdateCurrentUser(res.updatedUser);
      setTimeout(() => setProfileMsg(null), 3500);
    } else {
      setProfileMsg({ type: 'error', text: res.message });
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Шинэ нууц үг хоорондоо таарахгүй байна.' });
      return;
    }

    setIsChangingPass(true);
    const res = accessRequestService.changePassword(currentUser, currentPassword, newPassword);
    setIsChangingPass(false);

    if (res.success) {
      setPasswordMsg({ type: 'success', text: res.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 3500);
    } else {
      setPasswordMsg({ type: 'error', text: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 modal-backdrop bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-stone-100 w-full ${currentView === 'devices' ? 'max-w-2xl' : 'max-w-md'} max-h-[92vh] rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden text-stone-900 animate-in zoom-in-95 duration-200 transition-all`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Phone-style Top Navigation Bar */}
        {currentView === 'main' ? (
          <div className="bg-white px-5 py-3.5 border-b border-stone-200/80 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 id="settings-title" className="text-sm font-bold text-stone-900 leading-none">
                  Тохиргоо
                </h2>
                <span className="text-[11px] text-stone-500">
                  Системийн цэс
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Хаах"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="bg-white px-4 py-3 border-b border-stone-200/80 flex items-center justify-between shrink-0 shadow-xs">
            <button
              type="button"
              onClick={() => setCurrentView('main')}
              className="flex items-center space-x-1 text-xs font-bold text-amber-700 hover:text-amber-800 px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Буцах</span>
            </button>

            <div className="text-xs font-bold text-stone-800 truncate px-2">
              {currentView === 'profile' && 'Хувийн мэдээлэл'}
              {currentView === 'security' && 'Аюулгүй байдал & Нууц үг'}
              {currentView === 'devices' && 'Нэвтэрсэн төхөөрөмжүүд'}
              {currentView === 'system' && 'Системийн тохиргоо'}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Хаах"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dynamic View Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* VIEW 1: MAIN MENU (Phone-style stacked list) */}
          {currentView === 'main' && (
            <>
              {/* User Profile Card */}
              <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-stone-900 truncate">
                      {currentUser.name}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                      {currentUser.role === 'admin' ? 'Админ' : 'Багш'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-emerald-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Одоо идэвхтэй байна</span>
                  </div>
                </div>
              </div>

              {/* Settings Category Rows */}
              <div className="space-y-1.5">
                <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Хувийн болон нууцлал
                </div>

                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs divide-y divide-stone-100 overflow-hidden">
                  {/* Row 1: Хувийн мэдээлэл (Дугаар, Gmail солих) */}
                  <button
                    type="button"
                    onClick={() => setCurrentView('profile')}
                    className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 active:bg-stone-100 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-900 group-hover:text-amber-700 transition-colors">
                          Хувийн мэдээлэл (Дугаар, Gmail солих)
                        </div>
                        <div className="text-[11px] text-stone-500 truncate">
                          Овог нэр, холбогдох Gmail, утасны дугаар
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 shrink-0 ml-2" />
                  </button>

                  {/* Row 2: Аюулгүй байдал & Нууц үг */}
                  <button
                    type="button"
                    onClick={() => setCurrentView('security')}
                    className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 active:bg-stone-100 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-900 group-hover:text-blue-700 transition-colors">
                          Аюулгүй байдал & Нууц үг
                        </div>
                        <div className="text-[11px] text-stone-500 truncate">
                          Системд нэвтрэх нууц үгээ солих
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 shrink-0 ml-2" />
                  </button>

                  {/* Row 3: Нэвтэрсэн төхөөрөмжүүд */}
                  <button
                    type="button"
                    onClick={() => setCurrentView('devices')}
                    className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 active:bg-stone-100 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-stone-900 group-hover:text-purple-700 transition-colors">
                          Нэвтэрсэн төхөөрөмжүүд
                        </div>
                        <div className="text-[11px] text-stone-500 truncate">
                          Идэвхтэй сесс болон төхөөрөмжийн удирдлага
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 shrink-0 ml-2" />
                  </button>

                  {/* Row 4: Системийн тохиргоо (Зөвхөн админд харагдана) */}
                  {isUserAdmin && (
                    <button
                      type="button"
                      onClick={() => setCurrentView('system')}
                      className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 active:bg-stone-100 transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-stone-900 group-hover:text-emerald-700 transition-colors">
                            Системийн тохиргоо
                          </div>
                          <div className="text-[11px] text-stone-500 truncate">
                            Дэлгэц хамгаалалт, хэвлэлтийн горим
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 shrink-0 ml-2" />
                    </button>
                  )}
                </div>
              </div>

              {/* Logout Row */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span>Системээс гарах</span>
                </button>
              </div>
            </>
          )}

          {/* VIEW 2: PROFILE TAB */}
          {currentView === 'profile' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
                <div className="flex items-center space-x-2.5 pb-3 mb-3 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-900">Хувийн мэдээлэл шинэчлэх</h3>
                    <p className="text-[11px] text-stone-500">Gmail болон утасны дугаараа өөрчилнө үү</p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-3.5">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-stone-400" />
                      <span>Овог, нэр</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Жишээ: Админ (89163999)"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors"
                    />
                  </div>

                  {/* Email / Gmail */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      <span>Gmail хаяг</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Жишээ: ehangal725@gmail.com"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      Энэ Gmail хаягаар системд нэвтрэх боломжтой болно.
                    </p>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <span>Утасны дугаар</span>
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Жишээ: 89163999"
                      maxLength={12}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors"
                    />
                  </div>

                  {/* Feedback message */}
                  {profileMsg && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
                        profileMsg.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {profileMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      )}
                      <span>{profileMsg.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="w-full py-2.5 px-4 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isSavingProfile ? 'Хадгалж байна...' : 'Мэдээлэл хадгалах'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* VIEW 3: SECURITY & PASSWORD TAB */}
          {currentView === 'security' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-4">
                <div className="flex items-center space-x-2.5 pb-3 mb-3 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-stone-900">Нууц үг шинэчлэх</h3>
                    <p className="text-[11px] text-stone-500">Хамгаалалтын найдвартай нууц үг сонгоно уу</p>
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-3.5">
                  {/* Current password */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center space-x-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-stone-400" />
                      <span>Одоогийн нууц үг</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="Одоо ашиглаж буй нууц үг"
                        className="w-full pl-3.5 pr-10 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* New password */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-stone-400" />
                      <span>Шинэ нууц үг</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Дор хаяж 6 тэмдэгт"
                        className="w-full pl-3.5 pr-10 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                      >
                        {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm new password */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Шинэ нууц үг давтах
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Шинэ нууц үгээ дахин бичнэ үү"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors"
                    />
                  </div>

                  {/* Password feedback message */}
                  {passwordMsg && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
                        passwordMsg.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {passwordMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      )}
                      <span>{passwordMsg.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-900 text-stone-100 text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isChangingPass ? 'Сольж байна...' : 'Нууц үг шинэчлэх'}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* VIEW 4: SYSTEM SETTINGS TAB (Admin Only) */}
          {currentView === 'system' && isUserAdmin && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs divide-y divide-stone-100 overflow-hidden">
                {/* Row 1: Screen Protection */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        screenProtectionEnabled ? 'bg-stone-900 text-amber-400' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-stone-900">
                        Дэлгэц хамгаалалт (Тас хар болгох)
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Зураг авах, бичлэг хийх үед дэлгэцийг тас хар болгоно
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleScreenProtection(!screenProtectionEnabled)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ml-2 ${
                      screenProtectionEnabled ? 'bg-amber-500' : 'bg-stone-300'
                    }`}
                    aria-label="Дэлгэц хамгаалалт асаах/унтраах"
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        screenProtectionEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Row 2: Workspace toggle */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-stone-900">Сурагчийн бодолтын зай</div>
                      <div className="text-[11px] text-stone-500">Хэвлэх үед бодолт бичих шугамыг автоматаар нэмэх</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoWorkspace(!autoWorkspace)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                      autoWorkspace ? 'bg-amber-500' : 'bg-stone-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        autoWorkspace ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Row 3: Contrast print */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-stone-900">Өндөр тодролтой хэвлэлт</div>
                      <div className="text-[11px] text-stone-500">Гүн хар өнгөөр принтер рүү илгээх</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHighContrastPrint(!highContrastPrint)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                      highContrastPrint ? 'bg-amber-500' : 'bg-stone-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        highContrastPrint ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Row 4: Multi-session */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-stone-900">Нэвтрэлтийн хамгаалалт</div>
                      <div className="text-[11px] text-stone-500">Нэгэн зэрэг давхар нэвтрэлтийг хязгаарлах</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifications(!notifications)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                      notifications ? 'bg-amber-500' : 'bg-stone-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        notifications ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: DEVICES (Нэвтэрсэн төхөөрөмжүүд) */}
          {currentView === 'devices' && (
            <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs">
              <ActiveDevicesTab onLogoutCurrent={onLogout} />
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-stone-200/60 border-t border-stone-200 text-center text-[10px] text-stone-500">
          KhangalMate • Тохиргооны систем
        </div>
      </div>
    </div>
  );
};
