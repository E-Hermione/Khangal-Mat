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

const STORAGE_KEY = 'mongolian_math_visibility_settings_v2';

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

class VisibilityService {
  private getSettings(): VisibilitySettings {
    try {
      let data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        // Fallback from v1
        const v1Data = localStorage.getItem('mongolian_math_visibility_settings_v1');
        if (v1Data) {
          const v1Parsed = JSON.parse(v1Data);
          return {
            defaultSections: { ...DEFAULT_SETTINGS.defaultSections, ...(v1Parsed.defaultSections || {}) },
            topicOverrides: v1Parsed.topicOverrides || {},
            hiddenTopicIds: Array.isArray(v1Parsed.hiddenTopicIds) ? v1Parsed.hiddenTopicIds : [],
            lockedTopicIds: [],
          };
        }
        return DEFAULT_SETTINGS;
      }
      const parsed = JSON.parse(data);
      return {
        defaultSections: { ...DEFAULT_SETTINGS.defaultSections, ...(parsed.defaultSections || {}) },
        topicOverrides: parsed.topicOverrides || {},
        hiddenTopicIds: Array.isArray(parsed.hiddenTopicIds) ? parsed.hiddenTopicIds : [],
        lockedTopicIds: Array.isArray(parsed.lockedTopicIds) ? parsed.lockedTopicIds : [],
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private saveSettings(settings: VisibilitySettings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('visibility-settings-updated'));
    } catch (e) {
      console.error('Failed to save visibility settings', e);
    }
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
