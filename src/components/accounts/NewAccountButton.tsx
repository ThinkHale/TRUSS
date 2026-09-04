'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createAccount } from '@/app/actions/accounts';

/**
 * Add an account.
 *
 * Deliberately minimal: name and address only. A rep standing on a driveway
 * will not fill a twelve-field form, and everything else can be captured later
 * from the account page or by the Coach after an inspection.
 */
export function NewAccountButton() {
  const t = useTranslations('accounts');
  const tc = useTranslations('common');
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;

    setSaving(true);
    setError(null);
    try {
      await createAccount({ name: name.trim(), address: address.trim() || null });
      setOpen(false);
      setName('');
      setAddress('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-primary shrink-0 px-4" onClick={() => setOpen(true)}>
        {t('create')}
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t('create')}
    >
      <form onSubmit={submit} className="card w-full max-w-md space-y-4">
        <h2 className="text-lg font-bold">{t('create')}</h2>

        <div>
          <label className="label" htmlFor="account-name">Name</label>
          <input
            id="account-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="account-address">Address</label>
          <input
            id="account-address"
            className="field"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="street-address"
          />
        </div>

        {error && <p role="alert" className="text-sm text-nogo">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving || !name.trim()}>
            {saving ? tc('loading') : tc('save')}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
            {tc('cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
