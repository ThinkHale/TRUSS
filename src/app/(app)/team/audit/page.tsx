import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionContext, isAdminRole } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Audit log' };

/**
 * Everything done with authority inside this company — by its own people, and
 * by TRUSS operators — in one list (org_audit_feed, migration 0017). This is
 * what a customer's security review asks to see.
 */
export default async function AuditPage() {
  const session = await getSessionContext();
  if (!session) return null;
  if (!isAdminRole(session.role)) redirect('/team');

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('org_audit_feed', { p_org: session.orgId, p_limit: 300 });
  if (error) return <p className="card team-note">The audit log needs migration 0017. {error.message}</p>;

  const rows = (data ?? []) as {
    source: 'company' | 'truss';
    actor_name: string | null;
    action: string;
    target_name: string | null;
    detail: Record<string, unknown>;
    created_at: string;
  }[];

  return (
    <div>
      <p className="team-note mb-4">
        Roster changes, knowledge changes, exports, connections, credentials — and anything TRUSS staff did in this
        account. Rows are written in the same transaction as the change, so there is no change without its entry.
      </p>
      {rows.length === 0 ? (
        <p className="card team-empty">Nothing recorded yet.</p>
      ) : (
        <div className="team-table-wrap">
          <table className="team-table">
            <thead><tr><th>When</th><th>Who</th><th>What</th><th>Affecting</th><th>Detail</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td>
                    {r.actor_name ?? '—'}
                    {r.source === 'truss' && <span className="team-pill team-pill-gold ml-1">TRUSS</span>}
                  </td>
                  <td><code>{r.action}</code></td>
                  <td>{r.target_name ?? ''}</td>
                  <td className="max-w-[24rem] truncate text-xs text-ink-500" title={JSON.stringify(r.detail)}>
                    {Object.entries(r.detail ?? {})
                      .filter(([, v]) => v != null && v !== '')
                      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                      .join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
