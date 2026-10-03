import { UserPermissions, DefaultPermissionsConfig, GradeNumber, PermissionHistoryEntry } from '../types';
import { cloud } from './cloud';

const LEGACY_KEY_PERMISSIONS = 'math_app_user_permissions_v1';
const LEGACY_KEY_DEFAULT_CONFIG = 'math_app_default_user_permissions_v1';

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

function parseDefaultConfig(parsed: Partial<DefaultPermissionsConfig> | null): DefaultPermissionsConfig {
  if (!parsed) return DEFAULT_PERMISSIONS_CONFIG;
  return {
    allowedGrades: Array.isArray(parsed.allowedGrades) ? parsed.allowedGrades : DEFAULT_PERMISSIONS_CONFIG.allowedGrades,
    sections: { ...DEFAULT_PERMISSIONS_CONFIG.sections, ...(parsed.sections || {}) },
    defaultAccessMode: parsed.defaultAccessMode || DEFAULT_PERMISSIONS_CONFIG.defaultAccessMode,
  };
}

/** Permissions saved in this browser by the pre-Firestore version of the app, if any. */
export function readLegacyLocalPermissions(): {
  defaultConfig: DefaultPermissionsConfig | null;
  users: Record<string, UserPermissions>;
} {
  try {
    const def = localStorage.getItem(LEGACY_KEY_DEFAULT_CONFIG);
    const users = localStorage.getItem(LEGACY_KEY_PERMISSIONS);
    return {
      defaultConfig: def ? parseDefaultConfig(JSON.parse(def)) : null,
      users: users ? JSON.parse(users) : {},
    };
  } catch {
    return { defaultConfig: null, users: {} };
  }
}

class UserPermissionsService {
  /**
   * Get default permission template for new users
   */
  getDefaultConfig(): DefaultPermissionsConfig {
    return parseDefaultConfig(cloud.getDefaultPermissions());
  }

  /**
   * Save default permission template
   */
  saveDefaultConfig(config: DefaultPermissionsConfig): void {
    cloud.setDefaultPermissions(config);
  }

  /**
   * Get all user permissions map
   */
  getAllPermissions(): Record<string, UserPermissions> {
    return cloud.getUserPermissions();
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
    const now = Date.now();
    const entry: PermissionHistoryEntry = {
      at: now,
      kind: 'permissions',
      allowedGrades: [...perms.allowedGrades],
      sections: { ...perms.sections },
      accessMode: perms.accessMode,
      isBlocked: !!perms.isBlocked,
      expiresAt: typeof perms.expiresAt === 'number' ? perms.expiresAt : null,
    };
    cloud.setUserPermissions(userId, {
      ...perms,
      userId,
      updatedAt: now,
      history: this.withHistory(userId, entry),
    });
  }

  /**
   * Records that the admin blocked or unblocked the account (shown in the permission history)
   */
  recordAccountStatus(userId: string, active: boolean): void {
    if (!userId) return;
    const current = this.getUserPermissions(userId);
    cloud.setUserPermissions(userId, {
      ...current,
      userId,
      history: this.withHistory(userId, { at: Date.now(), kind: 'account', active }),
    });
  }

  // The stored history plus one entry, capped so the document stays small
  private withHistory(userId: string, entry: PermissionHistoryEntry): PermissionHistoryEntry[] {
    const stored = this.getAllPermissions()[userId]?.history || [];
    return [...stored, entry].slice(-200);
  }

  /**
   * True if the user's access period has ended
   */
  isExpired(userId: string | undefined): boolean {
    if (!userId) return false;
    const expiresAt = this.getUserPermissions(userId).expiresAt;
    return typeof expiresAt === 'number' && Date.now() > expiresAt;
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
    if (perms.isBlocked || this.isExpired(userId)) return false;
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
    if (perms.isBlocked || this.isExpired(userId)) return false;
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

/**
 * True if a typed token names this user: the number of their ID ("2789" for USR-2789), the full ID,
 * or their phone number.
 */
export function matchesUserToken(userId: string, phone: string | undefined, token: string): boolean {
  const t = token.trim().toUpperCase();
  if (!t) return false;
  const id = userId.toUpperCase();
  return id === t || id === `USR-${t}` || (!!phone && phone === t);
}
