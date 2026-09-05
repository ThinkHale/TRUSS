/**
 * Starts a Stripe Checkout session for a subscription upgrade.
 *
 * The org id travels in client_reference_id so the webhook can attach the
 * resulting subscription to the right tenant without trusting the browser.
 * Seats travel as the line item quantity, clamped on the server, because the
 * quantity is what the customer is charged for.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  stripe,
  isStripeConfigured,
  priceForPlan,
  seatsForPlan,
} from '@/lib/billing/stripe';
import { TEAM_MAX_SEATS, TEAM_MIN_SEATS } from '@/lib/billing/plans';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const bodySchema = z.object({
  plan: z.enum(['pro', 'team']),
  seats: z.number().int().min(1).max(TEAM_MAX_SEATS).optional(),
});

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return Response.json({ error: 'Billing is not configured yet.' }, { status: 503 });
  }

  const session = await getSessionContext();
  if (!session) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  // Only an owner or admin can put the company on a paid plan.
  if (!['owner', 'admin'].includes(session.role)) {
    return Response.json({ error: 'Only an owner or admin can change the plan.' }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const price = priceForPlan(parsed.data.plan);
  if (!price) return Response.json({ error: 'That plan is not available.' }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id, stripe_subscription_id, plan')
    .eq('id', session.orgId)
    .maybeSingle();

  // An org that already has a live subscription belongs in the billing portal,
  // where Stripe can prorate the change. Sending it back through Checkout would
  // open a second subscription against the same customer and bill them twice.
  if (org?.stripe_subscription_id) {
    return Response.json(
      {
        error: 'already_subscribed',
        message: 'You already have a subscription. Use Manage billing to change your plan.',
      },
      { status: 409 },
    );
  }

  const seats = seatsForPlan(parsed.data.plan, parsed.data.seats);
  const origin = req.headers.get('origin') ?? 'https://trusscoach.com';

  try {
    const checkout = await stripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price,
          quantity: seats,
          // Let a buyer change their mind about crew size inside Checkout
          // rather than backing out to pick a different number.
          ...(parsed.data.plan === 'team'
            ? {
                adjustable_quantity: {
                  enabled: true,
                  minimum: TEAM_MIN_SEATS,
                  maximum: TEAM_MAX_SEATS,
                },
              }
            : {}),
        },
      ],
      client_reference_id: session.orgId,
      // Reusing the customer keeps one billing history per org. Falling back to
      // the email only when there is no customer yet avoids Stripe creating a
      // duplicate customer record for a returning org.
      ...(org?.stripe_customer_id
        ? { customer: org.stripe_customer_id }
        : { customer_email: session.email ?? undefined }),
      success_url: `${origin}/settings?upgraded=1`,
      cancel_url: `${origin}/pricing`,
      subscription_data: { metadata: { org_id: session.orgId } },
      // Also on the session: a subscription event that arrives without a
      // checkout session still has to find its tenant.
      metadata: { org_id: session.orgId },
      allow_promotion_codes: true,
    });

    return Response.json({ url: checkout.url });
  } catch (err) {
    console.error('stripe checkout failed', {
      orgId: session.orgId,
      plan: parsed.data.plan,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return Response.json({ error: 'Could not start checkout. Please try again.' }, { status: 502 });
  }
}
