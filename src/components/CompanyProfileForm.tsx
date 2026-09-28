'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { updateCompanyProfile } from '@/app/actions/company';
import { TradePicker } from './TradePicker';

/**
 * What the company does and where. Owners and admins edit it; everyone else
 * sees it, since it explains why the Coach answers the way it does.
 */
export function CompanyProfileForm({
  trades: initialTrades,
  serviceArea: initialArea,
  canEdit,
}: {
  trades: string[];
  serviceArea: string[];
  canEdit: boolean;
}) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const router = useRouter();

  const [trades, setTrades] = useState(initialTrades);
  const [area, setArea] = useState(initialArea.join(', '));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await updateCompanyProfile({
        trades,
        serviceArea: area.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setMessage(result.ok ? { ok: true, text: t('saved') } : { ok: false, text: result.message });
      if (result.ok) router.refresh();
    } catch {
      setMessage({ ok: false, text: tc('offlineShort') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-4">
      <p className="text-sm text-ink-500">{t('tradesHint')}</p>
      <TradePicker value={trades} onChange={setTrades} disabled={!canEdit} />

      <div>
        <label className="label" htmlFor="company-area">{t('serviceArea')}</label>
        <input
          id="company-area"
          className="field"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          disabled={!canEdit}
          placeholder="Dallas TX, Fort Worth TX"
        />
      </div>

      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'text-sm text-go' : 'text-sm text-nogo'}>
          {message.text}
        </p>
      )}

      {canEdit ? (
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? tc('loading') : tc('save')}
        </button>
      ) : (
        <p className="text-xs text-ink-400">{t('ownersOnly')}</p>
      )}
    </form>
  );
}
