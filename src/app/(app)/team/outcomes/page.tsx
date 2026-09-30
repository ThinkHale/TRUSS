import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getSessionContext, isAdminRole } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { OutcomeImport } from '@/components/team/OutcomeImport';
import { IntegrationManager, type Endpoint } from '@/components/team/IntegrationManager';

export const metadata: Metadata = { title: 'Outcomes' };

/**
 * Where deal outcomes come in from, so the team dashboard can set practice
 * against results: a CSV export from any CRM, or a live connection that posts
 * each job as it changes.
 */
export default async function OutcomesPage() {
  const session = await getSessionContext();
  if (!session) return null;
  const canManage = isAdminRole(session.role);
  const supabase = await supabaseServer();

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? `${proto}://${host}`}/api/integrations/outcomes`;

  const [{ data: endpoints, error }, { data: events }, { count: withValue }, { count: decided }] = await Promise.all([
    supabase
      .from('integration_endpoints')
      .select('id, name, provider, token_prefix, created_at, last_used_at, revoked_at')
      .eq('org_id', session.orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('outcome_events')
      .select('id, channel, external_source, external_id, result, message, received_at')
      .eq('org_id', session.orgId)
      .order('received_at', { ascending: false })
      .limit(50),
    supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', session.orgId)
      .not('contract_value_cents', 'is', null),
    supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', session.orgId)
      .or('signed_at.not.is.null,lost_at.not.is.null'),
  ]);

  if (error) return <p className="card team-note">Outcome tracking needs migrations 0017 and 0022. {error.message}</p>;

  return (
    <div>
      <p className="team-note mb-4">
        {decided ?? 0} accounts have a won or lost date and {withValue ?? 0} have a contract value. Those are what the
        dashboard compares against practice. Reps can set them on any account; a CRM connection keeps them current
        without anyone typing.
      </p>

      <section className="card">
        <h2 className="mb-1 text-lg font-bold">Connect your CRM</h2>
        <p className="team-note mb-4">
          JobNimbus, AccuLynx, ServiceTitan, Leap, HubSpot, and Salesforce can all send a job when it changes —
          directly or through Zapier or Make. Point it here and TRUSS keeps each job&apos;s status, value, and dates in
          step. {!canManage && 'Owners and admins create connections.'}
        </p>
        <IntegrationManager endpoints={(endpoints ?? []) as Endpoint[]} canManage={canManage} webhookUrl={webhookUrl} />
      </section>

      <section className="card mt-4">
        <h2 className="mb-1 text-lg font-bold">Import a spreadsheet</h2>
        <p className="team-note mb-4">Export jobs or deals from your CRM as CSV. Rows are matched to reps by email.</p>
        <OutcomeImport />
      </section>

      <h2 className="team-section-title">Recent deliveries</h2>
      {(events ?? []).length === 0 ? (
        <p className="card team-empty">Nothing received yet.</p>
      ) : (
        <div className="team-table-wrap">
          <table className="team-table">
            <thead><tr><th>When</th><th>How</th><th>Source</th><th>Job</th><th>Result</th></tr></thead>
            <tbody>
              {(events ?? []).map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.received_at).toLocaleString()}</td>
                  <td>{e.channel}</td>
                  <td>{e.external_source}</td>
                  <td><code>{e.external_id}</code></td>
                  <td>
                    <span className={e.result === 'rejected' ? 'team-pill team-pill-bad' : e.result === 'created' ? 'team-pill team-pill-good' : 'team-pill'}>
                      {e.result}
                    </span>
                    {e.message && <div className="team-note">{e.message}</div>}
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
