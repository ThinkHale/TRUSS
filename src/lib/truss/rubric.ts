/**
 * The weighted TRUSS rubric and what "passing" means.
 *
 * From the knowledge base's scorecards and benchmarks doctrine: each beam is
 * scored 0–4, weighted Trust 20, Relate 15, Understand 25, Solve 25, Secure 15,
 * for a result out of 100. A session passes at 75 or more with no critical
 * finding — the program's certification bar.
 *
 * The database computes the same number as a generated column
 * (scorecards.weighted_score, migration 0017) and decides passing with
 * truss_is_passing(). This file mirrors both for the client, and the unit
 * tests pin the two together. Safe to import in the browser.
 */

import { STAGE_IDS, type StageId } from './methodology';
import { MAX_STAGE_SCORE } from './scoring';

export const BEAM_WEIGHTS: Record<StageId, number> = {
  trust: 20,
  relate: 15,
  understand: 25,
  solve: 25,
  secure: 15,
};

export const PASSING_WEIGHTED_SCORE = 75;

export type BeamScores = Record<StageId, number>;

/** 0–100, rounded to the nearest point, as the database rounds it. */
export function weightedScore(scores: BeamScores): number {
  const raw = STAGE_IDS.reduce((sum, id) => sum + BEAM_WEIGHTS[id] * scores[id], 0) / MAX_STAGE_SCORE;
  return Math.round(raw);
}

export function isPassing(weighted: number | null | undefined, hasCritical: boolean): boolean {
  return (weighted ?? 0) >= PASSING_WEIGHTED_SCORE && !hasCritical;
}

/**
 * The beam to coach next, from averages. Ties go to the earlier beam, because
 * the method teaches that an early beam breaking is what causes the later ones
 * to fail. Null when nothing has been scored.
 */
export function weakestBeam(averages: Partial<Record<StageId, number | null>>): StageId | null {
  let weakest: StageId | null = null;
  let low = Infinity;
  for (const id of STAGE_IDS) {
    const value = averages[id];
    if (value == null) continue;
    if (value < low) {
      low = value;
      weakest = id;
    }
  }
  return weakest;
}

/** Win rate as a fraction, or null when there is nothing decided to divide by. */
export function winRate(won: number, decided: number): number | null {
  return decided > 0 ? won / decided : null;
}

/**
 * The sample-size caution shown next to any comparison of practiced and
 * unpracticed reps. Under this many decided deals on either side, the
 * difference is mostly noise and the interface says so.
 */
export const MIN_DECIDED_FOR_COMPARISON = 20;
