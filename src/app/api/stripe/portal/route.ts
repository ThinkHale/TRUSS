/**
 * Opens the Stripe billing portal for the caller's organization.
 *
 * Every plan change after the first one goes through here rather than through
 * Checkout: Stripe prorates an upgrade, schedules a downgrade, handles a failed
 * card, and lets someone cancel without emailing support. Running a public
 * subscription product without this means every billing question becomes a
 * manual database edit.
 */

import { NextRequest } from 'next/server';
import { stripe, isStripeConfigured } from '@/lib/billing/stripe';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return Response.json({ error: 'Billing is not configured yet.' }, { status: 503 });
  }

  const session = await getSessionContext();
  if (!session) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  if (!['owner', 'admin'].includes(session.role)) {
    return Response.json({ error: 'Only an owner or admin can manage billing.' }, { status: 403 });
  }

  const supabase = await supabaseServer();
  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', session.orgId)
    .maybeSingle();

  // An Enterprise tenant billed offline, or an org on a grant, has no Stripe
  // customer at all. That is not an error worth a stack trace — there is simply
  // nothing to manage.
  if (!org?.stripe_customer_id) {
    return Response.json(
      {
        error: 'no_customer',
        message: 'This company has no Stripe subscription to manage.',
      },
      { status: 409 },
    );
  }

  const origin = req.headers.get('origin') ?? 'https://trusscoach.com';

  try {
    const portal = await stripe().billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${origin}/settings`,
    });

    return Response.json({ url: portal.url });
  } catch (err) {
    console.error('stripe portal failed', {
      orgId: session.orgId,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return Response.json({ error: 'Could not open billing. Please try again.' }, { status: 502 });
  }
}
