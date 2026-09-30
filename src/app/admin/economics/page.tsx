import type { Metadata } from 'next';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { PLANS } from '@/lib/billing/plans';
import {
  priceFor,
  realtimeCostPerMinute,
  summarizeEconomics,
  type EconomicsRow,
} from '@/lib/billing/economics';

export const metadata: Metadata = { title: 'Economics' };

const usd = (n: number, digits = 0) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits, minimumFractionDigits: digits });

/**
 * Revenue, cost to serve, and gross margin per tenant, per month.
 *
 * Cost is the model provider's reported token usage priced from
 * src/lib/billing/economics.ts, plus Realtime voice minutes at a blended rate.
 * Revenue is booked run-rate: the offline contract where one is recorded,
 * otherwise list price times seats. Both are estimates, and this page says so
 * — it exists to catch a tenant whose usage outruns its price, and to answer
 * "what does a seat cost us" with data instead of a guess.
 */
export default async function EconomicsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: raw } = await searchParams;
  const now = new Date();
  const month = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const [y, m] = month.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('admin_unit_economics', { p_month: `${month}-01` });

  if (error) {
    return (
      <div className="admin-page">
        <h1>Economics</h1>
        <p className="admin-error">This page needs migration 0024. {error.message}</p>
      </div>
    );
  }

  const orgs = summarizeEconomics((data ?? []) as EconomicsRow[]);
  const totals = orgs.reduce(
    (t, o) => ({
      revenue: t.revenue + o.revenueUsd,
      cost: t.cost + o.costUsd,
      tokens: t.tokens + o.tokenCostUsd,
      voice: t.voice + o.voiceCostUsd,
      active: t.active + o.activeUsers,
      members: t.members + o.members,
    }),
    { revenue: 0, cost: 0, tokens: 0, voice: 0, active: 0, members: 0 },
  );
  const margin = totals.revenue > 0 ? ((totals.revenue - totals.cost) / totals.revenue) * 100 : null;
  const unknown = [...new Set(orgs.flatMap((o) => o.unknownModels))];
  const paying = orgs.filter((o) => o.revenueUsd > 0);

  return (
    <div className="admin-page">
      <div className="admin-head">
        <div>
          <h1>Economics</h1>
          <p className="admin-sub">
            <Link href={`/admin/economics?month=${prev}`}>← {prev}</Link> · <b>{month}</b> ·{' '}
            <Link href={`/admin/economics?month=${next}`}>{next} →</Link>
          </p>
        </div>
      </div>

      <div className="admin-stats">
        <div className="admin-stat"><b>{usd(totals.revenue)}</b><span>MRR (run-rate)</span></div>
        <div className="admin-stat"><b>{usd(totals.revenue * 12)}</b><span>ARR (run-rate)</span></div>
        <div className="admin-stat"><b>{usd(totals.cost)}</b><span>Model cost</span></div>
        <div className={margin != null && margin < 70 ? 'admin-stat admin-stat-bad' : 'admin-stat'}>
          <b>{margin == null ? '—' : `${margin.toFixed(1)}%`}</b><span>Gross margin (AI only)</span>
        </div>
        <div className="admin-stat">
          <b>{totals.active ? usd(totals.cost / totals.active, 2) : '—'}</b><span>Cost per active user</span>
        </div>
        <div className="admin-stat"><b>{paying.length}</b><span>Paying tenants</span></div>
      </div>

      {unknown.length > 0 && (
        <p className="admin-warn">
          No price on file for {unknown.join(', ')} — costed at a conservative fallback. Add them to
          src/lib/billing/economics.ts or set TRUSS_PRICE_&lt;MODEL&gt;_IN / _OUT.
        </p>
      )}

      <section className="admin-card">
        <h2>By company</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Company</th><th>Plan</th><th>Revenue / mo</th><th>Tokens</th><th>Voice</th><th>Cost</th>
                <th>Margin</th><th>Active / members</th><th>Cost / active</th><th>Practice min</th><th>Coach msgs</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.orgId}>
                  <td>
                    <Link href={`/admin/orgs/${o.orgId}`}>{o.name}</Link>
                    {o.kind === 'portfolio' && <span className="admin-tag">portfolio</span>}
                  </td>
                  <td>{PLANS[o.effectivePlan]?.name ?? o.effectivePlan}</td>
                  <td>
                    {usd(o.revenueUsd)}
                    {o.revenueBasis === 'contract' && <span className="admin-tag">contract</span>}
                  </td>
                  <td>{usd(o.tokenCostUsd, 2)}</td>
                  <td>{usd(o.voiceCostUsd, 2)}</td>
                  <td>{usd(o.costUsd, 2)}</td>
                  <td className={o.grossMarginPct != null && o.grossMarginPct < 70 ? 'admin-tag-bad' : undefined}>
                    {o.grossMarginPct == null ? (o.costUsd > 0 ? 'no revenue' : '—') : `${o.grossMarginPct.toFixed(0)}%`}
                  </td>
                  <td>{o.activeUsers} / {o.members}</td>
                  <td>{o.costPerActiveUserUsd == null ? '—' : usd(o.costPerActiveUserUsd, 2)}</td>
                  <td>{Math.round(o.practiceMinutes)}</td>
                  <td>{o.coachMessages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>How these numbers are made</h2>
        <ul className="admin-list">
          <li>
            Token cost is what the provider reported per call, recorded since migration 0024, priced per million
            tokens: {['gpt-4.1', 'text-embedding-3-small', 'gpt-4o-transcribe'].map((model) => {
              const { price } = priceFor(model);
              return `${model} ${usd(price.input, 2)} in / ${usd(price.output, 2)} out`;
            }).join('; ')}.
            <b> Verify against the provider&apos;s current price list</b> before sharing these outside the company.
          </li>
          <li>
            Voice practice runs browser-to-provider, so it is costed from metered minutes at{' '}
            {usd(realtimeCostPerMinute(), 2)}/min (TRUSS_COST_REALTIME_PER_MIN).
          </li>
          <li>
            Revenue is run-rate: a recorded contract&apos;s annual value ÷ 12, otherwise list price × seats for an
            active subscription. It is not recognized revenue and ignores discounts and Stripe fees.
          </li>
          <li>
            Excluded: Supabase, Vercel, Google Maps Platform, and Stripe fees — platform costs, not per-seat COGS.
            Usage before 0024 was applied has no token records, so earlier months understate cost.
          </li>
        </ul>
      </section>
    </div>
  );
}
