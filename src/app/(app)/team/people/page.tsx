import type { Metadata } from 'next';
import { getSessionContext, isAdminRole } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { PeopleManager, type DirectoryRow, type PendingInvite } from '@/components/team/PeopleManager';

export const metadata: Metadata = { title: 'People' };

/**
 * The roster. Managers see who is who; owners and admins invite, change roles
 * and branches, and remove people. Every change is made by a SQL function that
 * checks authority and writes the audit row (migration 0021).
 */
export default async function PeoplePage() {
  const session = await getSessionContext();
  if (!session) return null;
  const canManage = isAdminRole(session.role);
  const supabase = await supabaseServer();

  const [{ data: people, error }, { data: invites }, { data: branches }, { data: org }] = await Promise.all([
    supabase.rpc('org_member_directory', { p_org: session.orgId }),
    canManage
      ? supabase
          .from('invitations')
          .select('id, email, role, expires_at')
          .eq('org_id', session.orgId)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from('branches').select('id, name').eq('org_id', session.orgId).order('name'),
    supabase.from('organizations').select('seat_limit').eq('id', session.orgId).maybeSingle(),
  ]);

  if (error) return <p className="card team-note">The directory needs migration 0021. {error.message}</p>;

  const count = (people ?? []).length;
  return (
    <div>
      <p className="team-note mb-4">
        {count} {count === 1 ? 'person' : 'people'}
        {org?.seat_limit ? ` of ${org.seat_limit} seats` : ''}
        {(invites ?? []).length ? `, ${(invites ?? []).length} invited` : ''}.
        {!canManage && ' Owners and admins manage the roster.'}
      </p>
      <PeopleManager
        canManage={canManage}
        callerRole={session.role}
        callerId={session.userId}
        people={(people ?? []) as DirectoryRow[]}
        invites={(invites ?? []) as PendingInvite[]}
        branches={branches ?? []}
      />
    </div>
  );
}
