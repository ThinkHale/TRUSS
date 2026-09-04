/**
 * Shared UI helpers tied to the methodology.
 *
 * Stage color is defined once here so a stage looks the same in the nav, the
 * scorecard, the account list, and the campaign builder.
 */

import type { StageId } from './methodology';

export const STAGE_COLOR: Record<StageId, string> = {
  trust: 'var(--color-stage-trust)',
  relate: 'var(--color-stage-relate)',
  understand: 'var(--color-stage-understand)',
  solve: 'var(--color-stage-solve)',
  secure: 'var(--color-stage-secure)',
};

export const RATING_COLOR: Record<'good' | 'marginal' | 'no-go', string> = {
  good: 'var(--color-go)',
  marginal: 'var(--color-marginal)',
  'no-go': 'var(--color-nogo)',
};

/** 0–4 stage score to a color, so a weak stage is obvious at a glance. */
export function scoreColor(score: number): string {
  if (score >= 3) return 'var(--color-go)';
  if (score === 2) return 'var(--color-marginal)';
  return 'var(--color-nogo)';
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
