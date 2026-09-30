/**
 * Team rollups from team_rep_summary() rows (migration 0023).
 *
 * Kept pure so the numbers a manager reads are unit tested rather than
 * computed inline in a page. Averages across reps are weighted by how many
 * simulations each rep took, so one rep with a single lucky session does not
 * move the team number as much as a rep with twenty.
 */

import { STAGE_IDS, type StageId } from './methodology';
import { weakestBeam, winRate } from './rubric';

export interface RepSummaryRow {
  user_id: string;
  full_name: string | null;
  role: 'owner' | 'admin' | 'manager' | 'rep';
  branch_id: string | null;
  branch_name: string | null;
  joined_at: string;
  simulations: number;
  practice_seconds: number;
  avg_trust: number | string | null;
  avg_relate: number | string | null;
  avg_understand: number | string | null;
  avg_solve: number | string | null;
  avg_secure: number | string | null;
  avg_weighted: number | string | null;
  latest_weighted: number | null;
  last_practiced_at: string | null;
  critical_count: number;
  first_passing_at: string | null;
  ramp_days: number | null;
  field_reviews: number;
  field_avg_weighted: number | string | null;
  deals_won: number;
  deals_lost: number;
  won_value_cents: number | string;
  certified: boolean;
}

/** Default bar for "practiced" in the outcomes comparison: an hour in the period. */
export const PRACTICE_THRESHOLD_SECONDS = 60 * 60;

export function num(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export interface TeamTotals {
  people: number;
  reps: number;
  activeReps: number;
  simulations: number;
  practiceMinutes: number;
  beamAverages: Record<StageId, number | null>;
  weakest: StageId | null;
  avgWeighted: number | null;
  criticalFindings: number;
  criticalRate: number | null;
  medianRampDays: number | null;
  repsPassing: number;
  certified: number;
  fieldReviews: number;
  dealsWon: number;
  dealsLost: number;
  wonValueCents: number;
  winRate: number | null;
  practiced: { reps: number; won: number; decided: number; winRate: number | null };
  unpracticed: { reps: number; won: number; decided: number; winRate: number | null };
}

export function teamTotals(rows: RepSummaryRow[], thresholdSeconds = PRACTICE_THRESHOLD_SECONDS): TeamTotals {
  const reps = rows.filter((r) => r.role === 'rep');
  const simulations = rows.reduce((s, r) => s + r.simulations, 0);

  const beamAverages = Object.fromEntries(
    STAGE_IDS.map((id) => {
      let weighted = 0;
      let count = 0;
      for (const r of rows) {
        const avg = num(r[`avg_${id}` as keyof RepSummaryRow] as number | string | null);
        if (avg == null || !r.simulations) continue;
        weighted += avg * r.simulations;
        count += r.simulations;
      }
      return [id, count ? weighted / count : null];
    }),
  ) as Record<StageId, number | null>;

  let weightedSum = 0;
  for (const r of rows) {
    const avg = num(r.avg_weighted);
    if (avg != null && r.simulations) weightedSum += avg * r.simulations;
  }

  const criticalFindings = rows.reduce((s, r) => s + r.critical_count, 0);
  const dealsWon = rows.reduce((s, r) => s + r.deals_won, 0);
  const dealsLost = rows.reduce((s, r) => s + r.deals_lost, 0);

  const split = (practiced: boolean) => {
    const group = reps.filter((r) => (r.practice_seconds >= thresholdSeconds) === practiced);
    const won = group.reduce((s, r) => s + r.deals_won, 0);
    const decided = group.reduce((s, r) => s + r.deals_won + r.deals_lost, 0);
    return { reps: group.length, won, decided, winRate: winRate(won, decided) };
  };

  return {
    people: rows.length,
    reps: reps.length,
    activeReps: reps.filter((r) => r.simulations > 0).length,
    simulations,
    practiceMinutes: Math.round(rows.reduce((s, r) => s + r.practice_seconds, 0) / 60),
    beamAverages,
    weakest: weakestBeam(beamAverages),
    avgWeighted: simulations ? weightedSum / simulations : null,
    criticalFindings,
    criticalRate: simulations ? criticalFindings / simulations : null,
    medianRampDays: median(reps.map((r) => r.ramp_days).filter((d): d is number => d != null)),
    repsPassing: reps.filter((r) => r.first_passing_at).length,
    certified: rows.filter((r) => r.certified).length,
    fieldReviews: rows.reduce((s, r) => s + r.field_reviews, 0),
    dealsWon,
    dealsLost,
    wonValueCents: rows.reduce((s, r) => s + (num(r.won_value_cents) ?? 0), 0),
    winRate: winRate(dealsWon, dealsWon + dealsLost),
    practiced: split(true),
    unpracticed: split(false),
  };
}

/** A 0–4 average to a display band. Paired with the number, never shown alone. */
export function beamBand(avg: number | null): 'good' | 'mid' | 'low' | 'none' {
  if (avg == null) return 'none';
  if (avg >= 3) return 'good';
  if (avg >= 2) return 'mid';
  return 'low';
}

export const PERIODS = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
] as const;

export function periodStart(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

export function parsePeriod(raw: string | undefined): number {
  const n = Number(raw);
  return PERIODS.some((p) => p.days === n) ? n : 90;
}

export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function formatPct(fraction: number | null, digits = 0): string {
  return fraction == null ? '—' : `${(fraction * 100).toFixed(digits)}%`;
}
