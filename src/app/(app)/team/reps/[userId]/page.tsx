import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { STAGES } from '@/lib/truss/methodology';
import { CRITICAL_LABELS, type CriticalCode } from '@/lib/truss/scoring';
import { isPassing } from '@/lib/truss/rubric';
import { getScenario } from '@/lib/truss/scenarios';
import { formatUsd } from '@/lib/truss/team';
import { Stat } from '@/components/team/BeamCell';

export const metadata: Metadata = { title: 'Rep' };

/**
 * One rep, as their manager sees them: every scored simulation and field
 * review, with the critical findings, the trend, and their deals.
 *
 * Everything is read with the manager's own client. scorecards_manager_read
 * and field_reviews_manager_read decide what comes back; a rep from another
 * company returns nothing and 404s. Coach conversations are not queried —
 * the policy would return none anyway, and they are the rep's alone.
 */
export default async function RepPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(userId)) notFound();
  const session = await getSessionContext();
  if (!session) return null;

  const supabase = await supabaseServer();
  const [{ data: member }, { data: profile }, { data: cards }, { data: reviews }, { data: accounts }, { data: certs }] =
    await Promise.all([
      supabase
        .from('memberships')
        .select('role, created_at, branches(name)')
        .eq('org_id', session.orgId)
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
      supabase
        .from('scorecards')
        .select(
          'id, session_id, trust, relate, understand, solve, secure, weighted_score, has_critical, critical_findings, headline, created_at, practice_sessions(scenario_id, custom_scenario_id, duration_seconds)',
        )
        .eq('org_id', session.orgId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(60),
      supabase
        .from('field_reviews')
        .select('id, context, weighted_score, has_critical, headline, created_at')
        .eq('org_id', session.orgId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('accounts')
        .select('status, contract_value_cents, signed_at, lost_at')
        .eq('org_id', session.orgId)
        .eq('owner_user_id', userId),
      supabase
        .from('certifications')
        .select('credential_code, issued_at, revoked_at')
        .eq('org_id', session.orgId)
        .eq('user_id', userId)
        .order('issued_at', { ascending: false }),
    ]);

  if (!member) notFound();

  const scorecards = cards ?? [];
  const won = (accounts ?? []).filter((a) => ['signed', 'in-production', 'complete'].includes(a.status));
  const lost = (accounts ?? []).filter((a) => a.status === 'lost');
  const wonValue = won.reduce((s, a) => s + Number(a.contract_value_cents ?? 0), 0);
  const firstPass = [...scorecards].reverse().find((c) => isPassing(c.weighted_score, c.has_critical));
  const liveCert = (certs ?? []).find((c) => !c.revoked_at);

  // Oldest → newest, for the trend strip.
  const trend = [...scorecards].reverse().slice(-20);
  const branch = (member.branches as unknown as { name: string } | null)?.name;

  return (
    <div>
      <p className="mb-3 text-sm">
        <Link href="/team" className="font-semibold text-ink-500 hover:underline">← Team</Link>
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-2xl font-extrabold tracking-tight">{profile?.full_name || 'Unnamed'}</h2>
        <span className="team-pill">{member.role}</span>
        {branch && <span className="team-pill">{branch}</span>}
        {liveCert && <span className="team-pill team-pill-gold">Certified · {liveCert.credential_code}</span>}
      </div>

      <dl className="team-stats">
        <Stat label="Simulations" value={scorecards.length} note={`joined ${new Date(member.created_at).toLocaleDateString()}`} />
        <Stat label="Latest score" value={scorecards[0]?.weighted_score ?? '—'} note="out of 100" />
        <Stat
          label="First passing"
          value={firstPass ? new Date(firstPass.created_at).toLocaleDateString() : 'Not yet'}
          note={
            firstPass
              ? `${Math.max(0, Math.round((new Date(firstPass.created_at).getTime() - new Date(member.created_at).getTime()) / 86_400_000))} days after joining`
              : '75+ with no critical finding'
          }
        />
        <Stat
          label="Critical findings"
          value={scorecards.filter((c) => c.has_critical).length}
          bad={scorecards.some((c) => c.has_critical)}
          note="all time"
        />
        <Stat label="Deals" value={`${won.length} won · ${lost.length} lost`} note={formatUsd(wonValue)} />
      </dl>

      {trend.length > 1 && (
        <>
          <h3 className="team-section-title">Trend (last {trend.length})</h3>
          <div className="card">
            <div className="flex h-24 items-end gap-1" role="img" aria-label="Weighted score for each recent simulation, oldest to newest">
              {trend.map((c) => (
                <div
                  key={c.id}
                  title={`${new Date(c.created_at).toLocaleDateString()}: ${c.weighted_score}`}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${Math.max(4, c.weighted_score ?? 0)}%`,
                    background: c.has_critical
                      ? 'var(--color-nogo)'
                      : (c.weighted_score ?? 0) >= 75
                        ? 'var(--color-go)'
                        : 'var(--color-marginal)',
                  }}
                />
              ))}
            </div>
            <p className="team-note mt-2">Green is passing, amber is below 75, red had a critical finding.</p>
          </div>
        </>
      )}

      <h3 className="team-section-title">Simulations</h3>
      {scorecards.length === 0 ? (
        <p className="card team-empty">No scored practice yet.</p>
      ) : (
        <div className="team-table-wrap">
          <table className="team-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Scenario</th>
                {STAGES.map((s) => (
                  <th key={s.id} className="num" title={s.name}>{s.letter}</th>
                ))}
                <th className="num">Score</th>
                <th>Findings</th>
              </tr>
            </thead>
            <tbody>
              {scorecards.map((c) => {
                const ps = c.practice_sessions as unknown as { scenario_id: string; custom_scenario_id: string | null } | null;
                const scenario = ps ? getScenario(ps.scenario_id) : undefined;
                const findings = (c.critical_findings ?? []) as { code: string }[];
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/team/sessions/${c.session_id}`}>{new Date(c.created_at).toLocaleDateString()}</Link>
                    </td>
                    <td className="max-w-[16rem] truncate">{scenario?.title ?? (ps?.custom_scenario_id ? 'Company scenario' : ps?.scenario_id ?? '—')}</td>
                    {STAGES.map((s) => (
                      <td key={s.id} className="num">{c[s.id]}</td>
                    ))}
                    <td className="num"><b>{c.weighted_score}</b></td>
                    <td>
                      {findings.length
                        ? findings.map((f, i) => (
                            <span key={i} className="team-pill team-pill-bad mr-1">
                              {CRITICAL_LABELS[f.code as CriticalCode] ?? 'Critical'}
                            </span>
                          ))
                        : <span className="team-note">{c.headline}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="team-section-title">Field reviews</h3>
      {(reviews ?? []).length === 0 ? (
        <p className="card team-empty">
          No real conversations reviewed yet. A rep or a manager on a ride-along can record one from{' '}
          <Link href="/field" className="font-semibold underline">Field review</Link>.
        </p>
      ) : (
        <div className="team-table-wrap">
          <table className="team-table">
            <thead>
              <tr><th>Date</th><th>Conversation</th><th className="num">Score</th><th>Headline</th></tr>
            </thead>
            <tbody>
              {(reviews ?? []).map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/field/${r.id}`}>{new Date(r.created_at).toLocaleDateString()}</Link></td>
                  <td className="max-w-[16rem] truncate">{r.context}</td>
                  <td className="num">
                    <b>{r.weighted_score}</b>
                    {r.has_critical && <span className="team-pill team-pill-bad ml-1">critical</span>}
                  </td>
                  <td className="team-note">{r.headline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
