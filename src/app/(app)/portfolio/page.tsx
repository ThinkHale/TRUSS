import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionContext, isManagerRole } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { STAGES, getStage } from '@/lib/truss/methodology';
import { MIN_DECIDED_FOR_COMPARISON, weakestBeam, winRate } from '@/lib/truss/rubric';
import { PERIODS, formatPct, formatUsd, num, parsePeriod, periodStart } from '@/lib/truss/team';
import { BeamCell, Stat } from '@/components/team/BeamCell';

export const metadata: Metadata = { title: 'Portfolio' };

interface CompanyRow {
  org_id: string;
  name: string;
  plan: string;
  reps: number;
  active_reps: number;
  practice_seconds: number | string;
  simulations: number;
  avg_trust: number | string | null;
  avg_relate: number | string | null;
  avg_understand: number | string | null;
  avg_solve: number | string | null;
  avg_secure: number | string | null;
  avg_weighted: number | string | null;
  critical_count: number;
  critical_rate: number | string | null;
  median_ramp_days: number | string | null;
  reps_passing: number;
  certified_reps: number;
  field_reviews: number;
  deals_won: number;
  deals_lost: number;
  won_value_cents: number | string;
  practiced_reps: number;
  practiced_won: number;
  practiced_decided: number;
  unpracticed_reps: number;
  unpracticed_won: number;
  unpracticed_decided: number;
}

/**
 * Every operating company in a portfolio, side by side: adoption, stage
 * strength, compliance, ramp, credentials, and outcomes.
 *
 * One call to portfolio_company_summary() (migration 0023), which checks the
 * caller leads this portfolio and returns aggregates only. Portfolio leaders
 * see numbers, never a company's people, transcripts, or accounts; drill-down
 * is each company's own managers' job.
 */
export default async function PortfolioPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const session = await getSessionContext();
  if (!session) return null;
  if (session.orgKind !== 'portfolio' || !isManagerRole(session.role)) redirect('/coach');

  const days = parsePeriod((await searchParams).days);
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('portfolio_company_summary', {
    p_portfolio: session.orgId,
    p_since: periodStart(days),
    p_practice_minutes: 60,
  });

  if (error) {
    return (
      <div className="app-page">
        <p className="card team-note">The portfolio view needs migrations 0018 and 0023. {error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as CompanyRow[];
  const total = rows.reduce(
    (acc, r) => ({
      reps: acc.reps + r.reps,
      active: acc.active + r.active_reps,
      sims: acc.sims + r.simulations,
      critical: acc.critical + r.critical_count,
      certified: acc.certified + r.certified_reps,
      won: acc.won + r.deals_won,
      lost: acc.lost + r.deals_lost,
      value: acc.value + (num(r.won_value_cents) ?? 0),
      pWon: acc.pWon + r.practiced_won,
      pDecided: acc.pDecided + r.practiced_decided,
      uWon: acc.uWon + r.unpracticed_won,
      uDecided: acc.uDecided + r.unpracticed_decided,
    }),
    { reps: 0, active: 0, sims: 0, critical: 0, certified: 0, won: 0, lost: 0, value: 0, pWon: 0, pDecided: 0, uWon: 0, uDecided: 0 },
  );
  const comparable = total.pDecided >= MIN_DECIDED_FOR_COMPARISON && total.uDecided >= MIN_DECIDED_FOR_COMPARISON;

  return (
    <div className="app-page">
      <header className="app-page-head">
        <div>
          <h1>Portfolio</h1>
          <p>{session.orgName} · {rows.length} {rows.length === 1 ? 'company' : 'companies'}</p>
        </div>
      </header>

      <div className="team-filters">
        {PERIODS.map((p) => (
          <Link key={p.days} href={`/portfolio?days=${p.days}`} aria-current={p.days === days ? 'true' : undefined}>
            {p.label}
          </Link>
        ))}
      </div>

      <dl className="team-stats">
        <Stat label="Reps practicing" value={`${total.active} / ${total.reps}`} note={`${total.sims} simulations`} />
        <Stat label="Critical findings" value={total.critical} bad={total.critical > 0}
          note={total.sims ? `${formatPct(total.critical / total.sims, 1)} of simulations` : undefined} />
        <Stat label="Certified" value={total.certified} note="TRUSS credential holders" />
        <Stat label="Deals won" value={total.won} note={`${formatUsd(total.value)} · win rate ${formatPct(winRate(total.won, total.won + total.lost))}`} />
      </dl>

      <h2 className="team-section-title">Practice and outcomes, across the portfolio</h2>
      <div className="card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-sm font-bold">Reps with an hour or more of practice</div>
            <div className="mt-1 text-3xl font-black">{formatPct(winRate(total.pWon, total.pDecided))}</div>
            <div className="team-note">win rate · {total.pWon} won of {total.pDecided} decided</div>
          </div>
          <div>
            <div className="text-sm font-bold">Reps with less</div>
            <div className="mt-1 text-3xl font-black">{formatPct(winRate(total.uWon, total.uDecided))}</div>
            <div className="team-note">win rate · {total.uWon} won of {total.uDecided} decided</div>
          </div>
        </div>
        <p className="team-note mt-4">
          {comparable
            ? 'A comparison between groups, not proof that practice caused the difference — stronger reps may also practice more. It becomes evidence as it holds across companies and over time.'
            : `Not enough decided deals to compare yet (${MIN_DECIDED_FOR_COMPARISON} needed on each side). Companies record outcomes on their Outcomes page or by connecting their CRM.`}
        </p>
      </div>

      <h2 className="team-section-title">Companies</h2>
      {rows.length === 0 ? (
        <p className="card team-empty">
          No companies are in this portfolio yet. TRUSS operations adds them when the agreement covers them.
        </p>
      ) : (
        <div className="team-table-wrap">
          <table className="team-table">
            <thead>
              <tr>
                <th>Company</th>
                <th className="num">Active reps</th>
                <th className="num">Practice min</th>
                {STAGES.map((s) => <th key={s.id} className="num" title={s.name}>{s.letter}</th>)}
                <th>Coach first</th>
                <th className="num">Avg score</th>
                <th className="num">Critical</th>
                <th className="num">Median ramp</th>
                <th className="num">Certified</th>
                <th className="num">Won</th>
                <th className="num">Win rate</th>
                <th className="num">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const averages = {
                  trust: num(r.avg_trust),
                  relate: num(r.avg_relate),
                  understand: num(r.avg_understand),
                  solve: num(r.avg_solve),
                  secure: num(r.avg_secure),
                };
                const weakest = weakestBeam(averages);
                return (
                  <tr key={r.org_id}>
                    <td><b>{r.name}</b><div className="team-note">{r.plan}</div></td>
                    <td className="num">{r.active_reps} / {r.reps}</td>
                    <td className="num">{Math.round((num(r.practice_seconds) ?? 0) / 60).toLocaleString()}</td>
                    {STAGES.map((s) => <td key={s.id} className="num"><BeamCell value={averages[s.id]} /></td>)}
                    <td>{weakest ? getStage(weakest).name : '—'}</td>
                    <td className="num">{num(r.avg_weighted) == null ? '—' : Math.round(num(r.avg_weighted)!)}</td>
                    <td className="num">
                      {r.critical_count > 0 ? <span className="team-pill team-pill-bad">{r.critical_count}</span> : 0}
                    </td>
                    <td className="num">{num(r.median_ramp_days) == null ? '—' : `${Math.round(num(r.median_ramp_days)!)}d`}</td>
                    <td className="num">{r.certified_reps}</td>
                    <td className="num">{r.deals_won}</td>
                    <td className="num">{formatPct(winRate(r.deals_won, r.deals_won + r.deals_lost))}</td>
                    <td className="num">{formatUsd(num(r.won_value_cents) ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="team-note mt-3">
        Aggregates only. Portfolio leaders see each company&apos;s numbers, not its people&apos;s transcripts, scorecards,
        or accounts — those stay with the company&apos;s own managers, and Coach conversations stay with each rep. The
        portfolio&apos;s own playbook rules, knowledge, and published scenarios reach every company here as the house
        standard.
      </p>
    </div>
  );
}
