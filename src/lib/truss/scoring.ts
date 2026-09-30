/**
 * Roleplay scoring.
 *
 * After a practice conversation, the transcript is scored beam by beam
 * against the TRUSS Method in the knowledge base (see scoringSystemPrompt in
 * @/lib/ai/prompts). This file holds only what the client also needs: the
 * score bands and the scorecard shape. It must not import the knowledge base,
 * because the Scorecard component ships it to the browser.
 */

import { STAGES, type StageId } from './methodology';
import { z } from 'zod';

/** 0–4 per stage. Deliberately coarse — reps do not need a 100-point score. */
export const SCORE_BANDS = [
  { score: 0, label: 'Not attempted', meaning: 'The stage did not happen at all.' },
  { score: 1, label: 'Missed', meaning: 'Attempted, but the objectives were not met.' },
  { score: 2, label: 'Partial', meaning: 'Some objectives met, key ones missed.' },
  { score: 3, label: 'Solid', meaning: 'Objectives met. Would hold up on a real door.' },
  { score: 4, label: 'Strong', meaning: 'Objectives met and the buyer visibly moved.' },
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

/**
 * The critical findings the scorer names, as codes a report can count.
 * Each one is a critical failure under the knowledge base's critical override:
 * the conversation cannot count as passing, whatever its beam scores.
 */
export const CRITICAL_CODES = [
  'deductible',
  'insurance_promise',
  'unverified_claim',
  'payment_only',
  'scenario_critical',
  'other',
] as const;

export type CriticalCode = (typeof CRITICAL_CODES)[number];

export const CRITICAL_LABELS: Record<CriticalCode, string> = {
  deductible: 'Offered to waive or cover the deductible',
  insurance_promise: 'Promised an insurance outcome',
  unverified_claim: 'Stated an unverified hazard, code, or savings claim',
  payment_only: 'Quoted a payment without price, total cost, or terms',
  scenario_critical: 'Scenario-specific critical failure',
  other: 'Other critical violation',
};

export const criticalFindingSchema = z.object({
  // An unrecognized code from the model is kept as 'other' rather than
  // failing the whole scorecard: the finding matters more than its label.
  code: z.string().transform((c): CriticalCode =>
    (CRITICAL_CODES as readonly string[]).includes(c) ? (c as CriticalCode) : 'other',
  ),
  description: z.string(),
  /** Verbatim quote of what the rep said. */
  evidence: z.string(),
});

export const scorecardSchema = z.object({
  stages: z.array(stageScoreSchema).length(5),
  /** The one thing to work on before the next real conversation. */
  headline: z.string(),
  /** Did the conversation reach a committed next step? */
  outcome: z.enum(['signed', 'next-step-set', 'no-commitment', 'lost']),
  /** Short, plain-language summary the rep reads first. */
  summary: z.string(),
  /** Empty when the conversation had none. Older scorecards predate the field. */
  critical: z.array(criticalFindingSchema).default([]),
});

export type StageScore = z.infer<typeof stageScoreSchema>;
export type Scorecard = z.infer<typeof scorecardSchema>;
export type CriticalFinding = z.infer<typeof criticalFindingSchema>;

export function totalScore(card: Scorecard): number {
  return card.stages.reduce((sum, s) => sum + s.score, 0);
}

export function weakestStage(card: Scorecard): StageScore {
  return card.stages.reduce((min, s) => (s.score < min.score ? s : min), card.stages[0]);
}
