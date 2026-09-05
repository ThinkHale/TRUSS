/**
 * Stripe webhook.
 *
 * Runs without a user session, so it uses the service-role client and relies
 * on the Stripe signature for authenticity. The raw body must be read before
 * parsing, or signature verification fails.
 *
 * Two properties matter here and neither is optional once real money moves:
 *
 *   Idempotency. Stripe redelivers — on its own timeout, on any non-2xx, and on
 *   operator replay. Every event id is claimed in stripe_events before any work
 *   happens, and a duplicate claim is answered 200 and dropped.
 *
 *   Tenant resolution without the browser. A subscription event can arrive with
 *   no checkout session attached, so the org is resolved from the subscription
 *   metadata, then from the customer id, then from the subscription id — never
 *   from anything the client sent.
 */

import { NextRequest } from 'next/server';
import type Stripe from 'stripe';
import {
  stripe,
  isStripeConfigured,
  webhookSecret,
  planForPrice,
  seatLimitFromSubscription,
} from '@/lib/billing/stripe';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const HANDLED = new Set<string>([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]);

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return Response.json({ error: 'Billing is not configured.' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return Response.json({ error: 'Missing signature.' }, { status: 400 });

  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, webhookSecret());
  } catch {
    return Response.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (!HANDLED.has(event.type)) return Response.json({ received: true });

  const supabase = supabaseAdmin();

  // Claim the event before doing anything. A duplicate delivery loses the race
  // on the primary key and is dropped, which is what makes every handler below
  // safe to have run already.
  const { error: claimError } = await supabase
    .from('stripe_events')
    .insert({ id: event.id, type: event.type });

  if (claimError) {
    // 23505 is unique_violation: this event was already applied.
    if (claimError.code === '23505') return Response.json({ received: true, duplicate: true });
    console.error('stripe webhook could not claim event', {
      id: event.id,
      code: claimError.code,
    });
    // Fail loudly so Stripe retries rather than silently losing the event.
    return Response.json({ error: 'Could not record event.' }, { status: 500 });
  }

  try {
    const orgId = await applyEvent(supabase, event);
    if (orgId) {
      await supabase.from('stripe_events').update({ org_id: orgId }).eq('id', event.id);
    }
  } catch (err) {
    console.error('stripe webhook handler failed', {
      id: event.id,
      type: event.type,
      message: err instanceof Error ? err.message : 'unknown',
    });
    // Release the claim so the retry can do the work rather than being told it
    // is a duplicate of an attempt that never landed.
    await supabase.from('stripe_events').delete().eq('id', event.id);
    return Response.json({ error: 'Handler failed.' }, { status: 500 });
  }

  return Response.json({ received: true });
}

type Admin = ReturnType<typeof supabaseAdmin>;

async function applyEvent(supabase: Admin, event: Stripe.Event): Promise<string | null> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.subscription) return null;

      const orgId =
        session.client_reference_id ??
        session.metadata?.org_id ??
        (await orgIdForCustomer(supabase, session.customer as string | null));
      if (!orgId) return null;

      const subscription = await stripe().subscriptions.retrieve(session.subscription as string);
      await writeSubscription(supabase, orgId, subscription, {
        customerId: (session.customer as string) ?? null,
        billingEmail: session.customer_details?.email ?? null,
      });
      return orgId;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = await orgIdForSubscription(supabase, subscription);
      if (!orgId) return null;

      await writeSubscription(supabase, orgId, subscription, {
        customerId: (subscription.customer as string) ?? null,
        billingEmail: null,
      });
      return orgId;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      // Matched on the subscription id, so a stale delete for a subscription
      // the org has already replaced cannot downgrade the live one.
      const { data } = await supabase
        .from('organizations')
        .update({
          plan: 'free',
          subscription_status: 'canceled',
          stripe_subscription_id: null,
          cancel_at_period_end: false,
          seat_limit: 1,
        })
        .eq('stripe_subscription_id', subscription.id)
        .select('id')
        .maybeSingle();

      return data?.id ?? null;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string | null;
      if (!customerId) return null;

      // Access is not cut off here. The plan stays until Stripe gives up and
      // cancels the subscription; this only records the state so Settings can
      // tell the customer their card failed while they can still fix it.
      const { data } = await supabase
        .from('organizations')
        .update({ subscription_status: 'past_due' })
        .eq('stripe_customer_id', customerId)
        .select('id')
        .maybeSingle();

      return data?.id ?? null;
    }
  }

  return null;
}

/**
 * Writes subscription state onto the org.
 *
 * The plan is only advanced for a subscription Stripe considers live. A
 * past_due or incomplete subscription records its status without granting the
 * plan, so a card that never cleared cannot buy access.
 */
async function writeSubscription(
  supabase: Admin,
  orgId: string,
  subscription: Stripe.Subscription,
  extra: { customerId: string | null; billingEmail: string | null },
) {
  const priceId = subscription.items.data[0]?.price?.id;
  const plan = priceId ? planForPrice(priceId) : null;
  const live = subscription.status === 'active' || subscription.status === 'trialing';

  const patch: Record<string, unknown> = {
    subscription_status: subscription.status,
    stripe_subscription_id: subscription.id,
    current_period_end: periodEnd(subscription),
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  };

  if (extra.customerId) patch.stripe_customer_id = extra.customerId;
  if (extra.billingEmail) patch.billing_email = extra.billingEmail;

  if (plan && live) {
    patch.plan = plan;
    patch.seat_limit = seatLimitFromSubscription(subscription);
  }

  const { error } = await supabase.from('organizations').update(patch).eq('id', orgId);
  if (error) throw new Error(`organizations update failed: ${error.message}`);
}

/** Resolves the tenant for a subscription event, never from client input. */
async function orgIdForSubscription(
  supabase: Admin,
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const fromMetadata = subscription.metadata?.org_id;
  if (fromMetadata) return fromMetadata;

  const { data: bySubscription } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();
  if (bySubscription) return bySubscription.id;

  return orgIdForCustomer(supabase, subscription.customer as string | null);
}

async function orgIdForCustomer(supabase: Admin, customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.id ?? null;
}

/** The period end moved onto subscription items in recent API versions. */
function periodEnd(subscription: Stripe.Subscription): string | null {
  const seconds =
    (subscription as unknown as { current_period_end?: number }).current_period_end ??
    subscription.items.data[0]?.current_period_end;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}
