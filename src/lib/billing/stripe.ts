/**
 * Stripe access. Server-only.
 *
 * Subscription customers self-serve through Checkout. Enterprise tenants are
 * billed offline and have their plan set directly, so nothing here is on the
 * critical path for an Enterprise deployment.
 */

import Stripe from 'stripe';
import { TEAM_MIN_SEATS, TEAM_MAX_SEATS, type PurchasablePlan } from './plans';

let client: Stripe | null = null;

/**
 * Reads a Stripe variable, treating the placeholders shipped in .env.example
 * as absent.
 *
 * This is not defensive nicety. `isStripeConfigured()` used to test the raw
 * string, and `"sk_test_..."` copied out of the example file is a non-empty
 * string — so the app reported billing as configured, skipped the friendly
 * "not configured yet" response, and failed later with a raw Stripe
 * authentication error instead.
 */
function stripeEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  if (!value) return null;
  if (value.endsWith('...')) return null;
  return value;
}

export function stripe(): Stripe {
  const key = stripeEnv('STRIPE_SECRET_KEY');
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured on the server.');
  if (!client) client = new Stripe(key);
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    stripeEnv('STRIPE_SECRET_KEY') &&
      stripeEnv('STRIPE_WEBHOOK_SECRET') &&
      // Without at least one price there is nothing anyone could buy, so the
      // upgrade paths should stay hidden rather than 400 on submit.
      (stripeEnv('STRIPE_PRICE_PRO') || stripeEnv('STRIPE_PRICE_TEAM')),
  );
}

export function webhookSecret(): string {
  const secret = stripeEnv('STRIPE_WEBHOOK_SECRET');
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured on the server.');
  return secret;
}

/** Which of the two prices is configured, for hiding a plan that cannot be sold. */
export function isPlanPurchasable(plan: PurchasablePlan): boolean {
  return Boolean(priceForPlan(plan));
}

/** Maps a Stripe price to a TRUSS plan. Set these in the environment. */
export function planForPrice(priceId: string): PurchasablePlan | null {
  if (priceId && priceId === stripeEnv('STRIPE_PRICE_PRO')) return 'pro';
  if (priceId && priceId === stripeEnv('STRIPE_PRICE_TEAM')) return 'team';
  return null;
}

export function priceForPlan(plan: PurchasablePlan): string | null {
  return stripeEnv(plan === 'pro' ? 'STRIPE_PRICE_PRO' : 'STRIPE_PRICE_TEAM');
}

/**
 * Seats to bill for a plan.
 *
 * Pro is a single seat and its Stripe price is flat, so the quantity is always
 * one. Team is per seat with a floor of two — clamped here rather than trusted
 * from the browser, because the quantity is what the customer is charged for.
 */
export function seatsForPlan(plan: PurchasablePlan, requested: number | undefined): number {
  if (plan === 'pro') return 1;
  const seats = Number.isFinite(requested) ? Math.floor(requested as number) : TEAM_MIN_SEATS;
  return Math.min(TEAM_MAX_SEATS, Math.max(TEAM_MIN_SEATS, seats));
}

/**
 * The seat allowance to record for a subscription.
 *
 * Read back from the Stripe item rather than from what we asked for, so a seat
 * count changed in the billing portal lands in TRUSS on the next webhook.
 */
export function seatLimitFromSubscription(subscription: Stripe.Subscription): number {
  const item = subscription.items.data[0];
  const quantity = item?.quantity ?? 1;
  const plan = item?.price?.id ? planForPrice(item.price.id) : null;
  if (plan === 'pro') return 1;
  return Math.max(1, quantity);
}
