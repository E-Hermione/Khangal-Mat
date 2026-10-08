# Notes for Claude

- Lesson content never goes in this repository. To put a lesson part on the live site, use the
  admin import script with the part's .json file (needs `FIREBASE_SERVICE_ACCOUNT_B64` in the environment):
  `npx tsx scripts/import-lesson.ts <topicId> <theory|examples|practice|test1|test2|test3> <file.json> [--dry]`
  Run with `--dry` first. Never change a part the owner did not ask for.
  Find the topic id first: `npx tsx scripts/find-topic.ts "<title>"`. The environment's setup script stays empty
  (run `npm install` yourself).
  To keep what the owner edited by hand: `--append` adds the file's items after what is on the site, and
  `--patch` (a list of `{ id, field, from, to }`) changes a field only while it still reads `from`.
- Solutions are written with the subject's terms: «$\frac{9}{8}$ бутархайн хувьд $9 > 8$ буюу хүртвэр нь
  хуваариасаа их», never «$\frac{9}{8}: 9>8$» or «зураасны доорх тоо». Each solution states its rule in bold.
