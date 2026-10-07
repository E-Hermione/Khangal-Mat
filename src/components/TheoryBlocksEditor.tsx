import React from 'react';
import { TheoryRule } from '../types';
import { theoryText, withText } from '../utils/theoryBlocks';
import { LatexInputWithPreview } from './LatexInputWithPreview';

/** A theory item's content in one field: text with $…$ formulas, and centred formulas via «Голд томьёо». */
export const TheoryBlocksEditor: React.FC<{ rule: TheoryRule; onChange: (rule: TheoryRule) => void }> = ({
  rule,
  onChange,
}) => (
  <LatexInputWithPreview
    label="Агуулга:"
    value={theoryText(rule)}
    onChange={(text) => onChange(withText(rule, text))}
    multiline
    rows={6}
    helpText="«Голд томьёо» товчоор мөрийн голд томьёо оруулна"
  />
);
