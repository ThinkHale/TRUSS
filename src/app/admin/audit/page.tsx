import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Audit' };

/**
 * Every action taken with platform authority.
 *
 * Written by the database inside the same transaction as the change itself, so
 * a row here cannot be missing for a change that happened. This is the record
 * that makes an operator role defensible to an Enterprise customer asking who
 * can touch their tenant.
 */
export default async function AdminAudit() {
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from('admin_audit_log')
    .select('id, actor_email, action, target_org, target_user, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = data ?? [];

  return (
    <div className="admin-page">
      <h1>Audit</h1>
      <p className="admin-sub">The last {rows.length} operator actions.</p>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.created_at).toLocaleString()}</td>
                <td>{row.actor_email ?? 'unknown'}</td>
                <td>
                  <code>{row.action}</code>
                  {row.target_org && (
                    <small>
                      <Link href={`/admin/orgs/${row.target_org}`}>company</Link>
                    </small>
                  )}
                </td>
                <td>
                  <code className="admin-json">{JSON.stringify(row.detail)}</code>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="admin-empty">
                  Nothing yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
