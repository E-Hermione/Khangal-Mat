import { AccessRequest, ApprovedAccount, AccessRequestStatus, AuthUser } from '../types';
import { cloud } from './cloud';
import { visibilityService } from './visibilityService';
import { adminDeleteUser } from './authService';

// 24 hours in milliseconds
export const EXPIRATION_DURATION_MS = 24 * 60 * 60 * 1000;

function findUser(identifier: string) {
  const clean = identifier.trim().toLowerCase();
  return cloud.getUsers().find((u) => u.phoneNumber === clean || u.email.toLowerCase() === clean);
}

export const accessRequestService = {
  /**
   * Topic unlock requests (admin only), newest first. Pending requests older than 24 hours
   * are shown as expired.
   */
  getRequests(): AccessRequest[] {
    const now = Date.now();
    return cloud
      .getRequests()
      .map((r) => (r.status === 'pending' && now > r.expiresAt ? { ...r, status: 'expired' as AccessRequestStatus } : r))
      .sort((a, b) => b.requestedAt - a.requestedAt);
  },

  /**
   * Admin approves a topic unlock request: the topic becomes visible to everyone.
   */
  approveRequest(requestId: string): { success: boolean; message: string; request?: AccessRequest } {
    const target = this.getRequests().find((r) => r.id === requestId);
    if (!target) {
      return { success: false, message: 'Хүсэлт олдсонгүй.' };
    }

    if (target.requestedTopicId) {
      visibilityService.setTopicAccessMode(target.requestedTopicId, 'visible');
    }

    const update = { status: 'approved' as AccessRequestStatus, approvedAt: Date.now() };
    cloud.updateRequest(requestId, update);
    return {
      success: true,
      message: `«${target.requestedTopicTitle || ''}» сэдэв нээгдлээ.`,
      request: { ...target, ...update },
    };
  },

  rejectRequest(requestId: string): { success: boolean } {
    cloud.updateRequest(requestId, { status: 'rejected' });
    return { success: true };
  },

  deleteRequest(requestId: string): { success: boolean } {
    cloud.deleteRequest(requestId);
    return { success: true };
  },

  /**
   * Registered users (admin only), in the shape the admin screens use.
   */
  getApprovedAccounts(): ApprovedAccount[] {
    return cloud
      .getUsers()
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((u) => ({
        uid: u.uid,
        userId: u.userId,
        email: u.email,
        username: u.phoneNumber,
        phoneNumber: u.phoneNumber,
        fullName: u.fullName,
        lastName: u.lastName,
        firstName: u.firstName,
        school: u.school,
        accountType: u.accountType,
        grades: u.grades,
        approvedAt: u.createdAt,
        active: u.active,
      }));
  },

  /**
   * Admin: block or unblock an account (by phone number or email).
   */
  toggleAccountStatus(identifier: string): boolean {
    const user = findUser(identifier);
    if (!user) return false;
    cloud.updateUser(user.uid, { active: !user.active });
    return true;
  },

  /**
   * Admin: delete an account completely (by phone number or email).
   */
  async deleteAccount(identifier: string): Promise<boolean> {
    const user = findUser(identifier);
    if (!user) return false;
    await adminDeleteUser(user.uid, user.phoneNumber);
    cloud.removeUserLocally(user.uid);
    return true;
  },

  /**
   * Submit a request for unlocking a specific topic
   */
  async submitTopicUnlockRequest(data: {
    user: AuthUser;
    requesterUid: string;
    topicId: string;
    topicTitle: string;
    note?: string;
  }): Promise<{ success: boolean; message: string; request?: AccessRequest }> {
    const now = Date.now();
    const request: AccessRequest = {
      // One request per user and topic; the rules only allow creating it, not overwriting
      id: `req-topic-${data.requesterUid}-${data.topicId}`.replace(/[^\w-]/g, '_'),
      requesterUid: data.requesterUid,
      userId: data.user.userId,
      fullName: (data.user.name || 'Хэрэглэгч').trim(),
      email: (data.user.email || '').toLowerCase(),
      phoneNumber: data.user.phoneNumber || '',
      note: data.note || `«${data.topicTitle}» хичээлийг нээлгэх хүсэлт`,
      requestedAt: now,
      expiresAt: now + EXPIRATION_DURATION_MS,
      status: 'pending',
      requestedTopicId: data.topicId,
      requestedTopicTitle: data.topicTitle,
      requestType: 'topic_unlock',
    };

    try {
      await cloud.addRequest(request);
    } catch (err) {
      console.error('Failed to submit unlock request', err);
      return {
        success: false,
        message: 'Та энэ хичээлийг нээлгэх хүсэлтээ аль хэдийн илгээсэн байна. Багшийн зөвшөөрлийг хүлээнэ үү.',
      };
    }

    return {
      success: true,
      message: `«${data.topicTitle}» сэдвийг нээлгэх хүсэлт багшид амжилттай илгээгдлээ. Багш зөвшөөрсний дараа хичээлийн агуулга нээгдэнэ.`,
      request,
    };
  },
};
