/**
 * Unit economics: what a customer pays, what serving them costs, and the
 * margin between. Read by the operator console's Economics page. Server only.
 *
 * COST
 * Token counts are what the provider reported per call (ai_token_usage, 0024).
 * Prices are a table here, because they change with the provider's price list,
 * not with the schema. The defaults are list prices as TRUSS last recorded them
 * and MUST be checked against the provider's current pricing before the numbers
 * are shown to anyone outside the company; every one can be overridden with an
 * environment variable (TRUSS_PRICE_<MODEL>_IN / _CACHED / _OUT, per million
 * tokens, and TRUSS_COST_REALTIME_PER_MIN) without a deploy of this file.
 *
 * Realtime voice practice is the exception: the browser talks to the provider
 * directly over WebRTC, so the server never sees its token counts. It is costed
 * from metered practice minutes at a blended per-minute rate instead.
 *
 * Not included: Supabase, Vercel, Google Maps Platform, and Stripe fees. Those
 * are platform costs, mostly fixed, and belong in a P&L rather than per-seat COGS.
 *
 * REVENUE
 * An offline contract's annual value, when an operator has recorded one;
 * otherwise the self-serve plan's list price times its seats. This is booked
 * run-rate, not recognized revenue.
 */

import { PLANS, type PlanId } from './plans';

export interface ModelPrice {
  /** USD per million input tokens. */
  input: number;
  /** USD per million cached input tokens. */
  cached: number;
  /** USD per million output tokens. */
  output: number;
}

const DEFAULT_PRICES: Record<string, ModelPrice> = {
  'gpt-4.1': { input: 2.0, cached: 0.5, output: 8.0 },
  'gpt-4.1-mini': { input: 0.4, cached: 0.1, output: 1.6 },
  'gpt-4o': { input: 2.5, cached: 1.25, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, cached: 0.075, output: 0.6 },
  'gpt-4o-transcribe': { input: 6.0, cached: 6.0, output: 10.0 },
  'gpt-4o-mini-tts': { input: 0.6, cached: 0.6, output: 12.0 },
  'text-embedding-3-small': { input: 0.02, cached: 0.02, output: 0 },
};

/** Used for a model with no entry, so an unknown model is visible rather than free. */
const FALLBACK_PRICE: ModelPrice = { input: 5.0, cached: 5.0, output: 15.0 };

/** Blended USD per minute of Realtime speech-to-speech practice. */
const DEFAULT_REALTIME_PER_MINUTE = 0.18;

function envNumber(name: string): number | null {
  const raw = process.env[name];
  if (raw == null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function envKey(model: string): string {
  return model.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

export function priceFor(model: string): { price: ModelPrice; known: boolean } {
  const base = DEFAULT_PRICES[model] ?? DEFAULT_PRICES[model.replace(/-\d{4}-\d{2}-\d{2}$/, '')];
  const key = envKey(model);
  const price = {
    input: envNumber(`TRUSS_PRICE_${key}_IN`) ?? base?.input ?? FALLBACK_PRICE.input,
    cached: envNumber(`TRUSS_PRICE_${key}_CACHED`) ?? base?.cached ?? FALLBACK_PRICE.cached,
    output: envNumber(`TRUSS_PRICE_${key}_OUT`) ?? base?.output ?? FALLBACK_PRICE.output,
  };
  return { price, known: Boolean(base) };
}

export function realtimeCostPerMinute(): number {
  return envNumber('TRUSS_COST_REALTIME_PER_MIN') ?? DEFAULT_REALTIME_PER_MINUTE;
}

/** Cached input is billed at the cached rate and is part of input, not in addition to it. */
export function tokenCost(model: string, input: number, cached: number, output: number): number {
  const { price } = priceFor(model);
  const uncached = Math.max(0, input - cached);
  return (uncached * price.input + cached * price.cached + output * price.output) / 1_000_000;
}

/** Monthly run-rate revenue in USD for an org, from its contract or its plan. */
export function monthlyRevenue(org: {
  billedPlan: PlanId;
  subscriptionStatus: string | null;
  seatLimit: number | null;
  contractAnnualValueCents: number | null;
}): { usd: number; basis: 'contract' | 'plan' | 'none' } {
  if (org.contractAnnualValueCents != null && org.contractAnnualValueCents > 0) {
    return { usd: org.contractAnnualValueCents / 100 / 12, basis: 'contract' };
  }
  const paying = org.subscriptionStatus === 'active' || org.subscriptionStatus === 'past_due';
  if (!paying) return { usd: 0, basis: 'none' };
  const listPrice = Number(PLANS[org.billedPlan]?.price.replace(/[^0-9.]/g, '') || 0);
  if (!listPrice) return { usd: 0, basis: 'none' };
  const seats = PLANS[org.billedPlan].perSeat ? Math.max(org.seatLimit ?? 1, PLANS[org.billedPlan].minSeats ?? 1) : 1;
  return { usd: listPrice * seats, basis: 'plan' };
}

export interface EconomicsRow {
  org_id: string;
  name: string;
  kind: 'company' | 'portfolio';
  parent_org_id: string | null;
  billed_plan: PlanId;
  effective: PlanId;
  subscription_status: string | null;
  seat_limit: number | null;
  members: number;
  active_users: number;
  contract_annual_value_cents: number | null;
  practice_seconds: number;
  coach_messages: number;
  model: string | null;
  input_tokens: number | string;
  cached_input_tokens: number | string;
  output_tokens: number | string;
  audio_seconds: number | string;
}

export interface OrgEconomics {
  orgId: string;
  name: string;
  kind: 'company' | 'portfolio';
  parentOrgId: string | null;
  billedPlan: PlanId;
  effectivePlan: PlanId;
  members: number;
  activeUsers: number;
  revenueUsd: number;
  revenueBasis: 'contract' | 'plan' | 'none';
  tokenCostUsd: number;
  voiceCostUsd: number;
  costUsd: number;
  grossMarginPct: number | null;
  costPerActiveUserUsd: number | null;
  practiceMinutes: number;
  coachMessages: number;
  unknownModels: string[];
}

/** Folds admin_unit_economics() rows (one per org per model) into one row per org. */
export function summarizeEconomics(rows: EconomicsRow[]): OrgEconomics[] {
  const byOrg = new Map<string, OrgEconomics>();
  const perMinute = realtimeCostPerMinute();

  for (const row of rows) {
    let org = byOrg.get(row.org_id);
    if (!org) {
      const revenue = monthlyRevenue({
        billedPlan: row.billed_plan,
        subscriptionStatus: row.subscription_status,
        seatLimit: row.seat_limit,
        contractAnnualValueCents: row.contract_annual_value_cents == null ? null : Number(row.contract_annual_value_cents),
      });
      const practiceMinutes = Number(row.practice_seconds ?? 0) / 60;
      org = {
        orgId: row.org_id,
        name: row.name,
        kind: row.kind,
        parentOrgId: row.parent_org_id,
        billedPlan: row.billed_plan,
        effectivePlan: row.effective,
        members: Number(row.members),
        activeUsers: Number(row.active_users),
        revenueUsd: revenue.usd,
        revenueBasis: revenue.basis,
        tokenCostUsd: 0,
        voiceCostUsd: practiceMinutes * perMinute,
        costUsd: 0,
        grossMarginPct: null,
        costPerActiveUserUsd: null,
        practiceMinutes,
        coachMessages: Number(row.coach_messages ?? 0),
        unknownModels: [],
      };
      byOrg.set(row.org_id, org);
    }

    if (row.model) {
      org.tokenCostUsd += tokenCost(
        row.model,
        Number(row.input_tokens),
        Number(row.cached_input_tokens),
        Number(row.output_tokens),
      );
      if (!priceFor(row.model).known && !org.unknownModels.includes(row.model)) org.unknownModels.push(row.model);
    }
  }

  for (const org of byOrg.values()) {
    org.costUsd = org.tokenCostUsd + org.voiceCostUsd;
    org.grossMarginPct = org.revenueUsd > 0 ? ((org.revenueUsd - org.costUsd) / org.revenueUsd) * 100 : null;
    org.costPerActiveUserUsd = org.activeUsers > 0 ? org.costUsd / org.activeUsers : null;
  }

  return [...byOrg.values()].sort((a, b) => b.revenueUsd - a.revenueUsd || b.costUsd - a.costUsd);
}
