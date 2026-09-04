/**
 * Stripe access. Server-only.
 *
 * Subscription customers self-serve through Checkout. Enterprise tenants are
 * billed offline and have their plan set directly, so nothing here is on the
 * critical path for an Enterprise deployment.
 */

import Stripe from 'stripe';

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured on the server.');
  if (!client) client = new Stripe(key);
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

/** Maps a Stripe price to a TRUSS plan. Set these in the environment. */
export function planForPrice(priceId: string): 'pro' | 'team' | null {
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_TEAM) return 'team';
  return null;
}

export function priceForPlan(plan: 'pro' | 'team'): string | null {
  return (plan === 'pro' ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_TEAM) ?? null;
}
