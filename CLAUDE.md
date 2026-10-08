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
  A sentence never ends in a formula followed by «:» («… $7{,}2 = 7{,}20$:»); it ends in words («… гэж бичээд хасна.»).
  A label before its content («Зууны орон: $0 + 5 = 5$») is fine.
- Every topic has at least 10 worked examples (all different, solutions explained in detail), 15 practice
  problems and 15 questions in each test. The general view's home page shows which topics fall short.
- Mixed numbers are added and subtracted in one line («$3\frac{2}{7} + 1\frac{3}{7} = 4\frac{5}{7}$»), never with
  the whole parts worked out on their own («$3 + 1 = 4$»). The same for column sums: only a carry or a borrow
  is explained, not each digit.
- Tests and practice use only what this topic's theory and examples teach, or earlier topics of the same
  grade. Nothing from later topics or higher grades (no sequences with $a_n$ in grade 6).
- Unlike denominators are made alike as in the owner's notebook, never through the least common multiple:
  split each denominator, cross out the factor both share ($15 = 5 \cdot \cancel{3}$, $33 = 11 \cdot \cancel{3}$),
  then multiply crosswise by what is left. Grade 6 answers need no reducing, so pick numbers whose answer is
  already in lowest terms.
- Tests get harder from test1 to test3, for every grade and topic: test1 (Анхан) checks the basic ideas, test2 (Дунд)
  covers everything the topic teaches at the level a student who learned it all should reach, test3 (Ахисан) goes
  deeper (larger numbers, borrowing, unknowns, several steps). The owner's textbook pages set the level.
