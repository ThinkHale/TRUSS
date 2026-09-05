'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminCreateOrganization } from '@/app/actions/admin';
import { PLANS, PLAN_IDS, type PlanId } from '@/lib/billing/plans';

/**
 * Creates a tenant outright, with no signup and no owner yet.
 *
 * This is the Enterprise path: the company exists and is configured before
 * anyone from it has an account, so their first rep signs in to a TRUSS that
 * already knows their trades, their market, and their rules. Add their people
 * on the company page afterwards.
 */
export function NewOrgForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<PlanId>('enterprise');
  const [seats, setSeats] = useState('');
  const [trades, setTrades] = useState('');
  const [area, setArea] = useState('');
  const [rules, setRules] = useState('');
  const [locale, setLocale] = useState<'en' | 'es'>('en');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const lines = (value: string) =>
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

  return (
    <div className="admin-card">
      <label className="admin-field">
        Company name
        <input
          type="text"
          value={name}
          maxLength={200}
          onChange={(e) => setName(e.target.value)}
          placeholder="Apex Roofing"
        />
      </label>

      <div className="admin-row">
        <label>
          Plan
          <select value={plan} onChange={(e) => setPlan(e.target.value as PlanId)}>
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

        <label>
          Default language
          <select value={locale} onChange={(e) => setLocale(e.target.value as 'en' | 'es')}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
      </div>

      <label className="admin-field">
        Trades <small>one per line</small>
        <textarea rows={3} value={trades} onChange={(e) => setTrades(e.target.value)} />
      </label>

      <label className="admin-field">
        Service area <small>one per line</small>
        <textarea rows={3} value={area} onChange={(e) => setArea(e.target.value)} />
      </label>

      <label className="admin-field">
        Playbook rules <small>one per line</small>
        <textarea rows={5} value={rules} onChange={(e) => setRules(e.target.value)} />
      </label>

      <div className="admin-actions">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={pending || !name.trim()}
          onClick={() =>
            start(async () => {
              setError(null);
              const result = await adminCreateOrganization({
                name: name.trim(),
                plan,
                seatLimit: seats.trim() === '' ? null : Number.parseInt(seats, 10),
                trades: lines(trades),
                serviceArea: lines(area),
                playbookRules: lines(rules),
                defaultLocale: locale,
              });

              if (!result.ok) {
                setError(result.message);
                return;
              }
              router.push(`/admin/orgs/${result.id}`);
            })
          }
        >
          {pending ? 'Creating…' : 'Create company'}
        </button>
      </div>

      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
    </div>
  );
}
