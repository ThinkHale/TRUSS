import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { PLANS, effectivePlan, type PlanId } from '@/lib/billing/plans';
import { OrgPlanForm } from '@/components/admin/OrgPlanForm';
import { OrgMembers, type Member } from '@/components/admin/OrgMembers';
import { OrgSettingsForm, type OrgSettings } from '@/components/admin/OrgSettingsForm';

export const metadata: Metadata = { title: 'Company' };

export default async function AdminOrgDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [{ data: org }, { data: members }, { data: settings }, { data: usage }, { data: audit }] =
    await Promise.all([
      supabase
        .from('organizations')
        .select(
          'id, name, slug, plan, plan_override, override_expires_at, override_reason, seat_limit, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end, cancel_at_period_end, billing_email, created_at',
        )
        .eq('id', id)
        .maybeSingle(),
      supabase.rpc('admin_org_members', { p_org: id }),
      supabase
        .from('org_settings')
        .select('trades, service_area, playbook_rules, brand_name, brand_logo_url, brand_color, default_locale')
        .eq('org_id', id)
        .maybeSingle(),
      supabase
        .from('usage_counters')
        .select('coach_messages, practice_seconds, research_briefs')
        .eq('org_id', id)
        .order('period_month', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('admin_audit_log')
        .select('id, actor_email, action, detail, created_at')
        .eq('target_org', id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

  if (!org) notFound();

  const planState = {
    plan: org.plan as PlanId,
    planOverride: org.plan_override as PlanId | null,
    overrideExpiresAt: org.override_expires_at as string | null,
  };
  const inForce = effectivePlan(planState);

  return (
    <div className="admin-page">
      <p className="admin-crumb">
        <Link href="/admin/orgs">← Companies</Link>
      </p>

      <div className="admin-head">
        <div>
          <h1>{org.name}</h1>
          <p className="admin-sub">
            <code>{org.slug}</code> · created {new Date(org.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="admin-head-tags">
          <span className="admin-tag admin-tag-lg">{PLANS[inForce].name}</span>
          {org.plan_override && <span className="admin-tag admin-tag-grant">granted</span>}
        </div>
      </div>

      <section className="admin-card">
        <h2>Billing</h2>
        <dl className="admin-dl admin-dl-wide">
          <div>
            <dt>In force</dt>
            <dd>{PLANS[inForce].name}</dd>
          </div>
          <div>
            <dt>Billed plan</dt>
            <dd>{PLANS[org.plan as PlanId].name}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{org.subscription_status ?? 'no subscription'}</dd>
          </div>
          <div>
            <dt>{org.cancel_at_period_end ? 'Cancels' : 'Renews'}</dt>
            <dd>
              {org.current_period_end
                ? new Date(org.current_period_end).toLocaleDateString()
                : '—'}
            </dd>
          </div>
          <div>
            <dt>Billing email</dt>
            <dd>{org.billing_email ?? '—'}</dd>
          </div>
          <div>
            <dt>Stripe customer</dt>
            <dd>
              {org.stripe_customer_id ? (
                <a
                  href={`https://dashboard.stripe.com/customers/${org.stripe_customer_id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {org.stripe_customer_id}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
      </section>

      <OrgPlanForm
        orgId={org.id}
        plan={org.plan as PlanId}
        seatLimit={org.seat_limit}
        planOverride={org.plan_override as PlanId | null}
        overrideExpiresAt={org.override_expires_at}
        overrideReason={org.override_reason}
        hasSubscription={Boolean(org.stripe_subscription_id)}
      />

      <OrgMembers
        orgId={org.id}
        members={(members ?? []) as Member[]}
        seatLimit={org.seat_limit}
      />

      <OrgSettingsForm orgId={org.id} settings={(settings ?? null) as OrgSettings | null} />

      <section className="admin-card">
        <h2>This month</h2>
        <dl className="admin-dl">
          <div>
            <dt>Coach messages</dt>
            <dd>{usage?.coach_messages ?? 0}</dd>
          </div>
          <div>
            <dt>Practice minutes</dt>
            <dd>{Math.round((usage?.practice_seconds ?? 0) / 60)}</dd>
          </div>
          <div>
            <dt>Research briefs</dt>
            <dd>{usage?.research_briefs ?? 0}</dd>
          </div>
        </dl>
        {/* Coach *conversations* are deliberately absent. The RLS policy gates
            them on user_id = auth.uid(), so an operator cannot read them either,
            which is the promise ENTERPRISE.md makes to reps. Counts only. */}
        <p className="admin-note">
          Usage counts only. Coach conversations are private to the rep who wrote them and are
          not readable here, by design.
        </p>
      </section>

      <section className="admin-card">
        <h2>Operator history</h2>
        <ul className="admin-list">
          {(audit ?? []).map((row) => (
            <li key={row.id}>
              <code>{row.action}</code>
              <small>
                {row.actor_email ?? 'unknown'} · {new Date(row.created_at).toLocaleString()}
              </small>
            </li>
          ))}
          {(audit ?? []).length === 0 && <li className="admin-empty">Nothing yet.</li>}
        </ul>
      </section>
    </div>
  );
}
