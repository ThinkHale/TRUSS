import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { isStripeConfigured } from '@/lib/billing/stripe';
import { hasBootstrapList } from '@/lib/auth/platform';

export const metadata: Metadata = { title: 'Operations' };

interface OrgRow {
  id: string;
  name: string;
  plan: PlanId;
  effective: PlanId;
  plan_override: PlanId | null;
  subscription_status: string | null;
  members: number;
  coach_messages: number;
  created_at: string;
}

export default async function AdminHome() {
  const supabase = await supabaseServer();

  const [{ data: orgs }, { data: audit }] = await Promise.all([
    supabase.rpc('admin_org_overview', { p_query: '', p_limit: 200 }),
    supabase
      .from('admin_audit_log')
      .select('id, actor_email, action, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const rows = (orgs ?? []) as OrgRow[];

  const byPlan = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.effective] = (acc[row.effective] ?? 0) + 1;
    return acc;
  }, {});

  const paying = rows.filter((r) => r.subscription_status === 'active').length;
  const granted = rows.filter((r) => r.plan_override !== null).length;
  const attention = rows.filter(
    (r) => r.subscription_status === 'past_due' || r.subscription_status === 'unpaid',
  );

  return (
    <div className="admin-page">
      <h1>Operations</h1>
      <p className="admin-sub">Every tenant on this deployment.</p>

      {(!isStripeConfigured() || !hasBootstrapList()) && (
        <div className="admin-warn">
          <b>Configuration gaps</b>
          <ul>
            {!isStripeConfigured() && (
              <li>
                Stripe is not fully configured, so nobody can subscribe. Set{' '}
                <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>, and at least
                one price.
              </li>
            )}
            {!hasBootstrapList() && (
              <li>
                <code>PLATFORM_ADMIN_EMAILS</code> is not set. If every row in{' '}
                <code>platform_admins</code> is deleted, there is no way back into this console
                without SQL.
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="admin-stats">
        <Stat label="Companies" value={rows.length} />
        <Stat label="Paying" value={paying} />
        <Stat label="On a grant" value={granted} />
        <Stat label="Needs attention" value={attention.length} tone={attention.length ? 'bad' : undefined} />
      </div>

      <section className="admin-card">
        <h2>By plan</h2>
        <dl className="admin-dl">
          {(Object.keys(PLANS) as PlanId[]).map((plan) => (
            <div key={plan}>
              <dt>{PLANS[plan].name}</dt>
              <dd>{byPlan[plan] ?? 0}</dd>
            </div>
          ))}
        </dl>
      </section>

      {attention.length > 0 && (
        <section className="admin-card">
          <h2>Billing needs attention</h2>
          <ul className="admin-list">
            {attention.map((org) => (
              <li key={org.id}>
                <Link href={`/admin/orgs/${org.id}`}>{org.name}</Link>
                <span className="admin-tag admin-tag-bad">{org.subscription_status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="admin-card">
        <h2>Newest companies</h2>
        <ul className="admin-list">
          {rows.slice(0, 8).map((org) => (
            <li key={org.id}>
              <Link href={`/admin/orgs/${org.id}`}>{org.name}</Link>
              <span className="admin-tag">{PLANS[org.effective].name}</span>
              <small>
                {org.members} {org.members === 1 ? 'person' : 'people'} ·{' '}
                {org.coach_messages} Coach messages this month
              </small>
            </li>
          ))}
          {rows.length === 0 && <li className="admin-empty">No companies yet.</li>}
        </ul>
        <Link href="/admin/orgs" className="admin-link">
          All companies →
        </Link>
      </section>

      <section className="admin-card">
        <h2>Recent operator activity</h2>
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
        <Link href="/admin/audit" className="admin-link">
          Full audit log →
        </Link>
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'bad' }) {
  return (
    <div className={`admin-stat ${tone === 'bad' ? 'admin-stat-bad' : ''}`}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}
