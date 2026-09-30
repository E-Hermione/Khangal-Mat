import { AccessRequest, ApprovedAccount, AccessRequestStatus, AuthUser, GradeNumber } from '../types';
import { userPermissionsService } from './userPermissionsService';

const STORAGE_KEY_REQUESTS = 'math_app_access_requests_v1';
const STORAGE_KEY_APPROVED = 'math_app_approved_accounts_v1';
const STORAGE_KEY_ADMIN_PROFILE = 'math_app_admin_profile_v1';

export interface AdminProfile {
  name: string;
  phoneNumber: string;
  email: string;
  password: string;
}

const DEFAULT_ADMIN_PROFILE: AdminProfile = {
  name: 'Админ (89163999)',
  phoneNumber: '89163999',
  email: 'ehangal725@gmail.com',
  password: 'Hangal0101@@',
};

// 24 hours in milliseconds
export const EXPIRATION_DURATION_MS = 24 * 60 * 60 * 1000;

export const accessRequestService = {
  /**
   * Fetch all requests, automatically expiring any pending requests that are older than 24 hours
   */
  getRequests(): AccessRequest[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_REQUESTS);
      if (!raw) return [];
      const list: AccessRequest[] = JSON.parse(raw);
      const now = Date.now();
      let hasUpdates = false;

      // Check 24-hour expiration and ensure userId exists
      const updatedList = list.map((req) => {
        let updated = { ...req };
        if (!updated.userId) {
          hasUpdates = true;
          updated.userId = userPermissionsService.generateUserId(updated.email || updated.phoneNumber || updated.id);
        }
        if (updated.status === 'pending' && now > updated.expiresAt) {
          hasUpdates = true;
          updated.status = 'expired' as AccessRequestStatus;
        }
        return updated;
      });

      if (hasUpdates) {
        localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(updatedList));
      }

      // Sort newest first
      return updatedList.sort((a, b) => b.requestedAt - a.requestedAt);
    } catch (e) {
      console.error('Failed to parse access requests', e);
      return [];
    }
  },

  /**
   * Save request list
   */
  saveRequests(requests: AccessRequest[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
    } catch (e) {
      console.error('Failed to save access requests', e);
    }
  },

  /**
   * Submit a new access request from login screen using Gmail / Email
   */
  submitRequest(data: {
    fullName: string;
    email: string;
    phoneNumber?: string;
    school?: string;
    note?: string;
  }): { success: boolean; message: string; request?: AccessRequest } {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.fullName.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanName) {
      return { success: false, message: 'Овог нэрээ заавал оруулна уу.' };
    }

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return { success: false, message: 'Зөв Gmail хаяг оруулна уу (жишээ: bagsh@gmail.com).' };
    }

    // Check if email is already the main admin
    if (cleanEmail === 'ehangal725@gmail.com' || cleanEmail === 'admin@gmail.com' || cleanEmail === '89163999') {
      return { success: false, message: 'Энэ хаяг системийн админ хаяг байна.' };
    }

    // Check if user already has an active approved account
    const accounts = this.getApprovedAccounts();
    const existingAccount = accounts.find((a) => a.email.toLowerCase() === cleanEmail && a.active);
    if (existingAccount) {
      return {
        success: false,
        message: 'Энэ Gmail хаягт нэвтрэх эрх аль хэдийн олгогдсон байна. Нууц үгээрээ нэвтэрнэ үү.',
      };
    }

    const currentRequests = this.getRequests();

    // Check if there is already an active pending request (not expired)
    const existingPending = currentRequests.find(
      (r) => (r.email?.toLowerCase() === cleanEmail || r.phoneNumber === cleanEmail) && r.status === 'pending' && Date.now() <= r.expiresAt
    );

    if (existingPending) {
      const remainingHours = Math.ceil((existingPending.expiresAt - Date.now()) / (1000 * 60 * 60));
      return {
        success: false,
        message: `Таны хүсэлт аль хэдийн илгээгдсэн, админ шалгаж байна. (Хүчинтэй хугацаа: ${remainingHours} цаг үлдсэн)`,
        request: existingPending,
      };
    }

    const now = Date.now();
    const newRequest: AccessRequest = {
      id: 'req-' + now + '-' + Math.random().toString(36).substring(2, 7),
      userId: userPermissionsService.generateUserId(cleanEmail),
      fullName: cleanName,
      email: cleanEmail,
      phoneNumber: data.phoneNumber?.trim() || '',
      school: data.school?.trim(),
      note: data.note?.trim(),
      requestedAt: now,
      expiresAt: now + EXPIRATION_DURATION_MS,
      status: 'pending',
      emailSent: false,
    };

    const updated = [newRequest, ...currentRequests];
    this.saveRequests(updated);

    return {
      success: true,
      message: `Таны хүсэлт амжилттай илгээгдлээ. Админ зөвшөөрөх үед ${cleanEmail} хаяг руу тань нэвтрэх нэр, нууц үг автоматаар илгээгдэх болно.`,
      request: newRequest,
    };
  },

  /**
   * Student or teacher self-registration with a phone number. The account is active immediately.
   * `grade` is the student's grade, or 'teacher' for a teacher.
   */
  registerUser(data: {
    lastName: string;
    firstName: string;
    phoneNumber: string;
    // Gmail address already verified through Google sign-in
    email: string;
    grade: GradeNumber | 'teacher' | null;
    school: string;
    password: string;
  }): { success: boolean; message: string; account?: ApprovedAccount } {
    const lastName = data.lastName.trim();
    const firstName = data.firstName.trim();
    const phone = data.phoneNumber.replace(/[\s-]/g, '');
    const school = data.school.trim();
    const password = data.password.trim();
    const email = data.email.trim().toLowerCase();

    if (!email) {
      return { success: false, message: 'Gmail хаягаа Google-ээр баталгаажуулна уу.' };
    }
    if (!lastName || !firstName) {
      return { success: false, message: 'Овог, нэрээ заавал оруулна уу.' };
    }
    if (!/^\d{8}$/.test(phone)) {
      return { success: false, message: 'Утасны дугаар 8 оронтой тоо байх ёстой.' };
    }
    if (data.grade === null) {
      return { success: false, message: 'Ангиа сонгоно уу.' };
    }
    if (!school) {
      return { success: false, message: 'Сургуулийнхаа нэрийг оруулна уу.' };
    }
    if (password.length < 6) {
      return { success: false, message: 'Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой.' };
    }

    const adminProfile = this.getAdminProfile();
    if (phone === '89163999' || phone === adminProfile.phoneNumber) {
      return { success: false, message: 'Энэ дугаар системийн админ дугаар байна.' };
    }

    const accounts = this.getApprovedAccounts();
    if (accounts.some((a) => a.phoneNumber === phone)) {
      return { success: false, message: 'Энэ утасны дугаар аль хэдийн бүртгэлтэй байна. Нэвтэрнэ үү.' };
    }
    if (email === adminProfile.email.toLowerCase() || accounts.some((a) => a.email && a.email.toLowerCase() === email)) {
      return { success: false, message: 'Энэ Gmail хаяг аль хэдийн бүртгэлтэй байна. Нэвтэрнэ үү.' };
    }

    const account: ApprovedAccount = {
      userId: userPermissionsService.generateUserId(phone),
      email,
      username: phone,
      phoneNumber: phone,
      password,
      fullName: `${lastName} ${firstName}`,
      lastName,
      firstName,
      school,
      accountType: data.grade === 'teacher' ? 'teacher' : 'student',
      grades: data.grade === 'teacher' ? [] : [data.grade],
      approvedAt: Date.now(),
      active: true,
    };
    this.saveApprovedAccounts([...accounts, account]);

    return { success: true, message: 'Бүртгэл амжилттай үүслээ.', account };
  },

  /**
   * Login for a Gmail address that Google sign-in has just verified (no password needed).
   */
  loginWithVerifiedEmail(
    verifiedEmail: string
  ): { valid: boolean; user?: { userId?: string; phoneNumber?: string; email?: string; username?: string; name: string; role: 'admin' | 'teacher' }; error?: string } {
    const email = verifiedEmail.trim().toLowerCase();
    const adminProfile = this.getAdminProfile();

    if (email === adminProfile.email.toLowerCase()) {
      return {
        valid: true,
        user: {
          userId: 'ADMIN-01',
          phoneNumber: adminProfile.phoneNumber,
          email: adminProfile.email,
          username: email,
          name: adminProfile.name || `Админ (${adminProfile.phoneNumber})`,
          role: 'admin',
        },
      };
    }

    const account = this.getApprovedAccounts().find((a) => a.email && a.email.toLowerCase() === email);
    if (!account) {
      return { valid: false, error: 'Энэ Gmail хаягаар бүртгэл олдсонгүй. Эхлээд бүртгүүлнэ үү.' };
    }
    if (!account.active) {
      return { valid: false, error: 'Таны бүртгэл хаагдсан байна. Админд хандана уу.' };
    }

    return {
      valid: true,
      user: {
        userId: account.userId || userPermissionsService.generateUserId(account.phoneNumber || email),
        email: account.email,
        username: account.username || account.email,
        phoneNumber: account.phoneNumber,
        name: account.fullName,
        role: 'teacher',
      },
    };
  },

  /**
   * Find request by email or phone to allow checking status
   */
  getRequestByEmail(email: string): AccessRequest | null {
    const clean = email.trim().toLowerCase();
    const requests = this.getRequests();
    return requests.find((r) => r.email?.toLowerCase() === clean || r.phoneNumber === clean) || null;
  },

  getRequestByPhone(identifier: string): AccessRequest | null {
    return this.getRequestByEmail(identifier);
  },

  /**
   * Admin approves a request:
   * 1. Generates secure login password
   * 2. Registers account into Approved Accounts (with username = user email)
   * 3. Formulates email notification containing username & password
   * 4. Updates request status to 'approved' and marks emailSent: true
   */
  approveRequest(
    requestId: string,
    customPassword?: string
  ): { success: boolean; message: string; account?: ApprovedAccount; request?: AccessRequest; gmailComposeUrl?: string } {
    const requests = this.getRequests();
    const index = requests.findIndex((r) => r.id === requestId);
    if (index === -1) {
      return { success: false, message: 'Хүсэлт олдсонгүй.' };
    }

    const target = requests[index];
    const userEmail = target.email || target.phoneNumber || '';

    // If it's a topic unlock request, unlock that topic
    if (target.requestType === 'topic_unlock' && target.requestedTopicId) {
      // Set topic to visible for everyone
      try {
        const vKey = 'mongolian_math_visibility_settings_v2';
        const vRaw = localStorage.getItem(vKey);
        if (vRaw) {
          const vData = JSON.parse(vRaw);
          vData.lockedTopicIds = (vData.lockedTopicIds || []).filter((id: string) => id !== target.requestedTopicId);
          vData.hiddenTopicIds = (vData.hiddenTopicIds || []).filter((id: string) => id !== target.requestedTopicId);
          localStorage.setItem(vKey, JSON.stringify(vData));
          window.dispatchEvent(new CustomEvent('visibility-settings-updated'));
        }
      } catch (err) {
        console.error('Failed to unlock topic:', err);
      }
    }

    if (target.requestType === 'topic_unlock') {
      const now = Date.now();
      const updatedRequest: AccessRequest = { ...target, status: 'approved', approvedAt: now };
      requests[index] = updatedRequest;
      this.saveRequests(requests);
      return {
        success: true,
        message: `«${target.requestedTopicTitle || ''}» сэдэв нээгдлээ.`,
        request: updatedRequest,
      };
    }

    // Generate secure 6-character password or use provided
    const password =
      customPassword?.trim() ||
      'M' + Math.floor(100000 + Math.random() * 900000); // e.g. M482915

    const now = Date.now();
    const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://khangalmate.mn';

    // Formatted email subject and body sent to user's Gmail
    const emailSubject = `[Математикийн сургалтын сан] Системд нэвтрэх эрх олгогдлоо`;
    const emailBody = `Сайн байна уу, ${target.fullName}.

Математикийн сургалтын сан системд нэвтрэх таны хүсэлт зөвшөөрөгдлөө.

Таны нэвтрэх мэдээлэл:
• Нэвтрэх нэр (Gmail): ${userEmail}
• Нууц үг: ${password}
• Системийн холбоос: ${originUrl}

Амжилт хүсье!
Математикийн сургалтын сан`;

    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(userEmail)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    const updatedRequest: AccessRequest = {
      ...target,
      status: 'approved',
      approvedAt: now,
      username: userEmail,
      generatedPassword: password,
      emailSent: true,
      emailSentAt: now,
      emailSubject,
      emailBody,
      smsSent: true,
      smsSentAt: now,
      smsMessage: `Нэвтрэх Gmail: ${userEmail}, Нууц үг: ${password}`,
    };

    requests[index] = updatedRequest;
    this.saveRequests(requests);

    // Save/update in approved accounts
    const accounts = this.getApprovedAccounts();
    const existingIdx = accounts.findIndex((a) => a.email.toLowerCase() === userEmail.toLowerCase() || (a.phoneNumber && a.phoneNumber === userEmail));
    const accountUserId = target.userId || userPermissionsService.generateUserId(userEmail);
    const newAccount: ApprovedAccount = {
      userId: accountUserId,
      email: userEmail,
      username: userEmail,
      phoneNumber: target.phoneNumber || '',
      password,
      fullName: target.fullName,
      school: target.school,
      approvedAt: now,
      active: true,
    };

    if (existingIdx !== -1) {
      accounts[existingIdx] = newAccount;
    } else {
      accounts.push(newAccount);
    }
    this.saveApprovedAccounts(accounts);

    return {
      success: true,
      message: `Хүсэлт зөвшөөрөгдөж, ${userEmail} хаяг руу нэвтрэх нэр болон нууц үг (${password}) илгээгдлээ.`,
      account: newAccount,
      request: updatedRequest,
      gmailComposeUrl,
    };
  },

  /**
   * Admin rejects a request
   */
  rejectRequest(requestId: string): { success: boolean } {
    const requests = this.getRequests();
    const updated = requests.map((r) => (r.id === requestId ? { ...r, status: 'rejected' as AccessRequestStatus } : r));
    this.saveRequests(updated);
    return { success: true };
  },

  /**
   * Delete request from archive
   */
  deleteRequest(requestId: string): { success: boolean } {
    const requests = this.getRequests();
    const updated = requests.filter((r) => r.id !== requestId);
    this.saveRequests(updated);
    return { success: true };
  },

  /**
   * Approved Accounts Store
   */
  getApprovedAccounts(): ApprovedAccount[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_APPROVED);
      if (!raw) return [];
      const accounts: ApprovedAccount[] = JSON.parse(raw);
      let updated = false;
      const normalized = accounts.map((acc) => {
        if (!acc.userId) {
          updated = true;
          acc.userId = userPermissionsService.generateUserId(acc.email || acc.phoneNumber || '');
        }
        return acc;
      });
      if (updated) {
        this.saveApprovedAccounts(normalized);
      }
      return normalized;
    } catch {
      return [];
    }
  },

  saveApprovedAccounts(accounts: ApprovedAccount[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_APPROVED, JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save approved accounts', e);
    }
  },

  /**
   * Admin Profile Store & Update
   */
  getAdminProfile(): AdminProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ADMIN_PROFILE);
      if (raw) {
        return { ...DEFAULT_ADMIN_PROFILE, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error('Failed to parse admin profile', e);
    }
    return DEFAULT_ADMIN_PROFILE;
  },

  saveAdminProfile(profile: Partial<AdminProfile>): AdminProfile {
    try {
      const current = this.getAdminProfile();
      const updated: AdminProfile = {
        ...current,
        ...profile,
      };
      localStorage.setItem(STORAGE_KEY_ADMIN_PROFILE, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Failed to save admin profile', e);
      return this.getAdminProfile();
    }
  },

  /**
   * Validate credentials during login:
   * Supports login with Gmail address or Admin username (89163999) or updated admin email/phone
   */
  validateLogin(
    identifier: string,
    pass: string
  ): { valid: boolean; user?: { userId?: string; phoneNumber?: string; email?: string; username?: string; name: string; role: 'admin' | 'teacher' }; error?: string } {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    // 1. Primary admin check (supports default credentials AND updated profile)
    const adminProfile = this.getAdminProfile();
    const isAdminId =
      cleanId === '89163999' ||
      cleanId === 'admin' ||
      cleanId === 'ehangal725@gmail.com' ||
      cleanId === 'admin@gmail.com' ||
      cleanId === adminProfile.phoneNumber.toLowerCase() ||
      cleanId === adminProfile.email.toLowerCase();

    const isAdminPass = cleanPass === adminProfile.password || (cleanPass === 'Hangal0101@@' && !adminProfile.password);

    if (isAdminId && isAdminPass) {
      return {
        valid: true,
        user: {
          userId: 'ADMIN-01',
          phoneNumber: adminProfile.phoneNumber,
          email: adminProfile.email,
          username: cleanId,
          name: adminProfile.name || `Админ (${adminProfile.phoneNumber})`,
          role: 'admin',
        },
      };
    }

    // 2. Approved accounts check (matches by email, username, or phone)
    const accounts = this.getApprovedAccounts();
    const matched = accounts.find(
      (a) => ((a.email && a.email.toLowerCase() === cleanId) || a.username?.toLowerCase() === cleanId || a.phoneNumber === cleanId) && a.active
    );

    if (matched) {
      if (matched.password === cleanPass) {
        return {
          valid: true,
          user: {
            userId: matched.userId || userPermissionsService.generateUserId(matched.email),
            email: matched.email,
            username: matched.username || matched.email,
            phoneNumber: matched.phoneNumber,
            name: matched.fullName || `Багш (${matched.email})`,
            role: 'teacher',
          },
        };
      } else {
        return { valid: false, error: 'Нууц үг тохирохгүй байна.' };
      }
    }

    // 3. Check if they have a pending request
    const requests = this.getRequests();
    const req = requests.find((r) => r.email?.toLowerCase() === cleanId || r.phoneNumber === cleanId);
    if (req) {
      if (req.status === 'pending') {
        return {
          valid: false,
          error: 'Таны нэвтрэх хүсэлт админы зөвшөөрлийг хүлээж байна. (Зөвшөөрсний дараа таны мэйл рүү нууц үг очно)',
        };
      }
      if (req.status === 'expired') {
        return {
          valid: false,
          error: 'Таны өмнөх хүсэлт 24 цаг хэтэрч цуцлагдсан байна. Дахин хүсэлт илгээнэ үү.',
        };
      }
      if (req.status === 'rejected') {
        return {
          valid: false,
          error: 'Таны нэвтрэх хүсэлт татгалзсан байна.',
        };
      }
    }

    return { valid: false, error: 'Утасны дугаар эсвэл нууц үг буруу байна.' };
  },

  /**
   * Revoke or toggle account
   */
  toggleAccountStatus(identifier: string): boolean {
    const clean = identifier.trim().toLowerCase();
    const accounts = this.getApprovedAccounts();
    const updated = accounts.map((acc) =>
      ((acc.email && acc.email.toLowerCase() === clean) || acc.phoneNumber === clean) ? { ...acc, active: !acc.active } : acc
    );
    this.saveApprovedAccounts(updated);
    return true;
  },

  /**
   * Delete an approved account completely
   */
  deleteAccount(identifier: string): boolean {
    const clean = identifier.trim().toLowerCase();
    const accounts = this.getApprovedAccounts();
    const updated = accounts.filter((acc) => !((acc.email && acc.email.toLowerCase() === clean) || acc.phoneNumber === clean));
    this.saveApprovedAccounts(updated);
    return true;
  },

  /**
   * Update User Profile (Phone number, Gmail address, Name)
   */
  updateUserProfile(
    currentUser: AuthUser,
    updates: { name?: string; phoneNumber?: string; email?: string }
  ): { success: boolean; message: string; updatedUser?: AuthUser } {
    const cleanName = updates.name?.trim();
    const cleanEmail = updates.email?.trim().toLowerCase();
    const cleanPhone = updates.phoneNumber?.trim();

    if (!cleanName) {
      return { success: false, message: 'Овог нэрээ заавал оруулна уу.' };
    }

    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return { success: false, message: 'Зөв Gmail / мэйл хаяг оруулна уу.' };
      }
    }

    if (cleanPhone && cleanPhone.length < 8) {
      return { success: false, message: 'Утасны дугаар доод тал нь 8 оронтой байна.' };
    }

    if (currentUser.role === 'admin') {
      const updatedAdmin = this.saveAdminProfile({
        name: cleanName,
        phoneNumber: cleanPhone || currentUser.phoneNumber || '89163999',
        email: cleanEmail || currentUser.email || 'ehangal725@gmail.com',
      });

      const updatedUser: AuthUser = {
        ...currentUser,
        name: updatedAdmin.name,
        phoneNumber: updatedAdmin.phoneNumber,
        email: updatedAdmin.email,
      };

      return {
        success: true,
        message: 'Админы мэдээлэл амжилттай шинэчлэгдлээ.',
        updatedUser,
      };
    } else {
      // Teacher account update
      const accounts = this.getApprovedAccounts();
      const userIdentifier = (currentUser.email || currentUser.phoneNumber || '').toLowerCase();
      const accountIndex = accounts.findIndex(
        (a) => (a.email && a.email.toLowerCase() === userIdentifier) || a.phoneNumber === userIdentifier
      );

      if (
        cleanPhone &&
        accounts.some((a, i) => i !== accountIndex && a.phoneNumber === cleanPhone)
      ) {
        return { success: false, message: 'Энэ утасны дугаар өөр хэрэглэгчид бүртгэлтэй байна.' };
      }

      if (accountIndex >= 0) {
        accounts[accountIndex] = {
          ...accounts[accountIndex],
          fullName: cleanName,
          email: cleanEmail || accounts[accountIndex].email,
          phoneNumber: cleanPhone || accounts[accountIndex].phoneNumber,
        };
        this.saveApprovedAccounts(accounts);
      }

      const updatedUser: AuthUser = {
        ...currentUser,
        name: cleanName,
        email: cleanEmail || currentUser.email,
        phoneNumber: cleanPhone || currentUser.phoneNumber,
      };

      return {
        success: true,
        message: 'Хэрэглэгчийн мэдээлэл амжилттай шинэчлэгдлээ.',
        updatedUser,
      };
    }
  },

  /**
   * Change user password with current password verification
   */
  changePassword(
    currentUser: AuthUser,
    currentPass: string,
    newPass: string
  ): { success: boolean; message: string } {
    const cleanCurrent = currentPass.trim();
    const cleanNew = newPass.trim();

    if (!cleanCurrent) {
      return { success: false, message: 'Одоогийн нууц үгээ оруулна уу.' };
    }
    if (!cleanNew || cleanNew.length < 6) {
      return { success: false, message: 'Шинэ нууц үг дор хаяж 6 тэмдэгттэй байх ёстой.' };
    }

    if (currentUser.role === 'admin') {
      const admin = this.getAdminProfile();
      if (cleanCurrent !== admin.password) {
        return { success: false, message: 'Одоогийн нууц үг буруу байна.' };
      }

      this.saveAdminProfile({ password: cleanNew });
      return { success: true, message: 'Админы нууц үг амжилттай солигдлоо.' };
    } else {
      const accounts = this.getApprovedAccounts();
      const userIdentifier = (currentUser.email || currentUser.phoneNumber || '').toLowerCase();
      const account = accounts.find(
        (a) => (a.email && a.email.toLowerCase() === userIdentifier) || a.phoneNumber === userIdentifier
      );

      if (!account) {
        return { success: false, message: 'Хэрэглэгчийн бүртгэл олдсонгүй.' };
      }

      if (account.password !== cleanCurrent) {
        return { success: false, message: 'Одоогийн нууц үг буруу байна.' };
      }

      account.password = cleanNew;
      this.saveApprovedAccounts(accounts);
      return { success: true, message: 'Нууц үг амжилттай солигдлоо.' };
    }
  },

  /**
   * Submit a request for unlocking a specific topic
   */
  submitTopicUnlockRequest(data: {
    user: AuthUser;
    topicId: string;
    topicTitle: string;
    note?: string;
  }): { success: boolean; message: string; request?: AccessRequest } {
    const cleanEmail = (data.user.email || data.user.phoneNumber || '').trim().toLowerCase();
    const cleanName = (data.user.name || data.user.username || 'Сурагч').trim();
    const currentRequests = this.getRequests();

    // Check if there's already a pending request for this topic
    const existing = currentRequests.find(
      (r) =>
        r.email.toLowerCase() === cleanEmail &&
        r.requestedTopicId === data.topicId &&
        r.status === 'pending'
    );

    if (existing) {
      return {
        success: false,
        message: 'Та энэ хичээлийг нээлгэх хүсэлтээ аль хэдийн багшид илгээсэн байна. Багшийн зөвшөөрлийг хүлээнэ үү.',
      };
    }

    const now = Date.now();
    const newRequest: AccessRequest = {
      id: 'req-topic-' + now + '-' + Math.random().toString(36).substring(2, 7),
      fullName: cleanName,
      email: cleanEmail,
      phoneNumber: data.user.phoneNumber || '',
      note: data.note || `«${data.topicTitle}» хичээлийг нээлгэх хүсэлт`,
      requestedAt: now,
      expiresAt: now + EXPIRATION_DURATION_MS,
      status: 'pending',
      requestedTopicId: data.topicId,
      requestedTopicTitle: data.topicTitle,
      requestType: 'topic_unlock',
      emailSent: false,
    };

    this.saveRequests([newRequest, ...currentRequests]);

    return {
      success: true,
      message: `«${data.topicTitle}» сэдвийг нээлгэх хүсэлт багшид амжилттай илгээгдлээ. Багш зөвшөөрсний дараа хичээлийн агуулга нээгдэнэ.`,
      request: newRequest,
    };
  },
};
