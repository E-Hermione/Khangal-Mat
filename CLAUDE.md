# Notes for Claude

- Lesson content never goes in this repository. To put a lesson part on the live site, use the
  admin import script with the part's .json file (needs `FIREBASE_SERVICE_ACCOUNT_B64` in the environment):
  `npx tsx scripts/import-lesson.ts <topicId> <theory|examples|practice|test1|test2|test3> <file.json> [--dry]`
  Run with `--dry` first. Never change a part the owner did not ask for.
