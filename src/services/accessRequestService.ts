import { ApprovedAccount } from '../types';
import { cloud } from './cloud';
import { adminDeleteUser } from './authService';
import { userPermissionsService } from './userPermissionsService';

function findUser(identifier: string) {
  const clean = identifier.trim().toLowerCase();
  return cloud.getUsers().find((u) => u.phoneNumber === clean || u.email.toLowerCase() === clean);
}

export const accessRequestService = {
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
    userPermissionsService.recordAccountStatus(user.userId, !user.active);
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
};
