import type { Metadata } from 'next';
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
        Every account on the platform. Adding someone to a company is done on that company&apos;s
        page.
      </p>

      <form className="admin-search" action="/admin/users" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by email or name"
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
              <th>Joined</th>
              <th>Last seen</th>
              <th>Operator</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <b>{user.full_name || user.email}</b>
                  <small>{user.email}</small>
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
                <td colSpan={4} className="admin-empty">
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
