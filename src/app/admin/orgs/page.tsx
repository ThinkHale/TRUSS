import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { PLANS, type PlanId } from '@/lib/billing/plans';

export const metadata: Metadata = { title: 'Companies' };

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: PlanId;
  plan_override: PlanId | null;
  override_expires_at: string | null;
  effective: PlanId;
  subscription_status: string | null;
  cancel_at_period_end: boolean;
  seat_limit: number | null;
  members: number;
  coach_messages: number;
  created_at: string;
}

export default async function AdminOrgs({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await supabaseServer();

  const { data } = await supabase.rpc('admin_org_overview', {
    p_query: q ?? '',
    p_limit: 200,
  });
  const rows = (data ?? []) as OrgRow[];

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Companies</h1>
          <p className="admin-sub">{rows.length} shown</p>
        </div>
        <Link href="/admin/orgs/new" className="admin-btn admin-btn-primary">
          New company
        </Link>
      </div>

      {/* A GET form so a search is a linkable URL and the back button works. */}
      <form className="admin-search" action="/admin/orgs" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name or slug"
          aria-label="Search companies"
        />
        <button type="submit" className="admin-btn">
          Search
        </button>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Plan</th>
              <th>Billing</th>
              <th>People</th>
              <th>Coach</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((org) => (
              <tr key={org.id}>
                <td>
                  <Link href={`/admin/orgs/${org.id}`}>
                    <b>{org.name}</b>
                  </Link>
                  <small>{org.slug}</small>
                </td>
                <td>
                  <span className="admin-tag">{PLANS[org.effective].name}</span>
                  {org.plan_override && (
                    <small className="admin-grant">
                      granted
                      {org.override_expires_at
                        ? ` until ${new Date(org.override_expires_at).toLocaleDateString()}`
                        : ''}
                      {org.plan !== org.plan_override && ` · billed ${PLANS[org.plan].name}`}
                    </small>
                  )}
                </td>
                <td>
                  {org.subscription_status ? (
                    <span
                      className={
                        org.subscription_status === 'active'
                          ? 'admin-tag admin-tag-good'
                          : 'admin-tag admin-tag-bad'
                      }
                    >
                      {org.subscription_status}
                    </span>
                  ) : (
                    <small>—</small>
                  )}
                  {org.cancel_at_period_end && <small>cancels at period end</small>}
                </td>
                <td>
                  {org.members}
                  {org.seat_limit ? ` / ${org.seat_limit}` : ''}
                </td>
                <td>{org.coach_messages}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-empty">
                  No companies match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
