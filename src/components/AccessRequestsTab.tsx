import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Mail,
  Copy,
  Check,
  Send,
  RefreshCw,
  AlertCircle,
  KeyRound,
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Eye,
  Search,
  ExternalLink,
  UserCheck,
  UserCog,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { accessRequestService } from '../services/accessRequestService';
import { userPermissionsService } from '../services/userPermissionsService';
import { AccessRequest, ApprovedAccount, UserPermissions, DefaultPermissionsConfig, GradeNumber } from '../types';

interface AccessRequestsTabProps {
  onCountChange?: (count: number) => void;
}

type MainTab = 'requests' | 'user-permissions' | 'default-permissions';

export const AccessRequestsTab: React.FC<AccessRequestsTabProps> = ({ onCountChange }) => {
  const [mainTab, setMainTab] = useState<MainTab>('requests');
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [approvedAccounts, setApprovedAccounts] = useState<ApprovedAccount[]>([]);
  const [requestsSubTab, setRequestsSubTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastEmailToast, setLastEmailToast] = useState<{
    email: string;
    pass: string;
    subject: string;
    body: string;
    gmailComposeUrl?: string;
  } | null>(null);

  // User Permissions Tab State
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [currentUserPerms, setCurrentUserPerms] = useState<UserPermissions | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Default Permissions Tab State
  const [defaultConfig, setDefaultConfig] = useState<DefaultPermissionsConfig>(() =>
    userPermissionsService.getDefaultConfig()
  );
  const [defaultSaveStatus, setDefaultSaveStatus] = useState<string | null>(null);

  const loadData = () => {
    const list = accessRequestService.getRequests();
    setRequests(list);
    const accounts = accessRequestService.getApprovedAccounts();
    setApprovedAccounts(accounts);

    const pendingCount = list.filter((r) => r.status === 'pending').length;
    if (onCountChange) {
      onCountChange(pendingCount);
    }
  };

  useEffect(() => {
    loadData();
    setDefaultConfig(userPermissionsService.getDefaultConfig());
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

  const handleApprove = (requestId: string) => {
    const res = accessRequestService.approveRequest(requestId);
    if (res.success && res.request) {
      loadData();
      setLastEmailToast({
        email: res.request.email || res.request.phoneNumber || '',
        pass: res.request.generatedPassword || '',
        subject: res.request.emailSubject || '',
        body: res.request.emailBody || '',
        gmailComposeUrl: res.gmailComposeUrl,
      });
    }
  };

  const handleReject = (requestId: string) => {
    accessRequestService.rejectRequest(requestId);
    loadData();
  };

  const handleDelete = (requestId: string) => {
    accessRequestService.deleteRequest(requestId);
    loadData();
  };

  const handleDeleteAccount = (identifier: string) => {
    accessRequestService.deleteAccount(identifier);
    loadData();
  };

  const handleToggleAccount = (identifier: string) => {
    accessRequestService.toggleAccountStatus(identifier);
    loadData();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Jump from request card to permissions tab
  const handleOpenUserPermissions = (userId: string) => {
    setSelectedUserId(userId);
    setMainTab('user-permissions');
  };

  // Save specific user permissions
  const handleSaveUserPermissions = () => {
    if (!selectedUserId || !currentUserPerms) return;
    userPermissionsService.saveUserPermissions(selectedUserId, currentUserPerms);
    setSaveStatus(`"${selectedUserId}" хэрэглэгчийн эрх амжилттай шинэчлэгдлээ!`);
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // Save default permissions config
  const handleSaveDefaultConfig = () => {
    userPermissionsService.saveDefaultConfig(defaultConfig);
    setDefaultSaveStatus('Шинэ хэрэглэгчийн анхдагч эрхийн тохиргоо амжилттай хадгалагдлаа!');
    setTimeout(() => setDefaultSaveStatus(null), 3500);
  };

  // Build unified list of all users for permissions search/selection
  const allUsersList = useMemo(() => {
    const map = new Map<string, { userId: string; name: string; email: string; phone?: string; status: string }>();

    approvedAccounts.forEach((acc) => {
      const uId = acc.userId || userPermissionsService.generateUserId(acc.email);
      map.set(uId, {
        userId: uId,
        name: acc.fullName,
        email: acc.email,
        phone: acc.phoneNumber,
        status: acc.active ? 'active' : 'inactive',
      });
    });

    requests.forEach((req) => {
      const uId = req.userId || userPermissionsService.generateUserId(req.email || req.phoneNumber);
      if (!map.has(uId)) {
        map.set(uId, {
          userId: uId,
          name: req.fullName,
          email: req.email,
          phone: req.phoneNumber,
          status: req.status,
        });
      }
    });

    return Array.from(map.values());
  }, [approvedAccounts, requests]);

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

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const approvedRequests = requests.filter((r) => r.status === 'approved');

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
          onClick={() => setMainTab('requests')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            mainTab === 'requests'
              ? 'bg-stone-900 text-amber-400 shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200/80'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Нэвтрэх хүсэлтүүд</span>
          {pendingRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-stone-950">
              {pendingRequests.length}
            </span>
          )}
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
          onClick={() => setMainTab('default-permissions')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
            mainTab === 'default-permissions'
              ? 'bg-stone-900 text-amber-400 shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200/80'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Анхдагч эрхийн тохиргоо</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: НЭВТРЭХ ХҮСЭЛТҮҮД (Requests & Accounts) */}
      {/* ========================================================================= */}
      {mainTab === 'requests' && (
        <div className="space-y-4">
          {/* Subfilter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setRequestsSubTab('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  requestsSubTab === 'pending'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Хүлээгдэж буй ({pendingRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestsSubTab('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  requestsSubTab === 'approved'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Зөвшөөрсөн бүртгэлүүд ({approvedAccounts.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestsSubTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  requestsSubTab === 'all'
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Бүх түүх ({requests.length})
              </button>
            </div>

            <button
              type="button"
              onClick={loadData}
              className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
              title="Шинэчлэх"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Email dispatch toast */}
          {lastEmailToast && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950 animate-in fade-in">
              <div className="space-y-1">
                <div className="font-bold flex items-center space-x-1.5 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Хүсэлт зөвшөөрөгдлөө: {lastEmailToast.email}</span>
                </div>
                <div className="text-[11px] text-emerald-700">
                  Нэвтрэх нууц үг: <span className="font-mono font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-900">{lastEmailToast.pass}</span>
                </div>
              </div>
              {lastEmailToast.gmailComposeUrl && (
                <a
                  href={lastEmailToast.gmailComposeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gmail-ээр илгээх</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              )}
            </div>
          )}

          {/* Requests Content */}
          {requestsSubTab === 'approved' ? (
            /* Approved Accounts List */
            approvedAccounts.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs bg-stone-50 rounded-2xl border border-stone-200/60">
                Зөвшөөрсөн идэвхтэй бүртгэл одоогоор алга байна.
              </div>
            ) : (
              <div className="space-y-2.5">
                {approvedAccounts.map((account) => {
                  const uId = account.userId || userPermissionsService.generateUserId(account.email);
                  return (
                    <div
                      key={account.email}
                      className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-300 transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-1">
                          <span className="text-xs font-bold text-stone-900">{account.fullName}</span>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300/80">
                            ID: {uId}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(uId, uId)}
                            className="p-0.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                            title="ID хуулах"
                          >
                            {copiedId === uId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="text-xs text-stone-600 flex items-center space-x-2 truncate">
                          <span>{account.email}</span>
                          {account.phoneNumber && <span>• {account.phoneNumber}</span>}
                          {account.school && <span>• {account.school}</span>}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          Нууц үг: <span className="font-bold text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded">{account.password}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Jump to User Permissions */}
                        <button
                          type="button"
                          onClick={() => handleOpenUserPermissions(uId)}
                          className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
                          title="Энэ хэрэглэгчийн эрхийг тохируулах"
                        >
                          <UserCog className="w-3.5 h-3.5 text-stone-600" />
                          <span>Эрх тохируулах</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleAccount(account.email)}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            account.active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                          }`}
                        >
                          {account.active ? 'Идэвхтэй' : 'Хаагдсан'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(account.email)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Устгах"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Pending or All Requests List */
            (requestsSubTab === 'pending' ? pendingRequests : requests).length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs bg-stone-50 rounded-2xl border border-stone-200/60">
                {requestsSubTab === 'pending'
                  ? 'Одоогоор хүлээгдэж буй нэвтрэх хүсэлт алга байна.'
                  : 'Хүсэлтийн бүртгэл одоогоор алга байна.'}
              </div>
            ) : (
              <div className="space-y-3">
                {(requestsSubTab === 'pending' ? pendingRequests : requests).map((req) => {
                  const uId = req.userId || userPermissionsService.generateUserId(req.email || req.phoneNumber);
                  return (
                    <div
                      key={req.id}
                      className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3 hover:border-amber-300 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2 flex-wrap gap-1">
                            <span className="text-xs font-black text-stone-900">{req.fullName}</span>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300/80">
                              ID: {uId}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(uId, req.id)}
                              className="p-0.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                              title="ID хуулах"
                            >
                              {copiedId === req.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <div className="text-xs text-stone-600 flex items-center space-x-2 truncate">
                            <span>{req.email}</span>
                            {req.phoneNumber && <span>• {req.phoneNumber}</span>}
                            {req.school && <span>• {req.school}</span>}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center space-x-2">
                          {req.status === 'pending' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>Хүлээгдэж байна</span>
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Зөвшөөрсөн</span>
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-300 flex items-center space-x-1">
                              <XCircle className="w-3 h-3" />
                              <span>Татгалзсан</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {req.note && (
                        <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                          {req.note}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-xs">
                        <div className="text-[11px] text-stone-400">
                          Хүсэлт илгээсэн: {new Date(req.requestedAt).toLocaleString()}
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenUserPermissions(uId)}
                            className="px-2.5 py-1 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                            title="Эрх тохируулах"
                          >
                            Эрх тохируулах
                          </button>

                          {req.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(req.id)}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Зөвшөөрөх
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReject(req.id)}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                Татгалзах
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(req.id)}
                            className="p-1 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Устгах"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

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
                      onClick={() => setSelectedUserId(user.userId)}
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

              {/* 2. Нээлттэй хичээлийн хэсгүүд (Sections: Онол, Жишээ, Дасгал, Шалгалт) */}
              <div className="space-y-2.5 pt-2 border-t border-stone-100">
                <label className="text-xs font-black uppercase text-stone-800 tracking-wider">
                  Үзэх боломжтой материалын хэсгүүд:
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Theory */}
                  <label
                    className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-bold cursor-pointer select-none transition-colors ${
                      currentUserPerms.sections.theory
                        ? 'bg-amber-50/70 border-amber-300 text-stone-900'
                        : 'bg-stone-50 border-stone-200 text-stone-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={currentUserPerms.sections.theory}
                      onChange={(e) =>
                        setCurrentUserPerms({
                          ...currentUserPerms,
                          sections: { ...currentUserPerms.sections, theory: e.target.checked },
                        })
                      }
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                    />
                    <span>Онол</span>
                  </label>

                  {/* Examples */}
                  <label
                    className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-bold cursor-pointer select-none transition-colors ${
                      currentUserPerms.sections.examples
                        ? 'bg-amber-50/70 border-amber-300 text-stone-900'
                        : 'bg-stone-50 border-stone-200 text-stone-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={currentUserPerms.sections.examples}
                      onChange={(e) =>
                        setCurrentUserPerms({
                          ...currentUserPerms,
                          sections: { ...currentUserPerms.sections, examples: e.target.checked },
                        })
                      }
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                    />
                    <span>Жишээ</span>
                  </label>

                  {/* Practice */}
                  <label
                    className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-bold cursor-pointer select-none transition-colors ${
                      currentUserPerms.sections.practice
                        ? 'bg-amber-50/70 border-amber-300 text-stone-900'
                        : 'bg-stone-50 border-stone-200 text-stone-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={currentUserPerms.sections.practice}
                      onChange={(e) =>
                        setCurrentUserPerms({
                          ...currentUserPerms,
                          sections: { ...currentUserPerms.sections, practice: e.target.checked },
                        })
                      }
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                    />
                    <span>Дасгал</span>
                  </label>

                  {/* Exams */}
                  <label
                    className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-bold cursor-pointer select-none transition-colors ${
                      currentUserPerms.sections.exams
                        ? 'bg-amber-50/70 border-amber-300 text-stone-900'
                        : 'bg-stone-50 border-stone-200 text-stone-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={currentUserPerms.sections.exams}
                      onChange={(e) =>
                        setCurrentUserPerms({
                          ...currentUserPerms,
                          sections: { ...currentUserPerms.sections, exams: e.target.checked },
                        })
                      }
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                    />
                    <span>Шалгалт (Exams)</span>
                  </label>
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

      {/* ========================================================================= */}
      {/* TAB 3: АНХДАГЧ ЭРХИЙН ТОХИРГОО (Default Initial Permissions) */}
      {/* ========================================================================= */}
      {mainTab === 'default-permissions' && (
        <div className="space-y-5">
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 space-y-1">
            <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Шинэ хэрэглэгчийн анхдагч эрхийн загвар</span>
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Шинээр бүртгүүлсэн эсвэл зөвшөөрөгдсөн хэрэглэгч системд анх нэвтрэхэд юу юу автоматаар нээгдсэн байх суурь эрхийг эндээс тохируулна.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-5">
            {/* 1. Default Allowed Grades */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-stone-800 tracking-wider">
                  Анх нээгдэх ангиуд:
                </label>
                <div className="flex items-center space-x-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setDefaultConfig({
                        ...defaultConfig,
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
                      setDefaultConfig({
                        ...defaultConfig,
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
                  const isAllowed = defaultConfig.allowedGrades.includes(grade);
                  return (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => {
                        const updated = isAllowed
                          ? defaultConfig.allowedGrades.filter((g) => g !== grade)
                          : [...defaultConfig.allowedGrades, grade];
                        setDefaultConfig({
                          ...defaultConfig,
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

            {/* 2. Default Sections */}
            <div className="space-y-2.5 pt-2 border-t border-stone-100">
              <label className="text-xs font-black uppercase text-stone-800 tracking-wider">
                Анх нээгдэх материалын хэсгүүд:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Theory */}
                <label
                  className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-bold cursor-pointer select-none transition-colors ${
                    defaultConfig.sections.theory
                      ? 'bg-amber-50/70 border-amber-300 text-stone-900'
                      : 'bg-stone-50 border-stone-200 text-stone-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={defaultConfig.sections.theory}
                    onChange={(e) =>
                      setDefaultConfig({
                        ...defaultConfig,
                        sections: { ...defaultConfig.sections, theory: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                  />
                  <span>Онол</span>
                </label>

                {/* Examples */}
                <label
                  className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-bold cursor-pointer select-none transition-colors ${
                    defaultConfig.sections.examples
                      ? 'bg-amber-50/70 border-amber-300 text-stone-900'
                      : 'bg-stone-50 border-stone-200 text-stone-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={defaultConfig.sections.examples}
                    onChange={(e) =>
                      setDefaultConfig({
                        ...defaultConfig,
                        sections: { ...defaultConfig.sections, examples: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                  />
                  <span>Жишээ</span>
                </label>

                {/* Practice */}
                <label
                  className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-bold cursor-pointer select-none transition-colors ${
                    defaultConfig.sections.practice
                      ? 'bg-amber-50/70 border-amber-300 text-stone-900'
                      : 'bg-stone-50 border-stone-200 text-stone-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={defaultConfig.sections.practice}
                    onChange={(e) =>
                      setDefaultConfig({
                        ...defaultConfig,
                        sections: { ...defaultConfig.sections, practice: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                  />
                  <span>Дасгал</span>
                </label>

                {/* Exams */}
                <label
                  className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-bold cursor-pointer select-none transition-colors ${
                    defaultConfig.sections.exams
                      ? 'bg-amber-50/70 border-amber-300 text-stone-900'
                      : 'bg-stone-50 border-stone-200 text-stone-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={defaultConfig.sections.exams}
                    onChange={(e) =>
                      setDefaultConfig({
                        ...defaultConfig,
                        sections: { ...defaultConfig.sections, exams: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                  />
                  <span>Шалгалт (Exams)</span>
                </label>
              </div>
            </div>

            {/* 3. Default Topic Access Mode */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="text-xs font-black uppercase text-stone-800 tracking-wider">
                Сэдвийн анхны төлөв:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDefaultConfig({
                      ...defaultConfig,
                      defaultAccessMode: 'visible',
                    })
                  }
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    defaultConfig.defaultAccessMode === 'visible'
                      ? 'bg-amber-50 border-amber-300 text-stone-950 font-bold shadow-2xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center space-x-1.5">
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Нээлттэй (Шууд харагдах)</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Шинэ хэрэглэгчид нээлттэй ангийн хичээлүүд шууд харагдана.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDefaultConfig({
                      ...defaultConfig,
                      defaultAccessMode: 'locked',
                    })
                  }
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    defaultConfig.defaultAccessMode === 'locked'
                      ? 'bg-amber-50 border-amber-300 text-stone-950 font-bold shadow-2xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Түгжээтэй (Тусгайлан нээлгэх)</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Сэдвүүд түгжээтэй байх ба тус бүрд нь хүсэлт илгээж нээлгэнэ.
                  </div>
                </button>
              </div>
            </div>

            {/* Save Status & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stone-100">
              {defaultSaveStatus ? (
                <div className="text-xs font-bold text-emerald-700 flex items-center space-x-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{defaultSaveStatus}</span>
                </div>
              ) : (
                <div className="text-[11px] text-stone-400">
                  Шинэ хэрэглэгч бүрт үйлчлэх суурь загвар.
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveDefaultConfig}
                className="px-5 py-2 bg-stone-900 hover:bg-black text-amber-400 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Анхдагч тохиргоог хадгалах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
