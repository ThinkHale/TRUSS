'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createOrganization } from '@/app/actions/onboarding';
import { cx } from '@/lib/truss/ui';

const TRADES = [
  'Roofing',
  'Siding',
  'Gutters',
  'Windows',
  'Restoration',
  'Solar',
  'General contracting',
];

export function OnboardingForm() {
  const tc = useTranslations('common');
  const router = useRouter();

  const [companyName, setCompanyName] = useState('');
  const [trades, setTrades] = useState<string[]>(['Roofing']);
  const [serviceArea, setServiceArea] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(trade: string) {
    setTrades((prev) => (prev.includes(trade) ? prev.filter((x) => x !== trade) : [...prev, trade]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || busy) return;

    setBusy(true);
    setError(null);
    try {
      await createOrganization({
        name: companyName.trim(),
        trades,
        serviceArea: serviceArea
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      router.push('/coach');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish setup.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <div>
        <label className="label" htmlFor="org-name">Company name</label>
        <input
          id="org-name"
          className="field"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          autoFocus
          autoComplete="organization"
        />
      </div>

      <fieldset>
        <legend className="label">What do you do?</legend>
        <div className="flex flex-wrap gap-2">
          {TRADES.map((trade) => (
            <button
              key={trade}
              type="button"
              onClick={() => toggle(trade)}
              aria-pressed={trades.includes(trade)}
              className={cx(
                'min-h-touch rounded-xl border px-4 text-sm font-semibold transition-colors',
                trades.includes(trade)
                  ? 'border-signal-500 bg-signal-500/15 text-signal-400'
                  : 'border-steel-700 text-steel-300',
              )}
            >
              {trade}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="org-area">Where do you work?</label>
        <input
          id="org-area"
          className="field"
          value={serviceArea}
          onChange={(e) => setServiceArea(e.target.value)}
          placeholder="Dallas TX, Fort Worth TX"
        />
        <p className="mt-1.5 text-xs text-steel-500">Separate places with commas.</p>
      </div>

      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={busy || !companyName.trim()}>
        {busy ? tc('loading') : tc('getStarted')}
      </button>
    </form>
  );
}
