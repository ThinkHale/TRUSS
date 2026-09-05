import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/supabase/session';
import { OperatorToggle } from '@/components/admin/OperatorToggle';
import { InviteUserForm } from '@/components/admin/InviteUserForm';

export const metadata: Metadata = { title: 'People' };

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_operator: boolean;
  orgs: { id: string; name: string; role: string; active: boolean }[];
}

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await supabaseServer();
  const session = await getSessionContext();

  const { data } = await supabase.rpc('admin_find_users', {
    p_query: q ?? '',
    p_limit: 100,
  });
  const users = (data ?? []) as UserRow[];

  return (
    <div className="admin-page">
      <h1>People</h1>
      <p className="admin-sub">
        Every account, and the company each one is with. Search matches an email, a name, or a
        company — so a company name finds everybody at it.
      </p>

      <form className="admin-search" action="/admin/users" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by email, name, or company"
          aria-label="Search people"
        />
        <button type="submit" className="admin-btn">
          Search
        </button>
      </form>

      <InviteUserForm />

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Company</th>
              <th>Joined</th>
              <th>Last seen</th>
              <th>Operator</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <Link href={`/admin/users/${user.id}`}>
                    <b>{user.full_name || user.email}</b>
                  </Link>
                  <small>{user.email}</small>
                </td>
                <td>
                  {user.orgs.length === 0 ? (
                    <small>no company</small>
                  ) : (
                    user.orgs.map((org) => (
                      <div key={org.id}>
                        <Link href={`/admin/orgs/${org.id}`}>{org.name}</Link>
                        <small>
                          {org.role}
                          {org.active && user.orgs.length > 1 ? ' · active' : ''}
                        </small>
                      </div>
                    ))
                  )}
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                    : 'never'}
                </td>
                <td>
                  <OperatorToggle
                    userId={user.id}
                    email={user.email}
                    isOperator={user.is_operator}
                    isSelf={user.id === session?.userId}
                  />
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-empty">
                  Nobody matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
