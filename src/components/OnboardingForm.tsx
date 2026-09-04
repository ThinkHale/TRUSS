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
      const result = await createOrganization({
        name: companyName.trim(),
        trades,
        serviceArea: serviceArea
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });

      if (!result.ok) {
        setError(result.message);
        setBusy(false);
        return;
      }

      router.push('/coach');
      router.refresh();
    } catch {
      // Network or transport failure. A server-side problem comes back as a
      // result above, so anything landing here is not worth surfacing verbatim.
      setError('Could not reach TRUSS. Check your connection and try again.');
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
                  ? 'border-gold-500 bg-gold-500/15 text-gold-600'
                  : 'border-line-strong text-ink-600',
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
        <p className="mt-1.5 text-xs text-ink-400">Separate places with commas.</p>
      </div>

      {error && <p role="alert" className="text-sm text-nogo">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={busy || !companyName.trim()}>
        {busy ? tc('loading') : tc('getStarted')}
      </button>
    </form>
  );
}
