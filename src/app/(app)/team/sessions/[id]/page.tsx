import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { getScenario } from '@/lib/truss/scenarios';
import { Scorecard, type ScorecardData } from '@/components/practice/Scorecard';

export const metadata: Metadata = { title: 'Practice session' };

/**
 * A manager reading one practice session: the scorecard the rep saw, and the
 * transcript it was scored from. practice_sessions_manager_read,
 * practice_turns_manager_read, and scorecards_manager_read (migration 0002)
 * are what allow it; nothing here widens them.
 */
export default async function SessionReview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const session = await getSessionContext();
  if (!session) return null;

  const supabase = await supabaseServer();
  const [{ data: practice }, { data: card }, { data: turns }] = await Promise.all([
    supabase
      .from('practice_sessions')
      .select('id, user_id, scenario_id, custom_scenario_id, started_at, duration_seconds, mode, language')
      .eq('id', id)
      .eq('org_id', session.orgId)
      .maybeSingle(),
    supabase.from('scorecards').select('*').eq('session_id', id).eq('org_id', session.orgId).maybeSingle(),
    supabase
      .from('practice_turns')
      .select('role, text')
      .eq('session_id', id)
      .order('created_at', { ascending: true }),
  ]);
  if (!practice) notFound();

  const [{ data: profile }, custom] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', practice.user_id).maybeSingle(),
    practice.custom_scenario_id
      ? supabase.from('custom_scenarios').select('title').eq('id', practice.custom_scenario_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const title = getScenario(practice.scenario_id)?.title ?? custom.data?.title ?? 'Practice session';

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-3 text-sm">
        <Link href={`/team/reps/${practice.user_id}`} className="font-semibold text-ink-500 hover:underline">
          ← {profile?.full_name || 'Rep'}
        </Link>
      </p>
      <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      <p className="team-note mb-5">
        {new Date(practice.started_at).toLocaleString()} · {practice.mode} ·{' '}
        {practice.duration_seconds ? `${Math.round(practice.duration_seconds / 60)} min` : 'not finished'}
      </p>
      {card ? (
        <Scorecard data={card as unknown as ScorecardData} transcript={(turns ?? []) as { role: 'rep' | 'character'; text: string }[]} />
      ) : (
        <p className="card team-empty">This session was not scored — it ended before there was enough to grade.</p>
      )}
    </div>
  );
}
