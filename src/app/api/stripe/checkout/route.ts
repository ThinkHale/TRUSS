/**
 * Starts a Stripe Checkout session for a subscription upgrade.
 *
 * The org id travels in client_reference_id so the webhook can attach the
 * resulting subscription to the right tenant without trusting the browser.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { stripe, isStripeConfigured, priceForPlan } from '@/lib/billing/stripe';
import { getSessionContext } from '@/lib/supabase/session';

export const runtime = 'nodejs';

const bodySchema = z.object({ plan: z.enum(['pro', 'team']) });

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

  const origin = req.headers.get('origin') ?? 'https://trusscoach.com';

  const checkout = await stripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    client_reference_id: session.orgId,
    customer_email: session.email ?? undefined,
    success_url: `${origin}/settings?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    subscription_data: { metadata: { org_id: session.orgId } },
    allow_promotion_codes: true,
  });

  return Response.json({ url: checkout.url });
}
