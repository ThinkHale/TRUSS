/**
 * The TRUSS methodology: the five beams, as the rest of the app names them.
 *
 *   T — Trust      Earn credibility before asking for commitment.
 *   R — Relate     Understand the person, context, priorities, and stakes.
 *   U — Understand Diagnose the real need through disciplined discovery.
 *   S — Solve      Connect the right solution to what the customer actually values.
 *   S — Secure     Create clarity, resolve uncertainty, and confidently establish
 *                  the next commitment.
 *
 * This file holds only identity: ids, letters, names, and the one-line
 * principle from the TRUSS AI Knowledge Base. It is imported by client
 * components, so it deliberately carries no teaching content. What each beam
 * means lives in the knowledge base (@/lib/truss/knowledge), which grounds
 * every AI surface, and in the field manual the Method page renders
 * (@/lib/truss/handbook).
 */

export type StageId = 'trust' | 'relate' | 'understand' | 'solve' | 'secure';

export interface Stage {
  id: StageId;
  /** The letter this stage contributes to the acronym. */
  letter: string;
  name: string;
  /** The beam's operating principle, verbatim from the knowledge base. */
  oneLiner: string;
}

export const STAGES: readonly Stage[] = [
  {
    id: 'trust',
    letter: 'T',
    name: 'Trust',
    oneLiner: 'Earn credibility before asking for commitment.',
  },
  {
    id: 'relate',
    letter: 'R',
    name: 'Relate',
    oneLiner: 'Understand the person, context, priorities, and stakes.',
  },
  {
    id: 'understand',
    letter: 'U',
    name: 'Understand',
    oneLiner: 'Diagnose the real need through disciplined discovery.',
  },
  {
    id: 'solve',
    letter: 'S',
    name: 'Solve',
    oneLiner: 'Connect the right solution to what the customer actually values.',
  },
  {
    id: 'secure',
    letter: 'S',
    name: 'Secure',
    oneLiner: 'Create clarity, resolve uncertainty, and confidently establish the next commitment.',
  },
] as const;

export const STAGE_IDS = STAGES.map((s) => s.id) as readonly StageId[];

export function getStage(id: StageId): Stage {
  const stage = STAGES.find((s) => s.id === id);
  if (!stage) throw new Error(`Unknown TRUSS stage: ${id}`);
  return stage;
}
