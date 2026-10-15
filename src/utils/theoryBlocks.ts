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
  return { ...rule, ruleText: text, formula: undefined, note: undefined, blocks: undefined, split: undefined };
}

export type TheoryPart = { kind: 'rule' | 'text' | 'formula'; value: string };

/**
 * A theory text split for display: a line that starts in bold is a rule (shown in its own box),
 * a line that is only a $$…$$ formula stands centred on its own, and the other lines are
 * plain text, consecutive ones kept together.
 */
export function theoryParts(text: string): TheoryPart[] {
  const parts: TheoryPart[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('$$')) {
      // a display formula may run over several lines
      while (!/^\$\$[\s\S]+\$\$$/.test(line) && i + 1 < lines.length) line += '\n' + lines[++i];
      if (/^\$\$[\s\S]+?\$\$$/.test(line) && line.indexOf('$$', 2) === line.length - 2) {
        parts.push({ kind: 'formula', value: line.slice(2, -2) });
        continue;
      }
    }
    const kind = line.startsWith('**') ? 'rule' : 'text';
    const last = parts[parts.length - 1];
    if (kind === 'text' && last?.kind === 'text') last.value += '\n' + line;
    else parts.push({ kind, value: line });
  }
  return parts;
}
