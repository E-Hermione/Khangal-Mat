# Notes for Claude

- Lesson content never goes in this repository. To put a lesson part on the live site, use the
  admin import script with the part's .json file (needs `FIREBASE_SERVICE_ACCOUNT_B64` in the environment):
  `npx tsx scripts/import-lesson.ts <topicId> <theory|examples|practice|test1|test2|test3> <file.json> [--dry]`
  Run with `--dry` first. Never change a part the owner did not ask for.
  Find the topic id first: `npx tsx scripts/find-topic.ts "<title>"`; a topic not on the site yet is added with
  `npx tsx scripts/create-topic.ts --grade 6 --category "<chapter>" --title "<title>" [--parent <topicId>]`. The environment's setup script stays empty
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
- From «Энгийн бутархай үржих үйлдэл болон хураах үйлдэл» on, answers are reduced (cancel before multiplying,
  crossed numbers with what is left written over or under them). In a multiple-choice question no wrong option
  may equal another option or the answer written another way (no $\frac{15}{60}$ beside $\frac{1}{4}$).
- Each pair of numbers cancelled against each other gets its own color (`\textcolor{#hex}{…}` around both).
- A solution explains this problem's own steps in words (which numbers, why, what comes out), not just the
  rule followed by a bare chain of numbers. A whole number in a product or quotient is first written as
  $\frac{n}{1}$ right after the equals sign ($3 \cdot \frac{2}{7} = \frac{3}{\textcolor{#dc2626}{1}} \cdot \frac{2}{7}$).
- Decimal multiplication is written in a column, downwards (`$$\colmul{57,46}{24}$$`), and division as a long
  division in steps. For a decimal divisor first write the original a : b, say by what both are multiplied
  ($1{,}3 \cdot 10 = 13$, $2{,}5 \cdot 10 = 25$), then divide the new numbers (`$$\coldiv{13}{25}$$`, never the old commas),
  with the textbook rule «Аравтын бутархайг аравтын бутархайд хуваахдаа хуваагчийг бүхэл тоо болтол нь хуваагдагч
  ба хуваагч бутархайн таслалыг ижил орноор шилжүүлж, үйлдлийг гүйцэтгэнэ.» Both are drawn by `columnOps.ts`.
- A part the owner ticked as checked on the home page (`settings/app.contentChecks[topicId]`) keeps its content:
  never replace, add or remove its theory, examples, problems or test questions. Only the written solutions on
  its problem cards may be improved, through `import-lesson.ts --patch` on the `solution` field.
