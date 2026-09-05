import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { isPlanPurchasable, isStripeConfigured } from '@/lib/billing/stripe';
import { PLANS, isOverrideActive } from '@/lib/billing/plans';
import { PlanActions } from '@/components/billing/PlanActions';
import { SignOutButton } from '@/components/SignOutButton';
import { LanguageToggle } from '@/components/LanguageToggle';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const t = await getTranslations('common');
  const tNav = await getTranslations('nav');
  const session = await getSessionContext();
  if (!session) return null;

  const { upgraded } = await searchParams;

  const supabase = await supabaseServer();
  const monthStart = new Date();
  monthStart.setDate(1);

  // The org row carries billing state; the counters carry this month's usage;
  // entitlements are read for the plan actually in force rather than the billed
  // one, so an operator grant shows the limits it really unlocked.
  const [{ data: usage }, { data: entitlements }, { data: org }, { count: seatsUsed }] =
    await Promise.all([
      supabase
        .from('usage_counters')
        .select('coach_messages, practice_seconds, research_briefs')
        .eq('org_id', session.orgId)
        .eq('period_month', monthStart.toISOString().slice(0, 10))
        .maybeSingle(),
      supabase.from('plan_entitlements').select('*').eq('plan', session.plan).maybeSingle(),
      supabase
        .from('organizations')
        .select(
          'stripe_subscription_id, subscription_status, current_period_end, cancel_at_period_end, seat_limit',
        )
        .eq('id', session.orgId)
        .maybeSingle(),
      supabase
        .from('memberships')
        .select('user_id', { count: 'exact', head: true })
        .eq('org_id', session.orgId),
    ]);

  const hasSubscription = Boolean(org?.stripe_subscription_id);
  // An expired grant is still stored on the row, so ask whether it is live
  // rather than merely present — otherwise Settings announces access that ran
  // out last month.
  const overrideActive = isOverrideActive({
    plan: session.billedPlan,
    planOverride: session.planOverride,
    overrideExpiresAt: session.overrideExpiresAt,
  });

  return (
    <div className="app-page app-settings-page">
      <header className="app-page-head">
        <div>
          <h1>{tNav('settings')}</h1>
        </div>
      </header>

      {upgraded && (
        <p
          role="status"
          className="card mt-4 border-go/40 bg-go/5 font-semibold text-go"
        >
          You are on the {PLANS[session.plan].name} plan. It can take a moment for the
          new limits to appear below.
        </p>
      )}

      <section className="card mt-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">{t('language')}</h2>
        <div className="mt-3">
          <LanguageToggle />
        </div>
      </section>

      <section className="card mt-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">Company</h2>
        <p className="mt-2 text-lg font-bold">{session.orgName}</p>
        <p className="text-sm capitalize text-ink-500">
          {PLANS[session.plan].name} plan · {session.role}
        </p>
      </section>

      <section className="card mt-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">Plan &amp; billing</h2>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-3">
          <span className="text-2xl font-black">{PLANS[session.plan].name}</span>
          {PLANS[session.plan].cadence && (
            <span className="text-sm text-ink-500">
              {PLANS[session.plan].price} {PLANS[session.plan].cadence}
            </span>
          )}
        </div>

        {/* An operator grant is stated plainly rather than dressed up as a paid
            plan, so nobody is surprised when it expires. */}
        {overrideActive && session.planOverride && (
          <p className="mt-3 rounded-lg border border-gold-500/40 bg-gold-300/10 px-3 py-2 text-sm">
            <b>Access granted by TRUSS.</b> You have {PLANS[session.planOverride].name} access
            {session.overrideExpiresAt
              ? ` until ${formatDate(session.overrideExpiresAt)}`
              : ' with no end date'}
            {session.overrideReason ? ` — ${session.overrideReason}` : ''}.
            {session.billedPlan !== session.planOverride && (
              <> Billing stays on {PLANS[session.billedPlan].name}.</>
            )}
          </p>
        )}

        <dl className="mt-4 space-y-1.5 text-sm">
          <Row label="Seats" value={`${seatsUsed ?? 0}${org?.seat_limit ? ` / ${org.seat_limit}` : ' / unlimited'}`} />
          {hasSubscription && org?.subscription_status && (
            <Row label="Status" value={statusLabel(org.subscription_status)} />
          )}
          {org?.current_period_end && hasSubscription && (
            <Row
              label={org.cancel_at_period_end ? 'Cancels on' : 'Renews on'}
              value={formatDate(org.current_period_end)}
            />
          )}
        </dl>

        {org?.subscription_status === 'past_due' && (
          <p role="alert" className="mt-3 rounded-lg border border-nogo/40 bg-nogo/5 px-3 py-2 text-sm text-nogo">
            Your last payment failed. Update your card in Manage billing to keep your plan.
          </p>
        )}

        {isStripeConfigured() ? (
          <PlanActions
            plan={session.plan}
            role={session.role}
            hasSubscription={hasSubscription}
            proAvailable={isPlanPurchasable('pro')}
            teamAvailable={isPlanPurchasable('team')}
          />
        ) : (
          <p className="mt-3 text-sm text-ink-500">
            Billing is not configured on this deployment.
          </p>
        )}
      </section>

      <section className="card mt-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">This month</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Usage
            label="Coach messages"
            used={usage?.coach_messages ?? 0}
            limit={entitlements?.monthly_coach_messages ?? null}
          />
          <Usage
            label="Practice minutes"
            used={Math.round((usage?.practice_seconds ?? 0) / 60)}
            limit={entitlements?.monthly_practice_minutes ?? null}
          />
          <Usage
            label="Research briefs"
            used={usage?.research_briefs ?? 0}
            limit={entitlements?.monthly_research_briefs ?? null}
          />
        </dl>
      </section>

      {session.isPlatformAdmin && (
        <section className="card mt-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">TRUSS operations</h2>
          <p className="mt-2 text-sm text-ink-500">
            You operate this platform. The console manages every tenant.
          </p>
          <Link href="/admin" className="btn-secondary mt-3 inline-flex">
            Open admin console
          </Link>
        </section>
      )}

      <div className="mt-6">
        <SignOutButton />
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Stripe's status vocabulary, said the way a contractor would say it. */
function statusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'trialing':
      return 'Trial';
    case 'past_due':
      return 'Payment failed';
    case 'canceled':
      return 'Canceled';
    case 'incomplete':
    case 'incomplete_expired':
      return 'Payment not completed';
    case 'unpaid':
      return 'Unpaid';
    default:
      return status;
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-600">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between">
        <dt className="text-ink-600">{label}</dt>
        <dd className="font-semibold">
          {used}
          {limit != null ? ` / ${limit}` : ''}
        </dd>
      </div>
      {limit != null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-200">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              backgroundColor: pct > 90 ? 'var(--color-nogo)' : 'var(--color-gold-500)',
            }}
          />
        </div>
      )}
    </div>
  );
}
