import type { Metadata } from 'next';
import Link from 'next/link';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { PROGRAM, currentWeek } from '@/lib/truss/curriculum';
import { CohortCreate } from '@/components/team/CohortCreate';

export const metadata: Metadata = { title: 'Program' };

/**
 * The TRUSS Eight-Week Training Program, run as cohorts. Each week a rep
 * submits pre-work and field evidence, practices the week's beams, and their
 * manager checks the week. At the end, certification against the program's
 * own criteria (migration 0020).
 */
export default async function ProgramPage() {
  const session = await getSessionContext();
  if (!session) return null;
  const supabase = await supabaseServer();

  const [{ data: cohorts, error }, { data: people }, { data: branches }, { count: certified }] = await Promise.all([
    supabase
      .from('cohorts')
      .select('id, name, starts_on, archived_at, branches(name), cohort_members(count)')
      .eq('org_id', session.orgId)
      .order('starts_on', { ascending: false }),
    supabase.rpc('org_member_directory', { p_org: session.orgId }),
    supabase.from('branches').select('id, name').eq('org_id', session.orgId).order('name'),
    supabase
      .from('certifications')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', session.orgId)
      .is('revoked_at', null),
  ]);

  if (error) return <p className="card team-note">The program needs migration 0020. {error.message}</p>;

  const active = (cohorts ?? []).filter((c) => !c.archived_at);
  const archived = (cohorts ?? []).filter((c) => c.archived_at);

  return (
    <div>
      <p className="team-note mb-4">
        Eight weeks: pre-work, a live session you run, two short practice sessions, and a field target each week,
        with your check at the end of it. {certified ?? 0} {certified === 1 ? 'person holds' : 'people hold'} the
        TRUSS credential here.
      </p>

      {active.length > 0 && (
        <div className="team-table-wrap mb-6">
          <table className="team-table">
            <thead><tr><th>Cohort</th><th>Started</th><th>Week</th><th className="num">People</th></tr></thead>
            <tbody>
              {active.map((c) => {
                const week = currentWeek(c.starts_on);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/team/program/${c.id}`}>{c.name}</Link>
                      {(c.branches as unknown as { name: string } | null)?.name && (
                        <span className="team-pill ml-1">{(c.branches as unknown as { name: string }).name}</span>
                      )}
                    </td>
                    <td>{new Date(`${c.starts_on}T12:00:00Z`).toLocaleDateString()}</td>
                    <td>{week === 0 ? 'Not started' : `Week ${week} — ${PROGRAM[week - 1].title.en}`}</td>
                    <td className="num">{(c.cohort_members as unknown as { count: number }[])[0]?.count ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className="card">
        <h2 className="mb-4 text-lg font-bold">Start a cohort</h2>
        <CohortCreate
          people={(people ?? []) as { user_id: string; full_name: string | null; email: string; role: string; branch_id: string | null }[]}
          branches={branches ?? []}
        />
      </section>

      {archived.length > 0 && (
        <>
          <h2 className="team-section-title">Archived</h2>
          <ul className="space-y-1 text-sm">
            {archived.map((c) => (
              <li key={c.id}><Link href={`/team/program/${c.id}`} className="font-semibold underline">{c.name}</Link></li>
            ))}
          </ul>
        </>
      )}

      <h2 className="team-section-title">The eight weeks</h2>
      <ol className="grid gap-2 sm:grid-cols-2">
        {PROGRAM.map((w) => (
          <li key={w.week} className="card !p-4">
            <b>Week {w.week}: {w.title.en}</b>
            <p className="team-note mt-1">{w.focus.en}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
