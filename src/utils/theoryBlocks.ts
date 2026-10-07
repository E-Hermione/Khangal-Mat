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

/** The theory item with new blocks; the first text block also stays in ruleText. */
export function withBlocks(rule: TheoryRule, blocks: TheoryBlock[]): TheoryRule {
  return {
    ...rule,
    blocks,
    ruleText: blocks.find((b) => b.type === 'text')?.value || '',
    formula: undefined,
    note: undefined,
  };
}

