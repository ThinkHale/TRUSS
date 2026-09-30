import type { Metadata } from 'next';
import Link from 'next/link';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { STAGES, getStage } from '@/lib/truss/methodology';
import { MIN_DECIDED_FOR_COMPARISON, PASSING_WEIGHTED_SCORE } from '@/lib/truss/rubric';
import {
  PERIODS,
  formatPct,
  formatUsd,
  num,
  parsePeriod,
  periodStart,
  teamTotals,
  type RepSummaryRow,
} from '@/lib/truss/team';
import { BeamCell, Stat } from '@/components/team/BeamCell';

export const metadata: Metadata = { title: 'Team' };

/**
 * The team dashboard: stage-by-stage scores for every rep, who is practicing,
 * how fast new people get to passing, and whether practice shows up in deals.
 *
 * One call to team_rep_summary() (migration 0023), which runs as the manager
 * with RLS applied, then pure rollups from src/lib/truss/team.ts.
 */
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; branch?: string }>;
}) {
  const session = await getSessionContext();
  if (!session) return null;
  const { days: rawDays, branch } = await searchParams;
  const days = parsePeriod(rawDays);
  const since = periodStart(days);

  const supabase = await supabaseServer();
  const [{ data, error }, { data: branches }] = await Promise.all([
    supabase.rpc('team_rep_summary', {
      p_org: session.orgId,
      p_since: since,
      p_branch: branch && /^[0-9a-f-]{36}$/.test(branch) ? branch : null,
    }),
    supabase.from('branches').select('id, name').eq('org_id', session.orgId).order('name'),
  ]);

  if (error) {
    return (
      <p className="card team-note">
        The team dashboard needs migrations 0017–0023 applied to this database. {error.message}
      </p>
    );
  }

  const rows = (data ?? []) as RepSummaryRow[];
  const t = teamTotals(rows);
  const comparable =
    t.practiced.decided >= MIN_DECIDED_FOR_COMPARISON && t.unpracticed.decided >= MIN_DECIDED_FOR_COMPARISON;

  const query = (next: { days?: number; branch?: string | null }) => {
    const params = new URLSearchParams();
    params.set('days', String(next.days ?? days));
    const b = next.branch === undefined ? branch : next.branch;
    if (b) params.set('branch', b);
    return `/team?${params}`;
  };

  return (
    <div>
      <div className="team-filters">
        {PERIODS.map((p) => (
          <Link key={p.days} href={query({ days: p.days })} aria-current={p.days === days ? 'true' : undefined}>
            {p.label}
          </Link>
        ))}
        {(branches ?? []).length > 0 && (
          <>
            <span className="mx-1 text-ink-400" aria-hidden>·</span>
            <Link href={query({ branch: null })} aria-current={!branch ? 'true' : undefined}>
              All branches
            </Link>
            {(branches ?? []).map((b) => (
              <Link key={b.id} href={query({ branch: b.id })} aria-current={branch === b.id ? 'true' : undefined}>
                {b.name}
              </Link>
            ))}
          </>
        )}
      </div>

      <dl className="team-stats">
        <Stat label="Reps practicing" value={`${t.activeReps} / ${t.reps}`} note={`${t.simulations} scored simulations`} />
        <Stat label="Practice time" value={`${t.practiceMinutes.toLocaleString()} min`} note={`last ${days} days`} />
        <Stat
          label="Avg rubric score"
          value={t.avgWeighted == null ? '—' : Math.round(t.avgWeighted)}
          note={`passing is ${PASSING_WEIGHTED_SCORE} / 100`}
        />
        <Stat
          label="Critical findings"
          value={t.criticalFindings}
          note={t.criticalRate == null ? 'no simulations yet' : `${formatPct(t.criticalRate)} of simulations`}
          bad={t.criticalFindings > 0}
        />
        <Stat
          label="Median ramp"
          value={t.medianRampDays == null ? '—' : `${Math.round(t.medianRampDays)} days`}
          note={`join to first passing · ${t.repsPassing} of ${t.reps} there`}
        />
        <Stat
          label="Deals won"
          value={t.dealsWon}
          note={`${formatUsd(t.wonValueCents)} · win rate ${formatPct(t.winRate)}`}
        />
      </dl>

      <h2 className="team-section-title">Where the team is weakest</h2>
      <div className="card">
        <div className="grid grid-cols-5 gap-2 text-center">
          {STAGES.map((stage) => (
            <div key={stage.id}>
              <div className="text-xs font-bold uppercase tracking-wider text-ink-500">{stage.name}</div>
              <div className="mt-1.5">
                <BeamCell value={t.beamAverages[stage.id]} />
              </div>
            </div>
          ))}
        </div>
        <p className="team-note mt-4">
          {t.weakest
            ? <>Coach <b>{getStage(t.weakest).name}</b> first. When an early beam breaks, the later ones fail with it, so the earliest weak beam is the one to fix.</>
            : 'No scored simulations in this period yet. Scores appear here as reps practice.'}
        </p>
      </div>

      <h2 className="team-section-title">Does practice show up in deals?</h2>
      <div className="card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-sm font-bold">Reps with an hour or more of practice</div>
            <div className="mt-1 text-3xl font-black">{formatPct(t.practiced.winRate)}</div>
            <div className="team-note">
              win rate · {t.practiced.reps} reps · {t.practiced.won} won of {t.practiced.decided} decided
            </div>
          </div>
          <div>
            <div className="text-sm font-bold">Reps with less</div>
            <div className="mt-1 text-3xl font-black">{formatPct(t.unpracticed.winRate)}</div>
            <div className="team-note">
              win rate · {t.unpracticed.reps} reps · {t.unpracticed.won} won of {t.unpracticed.decided} decided
            </div>
          </div>
        </div>
        <p className="team-note mt-4">
          {comparable
            ? 'This compares groups; it does not prove practice caused the difference. Stronger reps may simply practice more.'
            : `Not enough decided deals to compare yet — this needs ${MIN_DECIDED_FOR_COMPARISON} on each side. `}
          {!comparable && (
            <>Deals count once they have a won or lost date: set them on accounts, or <Link href="/team/outcomes" className="font-semibold underline">connect your CRM</Link>.</>
          )}
        </p>
      </div>

      <h2 className="team-section-title">Everyone</h2>
      {rows.length === 0 ? (
        <p className="card team-empty">Nobody in this view yet.</p>
      ) : (
        <div className="team-table-wrap">
          <table className="team-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="num">Sims</th>
                <th className="num">Minutes</th>
                {STAGES.map((s) => (
                  <th key={s.id} className="num" title={s.name}>{s.letter}</th>
                ))}
                <th className="num">Latest</th>
                <th className="num">Critical</th>
                <th className="num">Ramp</th>
                <th className="num">Won</th>
                <th className="num">Lost</th>
                <th className="num">Value</th>
                <th>Last practiced</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id}>
                  <td>
                    <Link href={`/team/reps/${r.user_id}`}>{r.full_name || 'Unnamed'}</Link>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {r.role !== 'rep' && <span className="team-pill">{r.role}</span>}
                      {r.branch_name && <span className="team-pill">{r.branch_name}</span>}
                      {r.certified && <span className="team-pill team-pill-gold">Certified</span>}
                    </div>
                  </td>
                  <td className="num">{r.simulations}</td>
                  <td className="num">{Math.round(r.practice_seconds / 60)}</td>
                  {STAGES.map((s) => (
                    <td key={s.id} className="num">
                      <BeamCell value={num(r[`avg_${s.id}` as keyof RepSummaryRow] as number | string | null)} />
                    </td>
                  ))}
                  <td className="num">{r.latest_weighted ?? '—'}</td>
                  <td className="num">
                    {r.critical_count > 0 ? <span className="team-pill team-pill-bad">{r.critical_count}</span> : 0}
                  </td>
                  <td className="num">{r.ramp_days == null ? '—' : `${r.ramp_days}d`}</td>
                  <td className="num">{r.deals_won}</td>
                  <td className="num">{r.deals_lost}</td>
                  <td className="num">{formatUsd(num(r.won_value_cents) ?? 0)}</td>
                  <td>{r.last_practiced_at ? new Date(r.last_practiced_at).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="team-note mt-3">
        T R U S S columns are average beam scores out of 4 for the period. Latest is the most recent
        simulation on the 100-point weighted rubric. Ramp is days from joining to the first passing
        simulation ({PASSING_WEIGHTED_SCORE}+ with no critical finding). Coach conversations are private to
        each rep and never appear here.
      </p>
    </div>
  );
}
