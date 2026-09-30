import type { Metadata } from 'next';
import Link from 'next/link';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { CRITICAL_CODES, CRITICAL_LABELS, type CriticalCode } from '@/lib/truss/scoring';
import { PERIODS, parsePeriod, periodStart } from '@/lib/truss/team';
import { Stat } from '@/components/team/BeamCell';

export const metadata: Metadata = { title: 'Compliance' };

interface Finding {
  code: string;
  description: string;
  evidence: string;
}

/**
 * Every critical finding in the period, from practice and from real
 * conversations: deductible waiving, promised claim outcomes, unverified
 * claims, payment-only framing. The things that end licenses and start
 * lawsuits, counted instead of buried in scorecard prose.
 *
 * Built only from practice scorecards and field reviews — never from Coach
 * conversations, which stay private to the rep. A rep who asks the Coach
 * "can I cover the deductible" is doing exactly what the Coach is for.
 */
export default async function CompliancePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const session = await getSessionContext();
  if (!session) return null;
  const days = parsePeriod((await searchParams).days);
  const since = periodStart(days);

  const supabase = await supabaseServer();
  const [{ data: cards, error }, { data: reviews }, { count: totalCards }, { count: totalReviews }] = await Promise.all([
    supabase
      .from('scorecards')
      .select('id, session_id, user_id, critical_findings, created_at')
      .eq('org_id', session.orgId)
      .eq('has_critical', true)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(300),
    supabase
      .from('field_reviews')
      .select('id, user_id, critical_findings, context, created_at')
      .eq('org_id', session.orgId)
      .eq('has_critical', true)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(300),
    supabase.from('scorecards').select('id', { count: 'exact', head: true }).eq('org_id', session.orgId).gte('created_at', since),
    supabase.from('field_reviews').select('id', { count: 'exact', head: true }).eq('org_id', session.orgId).gte('created_at', since),
  ]);

  if (error) {
    return <p className="card team-note">Compliance reporting needs migration 0017. {error.message}</p>;
  }

  const userIds = [...new Set([...(cards ?? []), ...(reviews ?? [])].map((r) => r.user_id))];
  const { data: people } = userIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const nameOf = new Map((people ?? []).map((p) => [p.id, p.full_name || 'Unnamed']));

  const rows = [
    ...(cards ?? []).map((c) => ({
      key: `s-${c.id}`,
      kind: 'Practice' as const,
      href: `/team/sessions/${c.session_id}`,
      userId: c.user_id,
      at: c.created_at,
      findings: (c.critical_findings ?? []) as Finding[],
    })),
    ...(reviews ?? []).map((r) => ({
      key: `f-${r.id}`,
      kind: 'Field' as const,
      href: `/field/${r.id}`,
      userId: r.user_id,
      at: r.created_at,
      findings: (r.critical_findings ?? []) as Finding[],
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const byCode = new Map<CriticalCode, number>();
  for (const row of rows) {
    for (const f of row.findings) {
      const code = (CRITICAL_CODES as readonly string[]).includes(f.code) ? (f.code as CriticalCode) : 'other';
      byCode.set(code, (byCode.get(code) ?? 0) + 1);
    }
  }
  const byRep = new Map<string, number>();
  for (const row of rows) byRep.set(row.userId, (byRep.get(row.userId) ?? 0) + 1);

  const field = rows.filter((r) => r.kind === 'Field').length;

  return (
    <div>
      <div className="team-filters">
        {PERIODS.map((p) => (
          <Link key={p.days} href={`/team/compliance?days=${p.days}`} aria-current={p.days === days ? 'true' : undefined}>
            {p.label}
          </Link>
        ))}
      </div>

      <dl className="team-stats">
        <Stat
          label="Practice sessions flagged"
          value={rows.length - field}
          note={`of ${totalCards ?? 0} scored`}
          bad={rows.length - field > 0}
        />
        <Stat
          label="Real conversations flagged"
          value={field}
          note={`of ${totalReviews ?? 0} field reviews`}
          bad={field > 0}
        />
        <Stat label="Reps involved" value={byRep.size} />
      </dl>

      <h2 className="team-section-title">By type</h2>
      <div className="card">
        {byCode.size === 0 ? (
          <p className="team-note">No critical findings in this period.</p>
        ) : (
          <ul className="space-y-2">
            {[...byCode.entries()].sort((a, b) => b[1] - a[1]).map(([code, n]) => (
              <li key={code} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold">{CRITICAL_LABELS[code]}</span>
                <span className="team-pill team-pill-bad">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="team-section-title">Every finding</h2>
      {rows.length === 0 ? (
        <p className="card team-empty">Nothing to review.</p>
      ) : (
        <div className="team-table-wrap">
          <table className="team-table">
            <thead>
              <tr><th>Date</th><th>Rep</th><th>Where</th><th>Finding</th><th>What they said</th></tr>
            </thead>
            <tbody>
              {rows.flatMap((row) =>
                row.findings.map((f, i) => (
                  <tr key={`${row.key}-${i}`}>
                    <td><Link href={row.href}>{new Date(row.at).toLocaleDateString()}</Link></td>
                    <td><Link href={`/team/reps/${row.userId}`}>{nameOf.get(row.userId) ?? 'Unnamed'}</Link></td>
                    <td><span className={row.kind === 'Field' ? 'team-pill team-pill-bad' : 'team-pill'}>{row.kind}</span></td>
                    <td>
                      <b>{CRITICAL_LABELS[f.code as CriticalCode] ?? CRITICAL_LABELS.other}</b>
                      <div className="team-note">{f.description}</div>
                    </td>
                    <td className="max-w-[22rem] italic text-ink-600">“{f.evidence}”</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="team-note mt-3">
        Built from practice scorecards and field reviews only. Coach conversations are private to each rep and are
        never read for this report — reps need to be able to ask the Coach the hard questions.
      </p>
    </div>
  );
}
