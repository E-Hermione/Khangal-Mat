import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Lock,
  Unlock,
  Eye,
  Search,
  UserCog,
  Megaphone,
  CreditCard,
  Gift,
} from 'lucide-react';
import { accessRequestService } from '../services/accessRequestService';
import { userPermissionsService, matchesUserToken } from '../services/userPermissionsService';
import { ApprovedAccount, UserPermissions, GradeNumber } from '../types';
import { UserLookupTab } from './UserLookupTab';
import { AnnouncementsTab } from './AnnouncementsTab';
import { PaymentsTab } from './PaymentsTab';
import { FreeTopicsTab } from './FreeTopicsTab';
import { subscribeAllPaymentRequests } from '../services/payments';

type MainTab = 'lookup' | 'user-permissions' | 'free-topics' | 'announcements' | 'payments';

export const AccessRequestsTab: React.FC = () => {
  const [mainTab, setMainTab] = useState<MainTab>('lookup');
  const [approvedAccounts, setApprovedAccounts] = useState<ApprovedAccount[]>([]);
  // User Permissions Tab State
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [currentUserPerms, setCurrentUserPerms] = useState<UserPermissions | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Bank transfers waiting for the admin to confirm
  const [pendingPayments, setPendingPayments] = useState(0);
  useEffect(
    () => subscribeAllPaymentRequests((list) => setPendingPayments(list.filter((r) => r.status === 'pending').length)),
    []
  );

  const loadData = () => {
    setApprovedAccounts(accessRequestService.getApprovedAccounts());
  };

  useEffect(() => {
    loadData();
    // Refresh when Firestore delivers changes
    window.addEventListener('cloud-data-updated', loadData);
    return () => window.removeEventListener('cloud-data-updated', loadData);
  }, []);

  // When a user is selected in user-permissions tab, load their permissions
  useEffect(() => {
    if (selectedUserId) {
      const perms = userPermissionsService.getUserPermissions(selectedUserId);
      setCurrentUserPerms({ ...perms });
    } else {
      setCurrentUserPerms(null);
    }
  }, [selectedUserId]);

  // Jump from request card to permissions tab
  const handleOpenUserPermissions = (userId: string) => {
    setSelectedUserId(userId);
    setMainTab('user-permissions');
  };

  // Save specific user permissions
  const handleSaveUserPermissions = () => {
    if (!selectedUserId || !currentUserPerms) return;
    const targets = bulkTargets.length > 0 ? bulkTargets : [selectedUserId];
    for (const id of targets) {
      userPermissionsService.saveUserPermissions(id, { ...currentUserPerms, userId: id });
    }
    setSaveStatus(
      targets.length > 1
        ? `${targets.length} хэрэглэгчийн эрх амжилттай шинэчлэгдлээ!`
        : `"${selectedUserId}" хэрэглэгчийн эрх амжилттай шинэчлэгдлээ!`
    );
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // Several users at once: IDs (or phone numbers) separated by commas
  const [bulkInput, setBulkInput] = useState('');
  const [bulkTargets, setBulkTargets] = useState<string[]>([]);
  const [bulkUnknown, setBulkUnknown] = useState<string[]>([]);

  const handleSelectBulk = () => {
    const tokens = bulkInput.split(/[,\s;]+/).map((t) => t.trim()).filter(Boolean);
    const found: string[] = [];
    const unknown: string[] = [];
    for (const token of tokens) {
      const user = allUsersList.find((u) => matchesUserToken(u.userId, u.phone, token));
      if (user) {
        if (!found.includes(user.userId)) found.push(user.userId);
      } else {
        unknown.push(token);
      }
    }
    setBulkUnknown(unknown);
    setBulkTargets(found);
    if (found.length > 0) setSelectedUserId(found[0]);
  };

  const selectSingleUser = (userId: string) => {
    setBulkTargets([]);
    setBulkUnknown([]);
    setSelectedUserId(userId);
  };

  // Access period helpers: end of the chosen day
  const expiryInputValue = (ms?: number | null) => {
    if (typeof ms !== 'number') return '';
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const endOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  };
  const addToToday = (days: number, months = 0) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    d.setDate(d.getDate() + days);
    return endOfDay(d);
  };

  // Build unified list of all users for permissions search/selection
  const allUsersList = useMemo(() => {
    const map = new Map<string, { userId: string; name: string; email: string; phone?: string; status: string }>();

    approvedAccounts.forEach((acc) => {
      const uId = acc.userId || userPermissionsService.generateUserId(acc.email || acc.phoneNumber || '');
      map.set(uId, {
        userId: uId,
        name: acc.fullName,
        email: acc.email,
        phone: acc.phoneNumber,
        status: acc.active ? 'active' : 'inactive',
      });
    });

    return Array.from(map.values());
  }, [approvedAccounts]);

  // Filtered users for picker
  const filteredUsersForPicker = useMemo(() => {
    if (!userSearchQuery.trim()) return allUsersList;
    const q = userSearchQuery.toLowerCase().trim();
    return allUsersList.filter(
      (u) =>
        u.userId.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q))
    );
  }, [allUsersList, userSearchQuery]);

  const selectedUserDetails = useMemo(() => {
    return allUsersList.find((u) => u.userId === selectedUserId);
  }, [allUsersList, selectedUserId]);

  const allGradesList: GradeNumber[] = [6, 7, 8, 9, 10, 11, 12];

  return (
    <div className="space-y-5">
      {/* Top Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setMainTab('lookup')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            mainTab === 'lookup'
              ? 'bg-stone-900 text-amber-400 shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200/80'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Хэрэглэгч хайх</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('user-permissions')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            mainTab === 'user-permissions'
              ? 'bg-stone-900 text-amber-400 shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200/80'
          }`}
        >
          <UserCog className="w-4 h-4" />
          <span>Хэрэглэгчийн эрх тохируулах</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('free-topics')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            mainTab === 'free-topics'
              ? 'bg-stone-900 text-amber-400 shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200/80'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Анхдагч эрх</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('announcements')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            mainTab === 'announcements'
              ? 'bg-stone-900 text-amber-400 shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200/80'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Зарлал</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('payments')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            mainTab === 'payments'
              ? 'bg-stone-900 text-amber-400 shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200/80'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Төлбөр</span>
          {pendingPayments > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-stone-950">
              {pendingPayments}
            </span>
          )}
        </button>

      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ХЭРЭГЛЭГЧ ХАЙХ (User lookup) */}
      {/* ========================================================================= */}
      {mainTab === 'lookup' && (
        <UserLookupTab onEditPermissions={handleOpenUserPermissions} />
      )}

      {mainTab === 'free-topics' && <FreeTopicsTab />}
      {mainTab === 'announcements' && <AnnouncementsTab />}
      {mainTab === 'payments' && <PaymentsTab />}

      {/* ========================================================================= */}
      {/* TAB 2: ХЭРЭГЛЭГЧИЙН ЭРХ ТОХИРУУЛАХ (User Permissions by User ID) */}
      {/* ========================================================================= */}
      {mainTab === 'user-permissions' && (
        <div className="space-y-5">
          {/* User ID Picker Header */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-black uppercase text-stone-900 tracking-wider">
                  Хэрэглэгчийн ID-аар эрх оноох
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Тухайн хэрэглэгчийн ID-г сонгож, үзэх боломжтой ангиуд болон хичээлийн хэсгүүдийг тохируулна.
                </p>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="ID, нэр, Gmail-ээр хайх..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Several users at once */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSelectBulk();
                }}
                placeholder="Олон хэрэглэгч: 1234, 5678, 99112233 (ID-ийн тоо эсвэл утас, таслалаар)"
                className="flex-1 text-xs px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={handleSelectBulk}
                className="px-3 py-2 bg-stone-900 hover:bg-black text-amber-400 text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap"
              >
                Бүгдийг сонгох
              </button>
            </div>
            {bulkUnknown.length > 0 && (
              <div className="text-[11px] text-red-700">Олдсонгүй: {bulkUnknown.join(', ')}</div>
            )}

            {/* User Select Buttons List */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-xl border border-stone-200">
              {filteredUsersForPicker.length === 0 ? (
                <div className="p-3 text-stone-400 text-xs text-center w-full">Хэрэглэгч олдсонгүй.</div>
              ) : (
                filteredUsersForPicker.map((user) => {
                  const isSelected = user.userId === selectedUserId;
                  return (
                    <button
                      key={user.userId}
                      type="button"
                      onClick={() => selectSingleUser(user.userId)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950 shadow-2xs font-black ring-2 ring-amber-400/40'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200'
                      }`}
                    >
                      <span className="font-mono">{user.userId}</span>
                      <span className="text-stone-400">•</span>
                      <span className="truncate max-w-[120px]">{user.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* User Details & Permissions Editor */}
          {selectedUserId && currentUserPerms ? (
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-5 animate-in fade-in">
              {/* Selected User Header Card */}
              <div className="p-3.5 bg-gradient-to-r from-amber-50 via-white to-amber-50/40 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-500 text-stone-950">
                      ID: {currentUserPerms.userId}
                    </span>
                    <span className="text-sm font-bold text-stone-900">{selectedUserDetails?.name}</span>
                  </div>
                  <div className="text-xs text-stone-600">
                    {selectedUserDetails?.email} {selectedUserDetails?.phone && `• ${selectedUserDetails.phone}`}
                  </div>
                  {bulkTargets.length > 1 && (
                    <div className="text-xs font-bold text-amber-800" data-testid="bulk-targets">
                      Хадгалахад {bulkTargets.length} хэрэглэгчид нэг дор хэрэглэнэ: {bulkTargets.join(', ')}
                    </div>
                  )}
                </div>

                {/* Block/Unblock Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentUserPerms({
                      ...currentUserPerms,
                      isBlocked: !currentUserPerms.isBlocked,
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors ${
                    currentUserPerms.isBlocked
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {currentUserPerms.isBlocked ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                      <span>Эрх хаагдсан (Blocked)</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Нэвтрэлт идэвхтэй</span>
                    </>
                  )}
                </button>
              </div>

              {/* 1. Зөвшөөрөгдсөн ангиуд (Allowed Grades) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-stone-800 tracking-wider">
                    Зөвшөөрөгдсөн ангиуд:
                  </label>
                  <div className="flex items-center space-x-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentUserPerms({
                          ...currentUserPerms,
                          allowedGrades: [...allGradesList],
                        })
                      }
                      className="text-amber-700 hover:underline font-bold cursor-pointer"
                    >
                      Бүгдийг нээх
                    </button>
                    <span className="text-stone-300">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentUserPerms({
                          ...currentUserPerms,
                          allowedGrades: [],
                        })
                      }
                      className="text-stone-500 hover:underline font-bold cursor-pointer"
                    >
                      Бүгдийг хаах
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {allGradesList.map((grade) => {
                    const isAllowed = currentUserPerms.allowedGrades.includes(grade);
                    return (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => {
                          const updated = isAllowed
                            ? currentUserPerms.allowedGrades.filter((g) => g !== grade)
                            : [...currentUserPerms.allowedGrades, grade];
                          setCurrentUserPerms({
                            ...currentUserPerms,
                            allowedGrades: updated,
                          });
                        }}
                        className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer ${
                          isAllowed
                            ? 'bg-stone-900 text-amber-400 border-stone-800 shadow-2xs'
                            : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {grade}-р анги {isAllowed && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Сэдэв нээгдэх горим (Access Mode) */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <label className="text-xs font-black uppercase text-stone-800 tracking-wider">
                  Сэдэв харагдах горим:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentUserPerms({
                        ...currentUserPerms,
                        accessMode: 'visible',
                      })
                    }
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      currentUserPerms.accessMode === 'visible'
                        ? 'bg-amber-50 border-amber-300 text-stone-950 font-bold shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center space-x-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Нээлттэй (Шууд үзэх)</span>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      Зөвшөөрсөн ангийн бүх сэдвүүдийг шууд үзэж ашиглана.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentUserPerms({
                        ...currentUserPerms,
                        accessMode: 'locked',
                      })
                    }
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      currentUserPerms.accessMode === 'locked'
                        ? 'bg-amber-50 border-amber-300 text-stone-950 font-bold shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Түгжээтэй (Зөвшөөрөл шаардлагатай)</span>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      Хэрэглэгч зөвхөн багшаас зөвшөөрөл авч нээлгэх шаардлагатай.
                    </div>
                  </button>
                </div>
              </div>

              {/* 4. Эрхийн хугацаа (Access period) */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <label className="text-xs font-black uppercase text-stone-800 tracking-wider">
                  Эрхийн хугацаа:
                </label>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCurrentUserPerms({ ...currentUserPerms, expiresAt: null })}
                    className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer ${
                      typeof currentUserPerms.expiresAt !== 'number'
                        ? 'bg-stone-900 text-amber-400 border-stone-900'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    Хугацаагүй
                  </button>
                  {[
                    { label: '1 долоо хоног', days: 7, months: 0 },
                    { label: '1 сар', days: 0, months: 1 },
                    { label: '3 сар', days: 0, months: 3 },
                    { label: '1 жил', days: 0, months: 12 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setCurrentUserPerms({ ...currentUserPerms, expiresAt: addToToday(opt.days, opt.months) })}
                      className="px-3 py-1.5 rounded-lg border font-bold cursor-pointer bg-stone-50 text-stone-700 border-stone-200 hover:bg-amber-50 hover:border-amber-300"
                    >
                      +{opt.label}
                    </button>
                  ))}
                  <label className="flex items-center gap-1.5 text-stone-600">
                    <span>Дуусах өдөр:</span>
                    <input
                      type="date"
                      value={expiryInputValue(currentUserPerms.expiresAt)}
                      onChange={(e) =>
                        setCurrentUserPerms({
                          ...currentUserPerms,
                          expiresAt: e.target.value ? endOfDay(new Date(`${e.target.value}T00:00:00`)) : null,
                        })
                      }
                      className="px-2 py-1 border border-stone-300 rounded-lg bg-white"
                      data-testid="expiry-date"
                    />
                  </label>
                </div>
                <div className="text-[11px] text-stone-500">
                  {typeof currentUserPerms.expiresAt === 'number'
                    ? Date.now() > currentUserPerms.expiresAt
                      ? `Хугацаа ${new Date(currentUserPerms.expiresAt).toLocaleDateString()}-нд дууссан. Хэрэглэгч хичээл, сорил үзэх боломжгүй.`
                      : `${new Date(currentUserPerms.expiresAt).toLocaleDateString()} хүртэл үзнэ (${Math.ceil(
                          (currentUserPerms.expiresAt - Date.now()) / 86400000
                        )} өдөр үлдсэн).`
                    : 'Хугацааны хязгааргүй.'}
                </div>
              </div>

              {/* Save Status & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stone-100">
                {saveStatus ? (
                  <div className="text-xs font-bold text-emerald-700 flex items-center space-x-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{saveStatus}</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-400">
                    Өөрчлөлтийг хийсний дараа «Хадгалах» товч дээр дарна уу.
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveUserPermissions}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Хадгалах
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-stone-400 text-xs bg-stone-50 rounded-2xl border border-stone-200/60">
              Дээрх жагсаалтаас хэрэглэгчийг сонгож эрхийг нь тохируулна уу.
            </div>
          )}
        </div>
      )}

    </div>
  );
};
