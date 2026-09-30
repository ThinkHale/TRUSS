import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import {
  PRACTICE_SESSIONS_PER_WEEK,
  PROGRAM,
  PROGRAM_WEEKS,
  currentWeek,
  weekWindow,
  type CertificationStatus,
} from '@/lib/truss/curriculum';
import { AddToCohort, CohortMemberPanel, type WeekProgress } from '@/components/team/CohortMemberPanel';
import { ArchiveCohortButton } from '@/components/team/ArchiveCohortButton';

export const metadata: Metadata = { title: 'Cohort' };

/**
 * One cohort: a grid of everyone against the eight weeks, and each person's
 * submissions, checks, and certification status underneath.
 */
export default async function CohortPage({ params }: { params: Promise<{ cohortId: string }> }) {
  const { cohortId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(cohortId)) notFound();
  const session = await getSessionContext();
  if (!session) return null;
  const supabase = await supabaseServer();

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('id, name, starts_on, archived_at')
    .eq('id', cohortId)
    .eq('org_id', session.orgId)
    .maybeSingle();
  if (!cohort) notFound();

  const firstWindow = weekWindow(cohort.starts_on, 1);
  const lastWindow = weekWindow(cohort.starts_on, PROGRAM_WEEKS);

  const [{ data: members }, { data: progress }, { data: directory }] = await Promise.all([
    supabase.from('cohort_members').select('user_id').eq('cohort_id', cohortId),
    supabase.from('module_progress').select('*').eq('cohort_id', cohortId),
    supabase.rpc('org_member_directory', { p_org: session.orgId }),
  ]);

  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: practice } = memberIds.length
    ? await supabase
        .from('scorecards')
        .select('user_id, created_at')
        .eq('org_id', session.orgId)
        .in('user_id', memberIds)
        .gte('created_at', firstWindow.from)
        .lt('created_at', lastWindow.to)
    : { data: [] as { user_id: string; created_at: string }[] };

  // Certification status per person. One call each; cohorts are crews, not
  // hundreds, so this stays a handful of round trips run together.
  const statuses = new Map<string, CertificationStatus>();
  await Promise.all(
    memberIds.map(async (userId) => {
      const { data } = await supabase.rpc('certification_status', { p_cohort: cohortId, p_user: userId });
      if (data) statuses.set(userId, data as CertificationStatus);
    }),
  );

  const people = new Map(
    ((directory ?? []) as { user_id: string; full_name: string | null; email: string }[]).map((p) => [p.user_id, p]),
  );
  const nameOf = (id: string) => people.get(id)?.full_name || people.get(id)?.email || 'Unnamed';

  const practiceCount = (userId: string): number[] =>
    PROGRAM.map((w) => {
      const { from, to } = weekWindow(cohort.starts_on, w.week);
      return (practice ?? []).filter((p) => p.user_id === userId && p.created_at >= from && p.created_at < to).length;
    });

  const week = currentWeek(cohort.starts_on);
  const sortedMembers = [...memberIds].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  const candidates = [...people.values()]
    .filter((p) => !memberIds.includes(p.user_id))
    .map((p) => ({ user_id: p.user_id, label: p.full_name || p.email }));

  const cell = (userId: string, n: number) => {
    const w = (progress ?? []).find((p) => p.user_id === userId && p.week === n) as WeekProgress | undefined;
    if (w?.manager_checked_at) return { mark: '✓', label: 'checked', color: 'var(--color-go)' };
    if (w?.prework_submitted_at && w?.field_submitted_at) return { mark: '●', label: 'ready to check', color: 'var(--color-gold-600)' };
    if (w?.prework_submitted_at || w?.field_submitted_at) return { mark: '◐', label: 'half submitted', color: 'var(--color-marginal)' };
    return { mark: '·', label: 'not started', color: 'var(--color-ink-400)' };
  };

  return (
    <div>
      <p className="mb-3 text-sm">
        <Link href="/team/program" className="font-semibold text-ink-500 hover:underline">← Program</Link>
      </p>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">{cohort.name}</h2>
          <p className="team-note">
            Started {new Date(`${cohort.starts_on}T12:00:00Z`).toLocaleDateString()} ·{' '}
            {week === 0 ? 'not started yet' : `week ${week}: ${PROGRAM[week - 1].title.en}`} · {memberIds.length} people
            {cohort.archived_at && ' · archived'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AddToCohort cohortId={cohortId} candidates={candidates} />
          <ArchiveCohortButton cohortId={cohortId} archived={Boolean(cohort.archived_at)} />
        </div>
      </div>

      {memberIds.length === 0 ? (
        <p className="card team-empty">Nobody in this cohort yet.</p>
      ) : (
        <>
          <div className="team-table-wrap">
            <table className="team-table progress-grid">
              <thead>
                <tr>
                  <th>Name</th>
                  {PROGRAM.map((w) => <th key={w.week} className="num" title={w.title.en}>W{w.week}</th>)}
                  <th>Certification</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((userId) => {
                  const status = statuses.get(userId);
                  const counts = practiceCount(userId);
                  return (
                    <tr key={userId}>
                      <td><a href={`#m-${userId}`}>{nameOf(userId)}</a></td>
                      {PROGRAM.map((w) => {
                        const c = cell(userId, w.week);
                        const practiced = counts[w.week - 1];
                        return (
                          <td key={w.week} className="cell" title={`Week ${w.week}: ${c.label}, ${practiced} practice`}>
                            <span style={{ color: c.color, fontWeight: 900 }}>{c.mark}</span>
                            <span className="sr-only">{c.label}</span>
                            <div className={practiced >= PRACTICE_SESSIONS_PER_WEEK ? 'text-[10px] font-bold text-go' : 'text-[10px] text-ink-400'}>
                              {practiced}/{PRACTICE_SESSIONS_PER_WEEK}
                            </div>
                          </td>
                        );
                      })}
                      <td>
                        {status?.certified ? (
                          <span className="team-pill team-pill-gold">{status.credential_code}</span>
                        ) : status?.eligible ? (
                          <span className="team-pill team-pill-good">Ready to certify</span>
                        ) : (
                          <span className="team-note">{status ? `${status.modules_completed}/8 weeks` : '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="team-note mt-2">
            ✓ checked · ● ready for your check · ◐ half submitted. The small number is scored practice that week,
            against the program&apos;s {PRACTICE_SESSIONS_PER_WEEK}.
          </p>

          <h3 className="team-section-title">People</h3>
          <div className="space-y-4">
            {sortedMembers.map((userId) => (
              <section key={userId} id={`m-${userId}`} className="card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-lg font-bold">{nameOf(userId)}</h4>
                  <Link href={`/team/reps/${userId}`} className="text-sm font-semibold underline">Scorecards</Link>
                </div>
                <CohortMemberPanel
                  cohortId={cohortId}
                  userId={userId}
                  name={nameOf(userId)}
                  isSelf={userId === session.userId}
                  weeks={((progress ?? []) as (WeekProgress & { user_id: string })[]).filter((p) => p.user_id === userId)}
                  practiceByWeek={practiceCount(userId)}
                  status={statuses.get(userId) ?? null}
                />
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
