import { cloud } from './cloud';
import { readLegacyLocalTopics } from './storageService';
import { readLegacyLocalVisibility } from './visibilityService';
import { readLegacyLocalPermissions } from './userPermissionsService';

/**
 * Runs for the admin after the cloud data has loaded. Anything still missing in Firestore is
 * filled from this browser's pre-Firestore data, so content the admin
 * created locally is not lost.
 */
export async function seedCloudFromLegacyData(): Promise<void> {
  const legacy = readLegacyLocalTopics();
  if (cloud.getTopics().length === 0 && legacy) {
    await cloud.replaceTopics(legacy);
  } else if (cloud.hasTopicsNeedingAnswerRewrite() || cloud.hasTopicsWithStepExamples()) {
    // Topics with inline answers or an older answer-key format: rewrite them (answers go to topicAnswers)
    await cloud.replaceTopics(cloud.getTopics());
  }

  // Topics saved before lessons were protected get their list entry and tests documents
  await cloud.backfillTopicIndex();

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
