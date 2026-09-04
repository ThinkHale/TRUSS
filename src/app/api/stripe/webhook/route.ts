/**
 * Stripe webhook.
 *
 * Runs without a user session, so it uses the service-role client and relies
 * on the Stripe signature for authenticity. The raw body must be read before
 * parsing, or signature verification fails.
 */

import { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { stripe, isStripeConfigured, planForPrice } from '@/lib/billing/stripe';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return Response.json({ error: 'Billing is not configured.' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return Response.json({ error: 'Missing signature.' }, { status: 400 });

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return Response.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.client_reference_id;
      if (!orgId || !session.subscription) break;

      const subscription = await stripe().subscriptions.retrieve(session.subscription as string);
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId ? planForPrice(priceId) : null;

      await supabase
        .from('organizations')
        .update({
          plan: plan ?? 'pro',
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          current_period_end: periodEnd(subscription),
          seat_limit: plan === 'team' ? 10 : 1,
        })
        .eq('id', orgId);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId ? planForPrice(priceId) : null;

      await supabase
        .from('organizations')
        .update({
          subscription_status: subscription.status,
          current_period_end: periodEnd(subscription),
          // A past-due or canceled subscription drops the org to free rather
          // than cutting access off mid-month.
          ...(plan && subscription.status === 'active' ? { plan } : {}),
        })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await supabase
        .from('organizations')
        .update({
          plan: 'free',
          subscription_status: 'canceled',
          stripe_subscription_id: null,
          seat_limit: 1,
        })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }
  }

  return Response.json({ received: true });
}

/** The period end moved onto subscription items in recent API versions. */
function periodEnd(subscription: Stripe.Subscription): string | null {
  const seconds =
    (subscription as unknown as { current_period_end?: number }).current_period_end ??
    subscription.items.data[0]?.current_period_end;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}
