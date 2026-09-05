'use client';

import { useState } from 'react';
import { TEAM_MAX_SEATS, TEAM_MIN_SEATS, type PlanId } from '@/lib/billing/plans';

/**
 * The upgrade and manage-billing controls.
 *
 * Both endpoints answer with a Stripe URL rather than redirecting, so the
 * button can show its own error in place instead of navigating a rep to a
 * Stripe page that explains nothing. Everything authorizing this lives on the
 * server; hiding a button here is presentation, not protection.
 */

interface Props {
  /** The plan in force, override included. */
  plan: PlanId;
  role: 'owner' | 'admin' | 'manager' | 'rep';
  hasSubscription: boolean;
  proAvailable: boolean;
  teamAvailable: boolean;
}

export function PlanActions({ plan, role, hasSubscription, proAvailable, teamAvailable }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seats, setSeats] = useState(TEAM_MIN_SEATS);

  const canBill = role === 'owner' || role === 'admin';

  async function go(path: string, body?: Record<string, unknown>, key = path) {
    if (busy) return;
    setBusy(key);
    setError(null);

    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok || !payload.url) {
        throw new Error(payload.message ?? payload.error ?? 'Something went wrong.');
      }
      // A full navigation, not the router: this leaves the app for Stripe.
      window.location.href = payload.url as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(null);
    }
  }

  if (!canBill) {
    return (
      <p className="mt-3 text-sm text-ink-500">
        Only an owner or admin can change the plan.
      </p>
    );
  }

  // Enterprise tenants are billed offline, so there is nothing to self-serve.
  if (plan === 'enterprise' && !hasSubscription) {
    return (
      <p className="mt-3 text-sm text-ink-500">
        This company is on an Enterprise agreement. Talk to us to change it.
      </p>
    );
  }

  return (
    <div className="mt-4">
      {hasSubscription ? (
        <button
          type="button"
          onClick={() => void go('/api/stripe/portal')}
          disabled={busy !== null}
          className="btn-ghost"
        >
          {busy ? 'Opening…' : 'Manage billing'}
        </button>
      ) : (
        <div className="space-y-3">
          {proAvailable && plan !== 'pro' && (
            <button
              type="button"
              onClick={() => void go('/api/stripe/checkout', { plan: 'pro' }, 'pro')}
              disabled={busy !== null}
              className="btn-primary w-full sm:w-auto"
            >
              {busy === 'pro' ? 'Starting…' : 'Upgrade to Pro — $49/mo'}
            </button>
          )}

          {teamAvailable && (
            <div className="rounded-xl border border-line-strong p-4">
              <label htmlFor="seats" className="label mb-1">
                Team seats
              </label>
              <p className="mb-3 text-sm text-ink-500">
                $39 per seat, per month. Minimum {TEAM_MIN_SEATS}.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="seats"
                  type="number"
                  min={TEAM_MIN_SEATS}
                  max={TEAM_MAX_SEATS}
                  value={seats}
                  onChange={(e) => {
                    const next = Number.parseInt(e.target.value, 10);
                    setSeats(Number.isNaN(next) ? TEAM_MIN_SEATS : next);
                  }}
                  onBlur={() =>
                    setSeats((s) => Math.min(TEAM_MAX_SEATS, Math.max(TEAM_MIN_SEATS, s)))
                  }
                  className="field w-24"
                />
                <button
                  type="button"
                  onClick={() => void go('/api/stripe/checkout', { plan: 'team', seats }, 'team')}
                  disabled={busy !== null}
                  className="btn-primary"
                >
                  {busy === 'team'
                    ? 'Starting…'
                    : `Upgrade to Team — $${39 * Math.max(TEAM_MIN_SEATS, seats)}/mo`}
                </button>
              </div>
            </div>
          )}

          {!proAvailable && !teamAvailable && (
            <p className="text-sm text-ink-500">
              Billing is not configured on this deployment yet.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-nogo">
          {error}
        </p>
      )}
    </div>
  );
}
