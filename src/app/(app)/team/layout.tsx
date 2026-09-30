import { redirect } from 'next/navigation';
import { TeamTabs } from '@/components/team/TeamTabs';
import { getSessionContext, isAdminRole, isManagerRole } from '@/lib/supabase/session';

/**
 * The manager's side of TRUSS: the team's scorecards, the program, the
 * company's scenarios and knowledge, outcomes, and the roster.
 *
 * Reps are sent to the Coach rather than shown a locked door, the same way
 * /admin treats non-operators. This is a convenience, not the gate — every
 * query below runs as the caller, and the policies and functions it reaches
 * refuse reps on their own.
 */
export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();
  if (!session) redirect('/onboarding');
  if (!isManagerRole(session.role)) redirect('/coach');

  return (
    <div className="app-page">
      <header className="app-page-head">
        <div>
          <h1>Team</h1>
          <p>{session.orgName}</p>
        </div>
      </header>
      <TeamTabs isAdmin={isAdminRole(session.role)} />
      {children}
    </div>
  );
}
