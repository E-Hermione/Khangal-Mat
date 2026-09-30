import { cloud } from './cloud';

export interface TopicSectionVisibility {
  theory: boolean;
  examples: boolean;
  practice: boolean;
  test1: boolean;
  test2: boolean;
  test3: boolean;
  answers: boolean;
}

// Mode when topic is locked/hidden from students:
// 'hidden': Completely hidden (student does not even see the topic title)
// 'locked': Topic title is visible with lock icon; clicking shows prompt to request teacher unlock
export type TopicAccessMode = 'visible' | 'locked' | 'hidden';

export interface VisibilitySettings {
  defaultSections: TopicSectionVisibility;
  topicOverrides: Record<string, Partial<TopicSectionVisibility>>;
  hiddenTopicIds: string[]; // completely hidden
  lockedTopicIds: string[]; // title visible with lock, request unlock needed
}

const LEGACY_STORAGE_KEY = 'mongolian_math_visibility_settings_v2';

const DEFAULT_SETTINGS: VisibilitySettings = {
  defaultSections: {
    theory: true,
    examples: true,
    practice: true,
    test1: false,
    test2: false,
    test3: false,
    answers: false,
  },
  topicOverrides: {},
  hiddenTopicIds: [],
  lockedTopicIds: [],
};

function parseSettings(parsed: Record<string, any> | null): VisibilitySettings {
  if (!parsed) return DEFAULT_SETTINGS;
  return {
    defaultSections: { ...DEFAULT_SETTINGS.defaultSections, ...(parsed.defaultSections || {}) },
    topicOverrides: parsed.topicOverrides || {},
    hiddenTopicIds: Array.isArray(parsed.hiddenTopicIds) ? parsed.hiddenTopicIds : [],
    lockedTopicIds: Array.isArray(parsed.lockedTopicIds) ? parsed.lockedTopicIds : [],
  };
}

/** Settings saved in this browser by the pre-Firestore version of the app, if any. */
export function readLegacyLocalVisibility(): VisibilitySettings | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY) ?? localStorage.getItem('mongolian_math_visibility_settings_v1');
    return raw ? parseSettings(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

class VisibilityService {
  private getSettings(): VisibilitySettings {
    // Return a copy: callers mutate the result before saving it
    return JSON.parse(JSON.stringify(parseSettings(cloud.getVisibility())));
  }

  private saveSettings(settings: VisibilitySettings) {
    cloud.setVisibility({ ...settings });
  }

  /**
   * Get effective section visibility for a given topic
   */
  getTopicVisibility(topicId: string): TopicSectionVisibility {
    const settings = this.getSettings();
    const override = settings.topicOverrides[topicId] || {};
    return {
      ...settings.defaultSections,
      ...override,
    };
  }

  /**
   * Get topic access mode for regular students:
   * 'visible': fully accessible per section permissions
   * 'locked': title visible in sidebar, but shows "Багшаар уг хичээлийг нээлгэнэ үү" unlock request
   * 'hidden': completely hidden from student sidebar
   */
  getTopicAccessMode(topicId: string): TopicAccessMode {
    const settings = this.getSettings();
    if (settings.hiddenTopicIds.includes(topicId)) return 'hidden';
    if (settings.lockedTopicIds.includes(topicId)) return 'locked';
    return 'visible';
  }

  setTopicAccessMode(topicId: string, mode: TopicAccessMode) {
    const settings = this.getSettings();
    settings.hiddenTopicIds = settings.hiddenTopicIds.filter((id) => id !== topicId);
    settings.lockedTopicIds = settings.lockedTopicIds.filter((id) => id !== topicId);

    if (mode === 'hidden') {
      settings.hiddenTopicIds.push(topicId);
    } else if (mode === 'locked') {
      settings.lockedTopicIds.push(topicId);
    }
    this.saveSettings(settings);
  }

  /**
   * Check if a topic is hidden completely from regular users
   */
  isTopicHidden(topicId: string): boolean {
    return this.getTopicAccessMode(topicId) === 'hidden';
  }

  /**
   * Check if a topic is locked with a request-to-unlock prompt
   */
  isTopicLocked(topicId: string): boolean {
    return this.getTopicAccessMode(topicId) === 'locked';
  }

  /**
   * Update visibility for a specific topic
   */
  setTopicVisibility(topicId: string, visibility: TopicSectionVisibility) {
    const settings = this.getSettings();
    settings.topicOverrides[topicId] = visibility;
    this.saveSettings(settings);
  }

  /**
   * Toggle a specific section for a topic
   */
  toggleTopicSection(topicId: string, sectionKey: keyof TopicSectionVisibility, isVisible: boolean) {
    const current = this.getTopicVisibility(topicId);
    current[sectionKey] = isVisible;
    this.setTopicVisibility(topicId, current);
  }

  /**
   * Toggle topic visibility (hide/show topic in user list)
   */
  setTopicHidden(topicId: string, hidden: boolean) {
    this.setTopicAccessMode(topicId, hidden ? 'hidden' : 'visible');
  }

  /**
   * Apply a topic's configuration to all topics as default
   */
  applyAsDefault(topicId: string) {
    const current = this.getTopicVisibility(topicId);
    const settings = this.getSettings();
    settings.defaultSections = { ...current };
    this.saveSettings(settings);
  }

  getAllSettings(): VisibilitySettings {
    return this.getSettings();
  }
}

export const visibilityService = new VisibilityService();
