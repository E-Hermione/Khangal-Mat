import { cloud } from './cloud';
import { INITIAL_TOPICS } from '../data/initialData';
import { readLegacyLocalTopics } from './storageService';
import { readLegacyLocalVisibility } from './visibilityService';
import { readLegacyLocalPermissions } from './userPermissionsService';

/**
 * Runs for the admin after the cloud data has loaded. Anything still missing in Firestore is
 * filled from this browser's pre-Firestore data (or the built-in lessons), so content the admin
 * created locally is not lost.
 */
export async function seedCloudFromLegacyData(): Promise<void> {
  if (cloud.getTopics().length === 0) {
    await cloud.replaceTopics(readLegacyLocalTopics() ?? INITIAL_TOPICS);
  } else if (cloud.hasTopicsWithInlineAnswers()) {
    // Topics saved before answers were split out: rewrite them so answers move to topicAnswers
    await cloud.replaceTopics(cloud.getTopics());
  }

  if (!cloud.getVisibility()) {
    const legacy = readLegacyLocalVisibility();
    if (legacy) cloud.setVisibility({ ...legacy });
  }

  const legacyPermissions = readLegacyLocalPermissions();
  if (!cloud.getDefaultPermissions() && legacyPermissions.defaultConfig) {
    cloud.setDefaultPermissions(legacyPermissions.defaultConfig);
  }
  if (Object.keys(cloud.getUserPermissions()).length === 0) {
    for (const [userId, perms] of Object.entries(legacyPermissions.users)) {
      cloud.setUserPermissions(userId, perms);
    }
  }
}
