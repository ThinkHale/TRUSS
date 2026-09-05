/**
 * The plan catalog.
 *
 * One definition, read by the pricing page, the Settings billing card, and the
 * admin console, so a plan cannot say one thing to a prospect and another to
 * the operator changing it. The limits here are display copy; the limits that
 * are actually enforced live in plan_entitlements (migration 0006) and are read
 * from the database, because an Enterprise deal can move them without a deploy.
 */

export const PLAN_IDS = ['free', 'pro', 'team', 'enterprise'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** Plans a customer can put themselves on through Stripe Checkout. */
export const PURCHASABLE_PLANS = ['pro', 'team'] as const;
export type PurchasablePlan = (typeof PURCHASABLE_PLANS)[number];

export function isPurchasablePlan(value: unknown): value is PurchasablePlan {
  return typeof value === 'string' && (PURCHASABLE_PLANS as readonly string[]).includes(value);
}

/**
 * Team is billed per seat, with a floor of two.
 *
 * Per seat it undercuts Pro, which is the point — a crew should not pay more
 * per head than a lone rep. The floor is what keeps the ladder honest: a single
 * rep cannot buy one Team seat for $39 and undercut the $49 Pro plan, because
 * the smallest Team subscription is two seats at $78.
 */
export const TEAM_MIN_SEATS = 2;
/** A sanity ceiling on the Checkout quantity. Larger crews are an Enterprise conversation. */
export const TEAM_MAX_SEATS = 500;

export interface Plan {
  id: PlanId;
  name: string;
  /** Display price. The authoritative amount is whatever the Stripe price says. */
  price: string;
  cadence: string | null;
  blurb: string;
  features: string[];
  /** Seats the plan comes with. Null means unlimited. */
  seats: number | null;
  /** True when the Stripe price is per unit and Checkout sends a quantity. */
  perSeat?: boolean;
  minSeats?: number;
  featured?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    blurb: 'Enough to see whether the Coach is worth it.',
    features: [
      'TRUSS Coach, 30 messages a month',
      'Voice practice, 20 minutes a month',
      'Area research, 3 briefs',
    ],
    seats: 1,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    cadence: 'per month',
    blurb: 'For the individual rep who wants to get better.',
    features: [
      'TRUSS Coach, 750 messages a month',
      'Voice practice, 5 hours a month',
      'Area research and weather, 60 briefs',
      'Campaign writing in English and Spanish',
      'Accounts and activity tracking',
    ],
    seats: 1,
  },
  team: {
    id: 'team',
    name: 'Team',
    price: '$39',
    cadence: 'per seat, per month',
    blurb: 'For a crew. Managers see who is practicing and where they are weak.',
    features: [
      'Everything in Pro, with higher limits',
      'Team scorecards and stage-by-stage progress',
      'Shared accounts and research across the crew',
      'Custom roleplay scenarios',
      `Two seats minimum, add as many as you need`,
    ],
    seats: TEAM_MIN_SEATS,
    perSeat: true,
    minSeats: TEAM_MIN_SEATS,
    featured: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    cadence: null,
    blurb: 'Your playbook, your process, your TRUSS.',
    features: [
      'Unlimited Coach, practice, and research',
      'Your training and policies loaded into the Coach',
      'Scenarios built from your real market',
      'White-labeled for your brand',
      'Onboarding and support',
    ],
    seats: null,
  },
};

export const PUBLIC_PLAN_ORDER: PlanId[] = ['pro', 'team', 'enterprise'];

/** Rank used to decide whether a change is an upgrade or a downgrade. */
const RANK: Record<PlanId, number> = { free: 0, pro: 1, team: 2, enterprise: 3 };

export function isUpgrade(from: PlanId, to: PlanId): boolean {
  return RANK[to] > RANK[from];
}

/**
 * The plan actually in force for an org.
 *
 * Mirrors effective_plan() in migration 0008 so the interface never disagrees
 * with what the quota checks enforce. Kept as a pure function over the columns
 * rather than a second database round trip, since the caller has the row.
 */
export interface PlanState {
  plan: PlanId;
  planOverride: PlanId | null;
  overrideExpiresAt: string | null;
}

/** True when an operator grant is set and has not expired. */
export function isOverrideActive(state: PlanState): boolean {
  if (!state.planOverride) return false;
  if (state.overrideExpiresAt && new Date(state.overrideExpiresAt) <= new Date()) return false;
  return true;
}

export function effectivePlan(state: PlanState): PlanId {
  return isOverrideActive(state) ? state.planOverride! : state.plan;
}
