import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/supabase/session';
import { UserOrgs, type UserOrg } from '@/components/admin/UserOrgs';
import { OperatorToggle } from '@/components/admin/OperatorToggle';

export const metadata: Metadata = { title: 'Person' };

interface Detail {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  locale: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  active_org_id: string | null;
  is_operator: boolean;
}

export default async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const session = await getSessionContext();

  const [{ data: detailRows }, { data: orgRows }, { data: audit }] = await Promise.all([
    supabase.rpc('admin_user_detail', { p_user: id }),
    supabase.rpc('admin_user_orgs', { p_user: id }),
    supabase
      .from('admin_audit_log')
      .select('id, actor_email, action, detail, created_at')
      .eq('target_user', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const user = (detailRows as Detail[] | null)?.[0];
  if (!user) notFound();

  const orgs = (orgRows ?? []) as UserOrg[];

  return (
    <div className="admin-page">
      <p className="admin-crumb">
        <Link href="/admin/users">← People</Link>
      </p>

      <div className="admin-head">
        <div>
          <h1>{user.full_name || user.email}</h1>
          <p className="admin-sub">{user.email}</p>
        </div>
        <div className="admin-head-tags">
          {user.is_operator && <span className="admin-tag admin-tag-grant">operator</span>}
        </div>
      </div>

      <section className="admin-card">
        <h2>Account</h2>
        <dl className="admin-dl admin-dl-wide">
          <div>
            <dt>Signed up</dt>
            <dd>{new Date(user.created_at).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt>Last seen</dt>
            <dd>
              {user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString()
                : 'never'}
            </dd>
          </div>
          <div>
            <dt>Language</dt>
            <dd>{user.locale === 'es' ? 'Español' : 'English'}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{user.phone ?? '—'}</dd>
          </div>
        </dl>

        <h3 className="admin-h3">Operator access</h3>
        <p className="admin-sub">
          Reads across every tenant. The database refuses to remove the last operator.
        </p>
        <div className="admin-actions">
          <OperatorToggle
            userId={user.id}
            email={user.email}
            isOperator={user.is_operator}
            isSelf={user.id === session?.userId}
          />
        </div>
      </section>

      <UserOrgs
        userId={user.id}
        email={user.email}
        isOperator={user.is_operator}
        orgs={orgs}
      />

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
