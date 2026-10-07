import { TheoryBlock, TheoryRule } from '../types';

/** A theory item's content as blocks: its own blocks, or the older text / formula / note fields. */
export function theoryBlocks(rule: TheoryRule): TheoryBlock[] {
  if (rule.blocks?.length) return rule.blocks;
  const out: TheoryBlock[] = [];
  if (rule.ruleText?.trim()) out.push({ type: 'text', value: rule.ruleText });
  if (rule.formula?.trim()) out.push({ type: 'formula', value: rule.formula });
  if (rule.note?.trim()) out.push({ type: 'note', value: rule.note });
  return out;
}

/** Numbers of theory items: 1, 2, … and 1.1, 1.2, … for sub-parts of the item above. */
export function theoryNumbers(theory: TheoryRule[]): string[] {
  let main = 0;
  let sub = 0;
  return theory.map((rule) => {
    if (rule.sub && main > 0) return `${main}.${++sub}`;
    sub = 0;
    return String(++main);
  });
}

/** A theory item's whole content as one text: text, then centred formulas as $$…$$ on their own lines. */
export function theoryText(rule: TheoryRule): string {
  return theoryBlocks(rule)
    .map((b) => (b.type === 'formula' ? `$$${b.value}$$` : b.value))
    .join('\n');
}

/** The theory item with all its content in one text field. */
export function withText(rule: TheoryRule, text: string): TheoryRule {
  return { ...rule, ruleText: text, formula: undefined, note: undefined, blocks: undefined };
}
