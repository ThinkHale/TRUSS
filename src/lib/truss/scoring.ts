/**
 * Roleplay scoring.
 *
 * After a practice conversation, the transcript is scored stage by stage
 * against the behaviors defined in methodology.ts. The rubric is generated
 * from the methodology rather than duplicated, so the two can never drift.
 */

import { STAGES, type StageId } from './methodology';
import { z } from 'zod';

/** 0–4 per stage. Deliberately coarse — reps do not need a 100-point score. */
export const SCORE_BANDS = [
  { score: 0, label: 'Not attempted', meaning: 'The stage did not happen at all.' },
  { score: 1, label: 'Missed', meaning: 'Attempted, but the objectives were not met.' },
  { score: 2, label: 'Partial', meaning: 'Some objectives met, key ones missed.' },
  { score: 3, label: 'Solid', meaning: 'Objectives met. Would hold up on a real door.' },
  { score: 4, label: 'Strong', meaning: 'Objectives met and the homeowner visibly moved.' },
] as const;

export const MAX_STAGE_SCORE = 4;
export const MAX_TOTAL_SCORE = MAX_STAGE_SCORE * STAGES.length; // 20

export const stageScoreSchema = z.object({
  stage: z.enum(['trust', 'relate', 'understand', 'solve', 'secure']),
  score: z.number().int().min(0).max(MAX_STAGE_SCORE),
  /** Verbatim quote from the transcript that justifies the score. */
  evidence: z.string(),
  /** What the rep did well here. Empty if score is 0. */
  wentWell: z.array(z.string()),
  /** The single highest-leverage change. One item, not a list of five. */
  improve: z.string(),
  /** A better line the rep could have used, in their voice. */
  betterLine: z.string().nullable(),
});

export const scorecardSchema = z.object({
  stages: z.array(stageScoreSchema).length(5),
  /** The one thing to work on before the next real conversation. */
  headline: z.string(),
  /** Did the conversation reach a committed next step? */
  outcome: z.enum(['signed', 'next-step-set', 'no-commitment', 'lost']),
  /** Short, plain-language summary the rep reads first. */
  summary: z.string(),
});

export type StageScore = z.infer<typeof stageScoreSchema>;
export type Scorecard = z.infer<typeof scorecardSchema>;

export function totalScore(card: Scorecard): number {
  return card.stages.reduce((sum, s) => sum + s.score, 0);
}

export function weakestStage(card: Scorecard): StageScore {
  return card.stages.reduce((min, s) => (s.score < min.score ? s : min), card.stages[0]);
}

/** Rubric text for the scoring prompt, generated from the methodology. */
export function scoringRubric(): string {
  const bands = SCORE_BANDS.map((b) => `  ${b.score} = ${b.label}: ${b.meaning}`).join('\n');

  const stages = STAGES.map((stage) => {
    const criteria = stage.behaviors
      .map((b) => `    - ${b.behavior} (looks like: ${b.evidence})`)
      .join('\n');
    return `${stage.name.toUpperCase()} (${stage.id})\n  Score this stage on whether the rep:\n${criteria}`;
  }).join('\n\n');

  return `SCORE BANDS\n${bands}\n\nSTAGE CRITERIA\n${stages}`;
}
