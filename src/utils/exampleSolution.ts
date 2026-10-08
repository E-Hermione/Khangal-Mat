import { TopicPackage } from '../types';

/**
 * Worked examples used to keep their solution as a list of steps (`solutionSteps`). A solution is
 * now one text, one step per line: the steps are joined as they are, nothing else changes.
 */
type LegacyExample = TopicPackage['examples'][number] & { solutionSteps?: string[] };

export const hasStepExamples = (t: TopicPackage): boolean =>
  !!t.examples?.some((e) => Array.isArray((e as LegacyExample).solutionSteps));

export function withExampleSolutions<T extends TopicPackage>(t: T): T {
  if (!hasStepExamples(t)) return t;
  return {
    ...t,
    examples: t.examples.map((e) => {
      const { solutionSteps, ...rest } = e as LegacyExample;
      return { ...rest, solution: rest.solution ?? (solutionSteps || []).join('\n') };
    }),
  };
}
