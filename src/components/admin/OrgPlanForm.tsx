'use client';

import { useState, useTransition } from 'react';
import { adminSetOrgPlan, adminSetOverride, type ActionResult } from '@/app/actions/admin';
import { PLANS, PLAN_IDS, type PlanId } from '@/lib/billing/plans';

/**
 * The two ways a tenant's plan can move, kept visibly separate because they
 * mean different things.
 *
 * "Billed plan" is what the company is paying for. Stripe writes this column on
 * every webhook, so setting it by hand is for offline Enterprise contracts and
 * for repairing drift — anything you set here can be overwritten the next time
 * Stripe sends an event.
 *
 * "Granted access" is the override. It outranks the billed plan, Stripe never
 * touches it, and it is how someone gets full access without paying.
 */

interface Props {
  orgId: string;
  plan: PlanId;
  seatLimit: number | null;
  planOverride: PlanId | null;
  overrideExpiresAt: string | null;
  overrideReason: string | null;
  hasSubscription: boolean;
}

export function OrgPlanForm(props: Props) {
  return (
    <>
      <BilledPlan {...props} />
      <GrantedAccess {...props} />
    </>
  );
}

function BilledPlan({ orgId, plan, seatLimit, hasSubscription }: Props) {
  const [nextPlan, setNextPlan] = useState<PlanId>(plan);
  const [seats, setSeats] = useState<string>(seatLimit === null ? '' : String(seatLimit));
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="admin-card">
      <h2>Billed plan</h2>
      <p className="admin-sub">
        What this company is on for billing purposes. Use it for an offline Enterprise contract,
        or to correct drift.
        {hasSubscription && (
          <>
            {' '}
            <b>This org has a live Stripe subscription</b> — the next webhook will overwrite
            whatever you set here. Change the subscription in Stripe instead.
          </>
        )}
      </p>

      <div className="admin-row">
        <label>
          Plan
          <select value={nextPlan} onChange={(e) => setNextPlan(e.target.value as PlanId)}>
            {PLAN_IDS.map((id) => (
              <option key={id} value={id}>
                {PLANS[id].name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Seat limit
          <input
            type="number"
            min={1}
            value={seats}
            placeholder="unlimited"
            onChange={(e) => setSeats(e.target.value)}
          />
        </label>

        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setResult(
                await adminSetOrgPlan({
                  orgId,
                  plan: nextPlan,
                  seatLimit: seats.trim() === '' ? null : Number.parseInt(seats, 10),
                }),
              );
            })
          }
        >
          {pending ? 'Saving…' : 'Set plan'}
        </button>
      </div>

      <Result result={result} success="Plan updated." />
    </section>
  );
}

function GrantedAccess({
  orgId,
  plan,
  planOverride,
  overrideExpiresAt,
  overrideReason,
}: Props) {
  const [grant, setGrant] = useState<PlanId | ''>(planOverride ?? '');
  const [expires, setExpires] = useState(
    overrideExpiresAt ? overrideExpiresAt.slice(0, 10) : '',
  );
  const [reason, setReason] = useState(overrideReason ?? '');
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  function save(clear: boolean) {
    start(async () => {
      setResult(
        await adminSetOverride({
          orgId,
          plan: clear ? null : (grant as PlanId) || null,
          // A date input gives a local calendar day; the grant should last
          // through the end of it, not expire at midnight that morning.
          expiresAt:
            clear || !expires ? null : new Date(`${expires}T23:59:59`).toISOString(),
          reason: clear ? null : reason.trim() || null,
        }),
      );
      if (clear) {
        setGrant('');
        setExpires('');
        setReason('');
      }
    });
  }

  const active = planOverride !== null;

  return (
    <section className="admin-card">
      <h2>Granted access</h2>
      <p className="admin-sub">
        Full access regardless of what they pay. This outranks the billed plan while it lasts,
        Stripe never touches it, and every quota check reads it — so one save reaches Coach,
        practice, and research at once.
      </p>

      {active && (
        <p className="admin-note">
          Currently granted <b>{PLANS[planOverride].name}</b>
          {overrideExpiresAt
            ? ` until ${new Date(overrideExpiresAt).toLocaleDateString()}`
            : ' with no end date'}
          . Billed plan stays {PLANS[plan].name}.
        </p>
      )}

      <div className="admin-row">
        <label>
          Grant
          <select value={grant} onChange={(e) => setGrant(e.target.value as PlanId | '')}>
            <option value="">— none —</option>
            {PLAN_IDS.map((id) => (
              <option key={id} value={id}>
                {PLANS[id].name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Until
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            placeholder="no end date"
          />
        </label>

        <label className="admin-grow">
          Reason
          <input
            type="text"
            value={reason}
            maxLength={300}
            placeholder="Pilot, design partner, support gesture…"
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={pending || grant === ''}
          onClick={() => save(false)}
        >
          {pending ? 'Saving…' : 'Grant access'}
        </button>
        {active && (
          <button
            type="button"
            className="admin-btn"
            disabled={pending}
            onClick={() => save(true)}
          >
            Revoke grant
          </button>
        )}
      </div>

      <Result result={result} success="Access updated." />
    </section>
  );
}

export function Result({ result, success }: { result: ActionResult | null; success: string }) {
  if (!result) return null;
  return (
    <p
      role={result.ok ? 'status' : 'alert'}
      className={result.ok ? 'admin-ok' : 'admin-error'}
    >
      {result.ok ? success : result.message}
    </p>
  );
}
