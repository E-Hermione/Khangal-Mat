import { UserPermissions, DefaultPermissionsConfig, GradeNumber } from '../types';

const STORAGE_KEY_PERMISSIONS = 'math_app_user_permissions_v1';
const STORAGE_KEY_DEFAULT_CONFIG = 'math_app_default_user_permissions_v1';

export const DEFAULT_PERMISSIONS_CONFIG: DefaultPermissionsConfig = {
  allowedGrades: [6, 7, 8, 9, 10, 11, 12],
  sections: {
    theory: true,
    examples: true,
    practice: true,
    exams: true,
  },
  defaultAccessMode: 'visible',
};

class UserPermissionsService {
  /**
   * Get default permission template for new users
   */
  getDefaultConfig(): DefaultPermissionsConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DEFAULT_CONFIG);
      if (!raw) return DEFAULT_PERMISSIONS_CONFIG;
      const parsed = JSON.parse(raw);
      return {
        allowedGrades: Array.isArray(parsed.allowedGrades) ? parsed.allowedGrades : DEFAULT_PERMISSIONS_CONFIG.allowedGrades,
        sections: { ...DEFAULT_PERMISSIONS_CONFIG.sections, ...(parsed.sections || {}) },
        defaultAccessMode: parsed.defaultAccessMode || DEFAULT_PERMISSIONS_CONFIG.defaultAccessMode,
      };
    } catch {
      return DEFAULT_PERMISSIONS_CONFIG;
    }
  }

  /**
   * Save default permission template
   */
  saveDefaultConfig(config: DefaultPermissionsConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY_DEFAULT_CONFIG, JSON.stringify(config));
      window.dispatchEvent(new CustomEvent('user-permissions-updated'));
    } catch (e) {
      console.error('Failed to save default permissions config', e);
    }
  }

  /**
   * Get all user permissions map
   */
  getAllPermissions(): Record<string, UserPermissions> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PERMISSIONS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Get permissions for a specific user ID
   */
  getUserPermissions(userId: string): UserPermissions {
    if (!userId) {
      const def = this.getDefaultConfig();
      return {
        userId: 'GUEST',
        allowedGrades: def.allowedGrades,
        sections: def.sections,
        accessMode: def.defaultAccessMode,
        isBlocked: false,
      };
    }

    const all = this.getAllPermissions();
    if (all[userId]) {
      return all[userId];
    }

    // Initialize with default template
    const def = this.getDefaultConfig();
    const newPerms: UserPermissions = {
      userId,
      allowedGrades: [...def.allowedGrades],
      sections: { ...def.sections },
      accessMode: def.defaultAccessMode,
      isBlocked: false,
      updatedAt: Date.now(),
    };
    return newPerms;
  }

  /**
   * Save permissions for a specific user ID
   */
  saveUserPermissions(userId: string, perms: UserPermissions): void {
    if (!userId) return;
    try {
      const all = this.getAllPermissions();
      all[userId] = {
        ...perms,
        userId,
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY_PERMISSIONS, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('user-permissions-updated'));
    } catch (e) {
      console.error('Failed to save user permissions', e);
    }
  }

  /**
   * Check if a grade is allowed for a user
   */
  isGradeAllowed(userId: string | undefined, grade: GradeNumber, isAdmin: boolean): boolean {
    if (isAdmin) return true;
    if (!userId) {
      return this.getDefaultConfig().allowedGrades.includes(grade);
    }
    const perms = this.getUserPermissions(userId);
    if (perms.isBlocked) return false;
    return perms.allowedGrades.includes(grade);
  }

  /**
   * Check if a section is allowed for a user
   */
  isSectionAllowed(
    userId: string | undefined,
    section: 'theory' | 'examples' | 'practice' | 'exams',
    isAdmin: boolean
  ): boolean {
    if (isAdmin) return true;
    if (!userId) {
      return this.getDefaultConfig().sections[section] ?? true;
    }
    const perms = this.getUserPermissions(userId);
    if (perms.isBlocked) return false;
    return perms.sections[section] ?? true;
  }

  /**
   * Generate a unique user ID, e.g. USR-1048
   */
  generateUserId(seed?: string): string {
    if (seed) {
      // Deterministic numeric hash from email / phone
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
      }
      const num = Math.abs(hash) % 9000 + 1000; // 1000 - 9999
      return `USR-${num}`;
    }
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `USR-${randomNum}`;
  }
}

export const userPermissionsService = new UserPermissionsService();
