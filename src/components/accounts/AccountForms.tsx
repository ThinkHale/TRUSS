'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { addContact, logActivity, updateAccount, type AccountResult } from '@/app/actions/accounts';
import { STAGES, type StageId } from '@/lib/truss/methodology';
import {
  ACCOUNT_STATUSES,
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  ACTIVITY_LABELS,
  ACTIVITY_TYPES,
  CLAIM_STATUSES,
  CLAIM_STATUS_LABELS,
  type AccountStatus,
  type AccountType,
  type ActivityType,
  type ClaimStatus,
} from '@/lib/truss/accounts';

/**
 * The three ways a rep keeps an account current: its details, its people, and
 * what happened. Each is folded away until wanted — on a phone the account
 * page is read far more often than it is edited.
 */

function useSubmit() {
  const router = useRouter();
  const tc = useTranslations('common');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<AccountResult>, onDone?: () => void) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onDone?.();
      router.refresh();
    } catch {
      setError(tc('offlineShort'));
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, run };
}

function useLang(): 'en' | 'es' {
  return useLocale() === 'es' ? 'es' : 'en';
}

// ─── Details ──────────────────────────────────────────────────────────────────

export interface EditableAccount {
  id: string;
  type: AccountType;
  status: AccountStatus;
  truss_stage: StageId;
  carrier: string | null;
  claim_status: ClaimStatus;
  deductible_cents: number | null;
  date_of_loss: string | null;
  notes: string | null;
  contract_value_cents?: number | null;
  lost_reason?: string | null;
  lead_source?: string | null;
}

export function AccountDetailsForm({ account }: { account: EditableAccount }) {
  const t = useTranslations('accounts');
  const tc = useTranslations('common');
  const tStage = useTranslations('stages');
  const lang = useLang();
  const { busy, error, run } = useSubmit();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState(account.type);
  const [status, setStatus] = useState(account.status);
  const [stage, setStage] = useState(account.truss_stage);
  const [claimStatus, setClaimStatus] = useState(account.claim_status);
  const [carrier, setCarrier] = useState(account.carrier ?? '');
  const [deductible, setDeductible] = useState(
    account.deductible_cents == null ? '' : String(Math.round(account.deductible_cents / 100)),
  );
  const [dateOfLoss, setDateOfLoss] = useState(account.date_of_loss ?? '');
  const [notes, setNotes] = useState(account.notes ?? '');
  const [contractValue, setContractValue] = useState(
    account.contract_value_cents == null ? '' : String(Math.round(account.contract_value_cents / 100)),
  );
  const [lostReason, setLostReason] = useState(account.lost_reason ?? '');
  const [leadSource, setLeadSource] = useState(account.lead_source ?? '');
  const won = status === 'signed' || status === 'in-production' || status === 'complete';

  // Only claim work needs the insurance fields; everyone else never sees them.
  const [insurance, setInsurance] = useState(
    account.claim_status !== 'none' || Boolean(account.carrier) || account.deductible_cents != null,
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const dollars = deductible.replace(/[^0-9]/g, '');
    void run(
      () =>
        updateAccount({
          id: account.id,
          type,
          status,
          trussStage: stage,
          claimStatus: insurance ? claimStatus : 'none',
          carrier: insurance ? carrier : null,
          deductibleDollars: insurance && dollars ? Number(dollars) : null,
          dateOfLoss: insurance && dateOfLoss ? dateOfLoss : null,
          notes,
          contractValueDollars: contractValue.replace(/[^0-9]/g, '') ? Number(contractValue.replace(/[^0-9]/g, '')) : null,
          lostReason: status === 'lost' ? lostReason : null,
          leadSource,
        }),
      () => setOpen(false),
    );
  }

  return (
    <details className="card mt-4" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer font-bold">{t('edit')}</summary>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Select id="acct-type" label={t('type')} value={type} onChange={(v) => setType(v as AccountType)}
            options={ACCOUNT_TYPES.map((v) => [v, ACCOUNT_TYPE_LABELS[lang][v]])} />
          <Select id="acct-status" label={t('status')} value={status} onChange={(v) => setStatus(v as AccountStatus)}
            options={ACCOUNT_STATUSES.map((v) => [v, ACCOUNT_STATUS_LABELS[lang][v]])} />
          <Select id="acct-stage" label={t('stage')} value={stage} onChange={(v) => setStage(v as StageId)}
            options={STAGES.map((s) => [s.id, tStage(s.id)])} />
        </div>

        <label className="flex min-h-touch items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={insurance} onChange={(e) => setInsurance(e.target.checked)} className="h-5 w-5" />
          {t('insurance')}
        </label>

        {insurance && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select id="acct-claim" label={t('claimStatus')} value={claimStatus}
              onChange={(v) => setClaimStatus(v as ClaimStatus)}
              options={CLAIM_STATUSES.map((v) => [v, CLAIM_STATUS_LABELS[lang][v]])} />
            <Field id="acct-carrier" label={t('carrier')} value={carrier} onChange={setCarrier} />
            <Field id="acct-deductible" label={t('deductible')} value={deductible} onChange={setDeductible}
              inputMode="numeric" placeholder="$" />
            <Field id="acct-dol" label={t('dateOfLoss')} value={dateOfLoss} onChange={setDateOfLoss} type="date" />
          </div>
        )}

        {/* What closed, for how much, and why not — the numbers the team
            dashboard sets practice against. */}
        <div className="grid gap-4 sm:grid-cols-2">
          {(won || status === 'lost' || contractValue) && (
            <Field id="acct-value" label={t('contractValue')} value={contractValue} onChange={setContractValue}
              inputMode="numeric" placeholder="$" />
          )}
          {status === 'lost' && (
            <Field id="acct-lost" label={t('lostReason')} value={lostReason} onChange={setLostReason} />
          )}
          <Field id="acct-source" label={t('leadSource')} value={leadSource} onChange={setLeadSource}
            placeholder={t('leadSourceHint')} />
        </div>

        <div>
          <label className="label" htmlFor="acct-notes">{t('notes')}</label>
          <textarea id="acct-notes" className="field min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p role="alert" className="text-sm text-nogo">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? tc('loading') : tc('save')}
        </button>
      </form>
    </details>
  );
}

// ─── People ───────────────────────────────────────────────────────────────────

export function AddContactForm({ accountId }: { accountId: string }) {
  const t = useTranslations('accounts');
  const tc = useTranslations('common');
  const { busy, error, run } = useSubmit();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [canSign, setCanSign] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    void run(
      () => addContact({ accountId, name, relationship, phone, email, isDecisionMaker: canSign }),
      () => {
        setOpen(false);
        setName('');
        setRelationship('');
        setPhone('');
        setEmail('');
        setCanSign(false);
      },
    );
  }

  return (
    <details className="card mt-4" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer font-bold">{t('addContact')}</summary>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="contact-name" label={t('name')} value={name} onChange={setName} autoComplete="name" />
          <Field id="contact-rel" label={t('relationship')} value={relationship} onChange={setRelationship} />
          <Field id="contact-phone" label={t('phone')} value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
          <Field id="contact-email" label={t('email')} value={email} onChange={setEmail} type="email" autoComplete="email" />
        </div>
        <label className="flex min-h-touch items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={canSign} onChange={(e) => setCanSign(e.target.checked)} className="h-5 w-5" />
          {t('canSign')}
        </label>
        {error && <p role="alert" className="text-sm text-nogo">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy || !name.trim()}>
          {busy ? tc('loading') : tc('save')}
        </button>
      </form>
    </details>
  );
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export function LogActivityForm({ accountId, currentStage }: { accountId: string; currentStage: StageId }) {
  const t = useTranslations('accounts');
  const tc = useTranslations('common');
  const tStage = useTranslations('stages');
  const lang = useLang();
  const { busy, error, run } = useSubmit();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActivityType>('note');
  const [stage, setStage] = useState<StageId>(currentStage);
  const [notes, setNotes] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    void run(
      () => logActivity({ accountId, type, stage, notes }),
      () => {
        setOpen(false);
        setNotes('');
        setType('note');
      },
    );
  }

  return (
    <details className="card mt-4" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer font-bold">{t('logActivity')}</summary>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id="activity-type" label={t('activityType')} value={type} onChange={(v) => setType(v as ActivityType)}
            options={ACTIVITY_TYPES.map((v) => [v, ACTIVITY_LABELS[lang][v]])} />
          <Select id="activity-stage" label={t('activityStage')} value={stage} onChange={(v) => setStage(v as StageId)}
            options={STAGES.map((s) => [s.id, tStage(s.id)])} />
        </div>
        <div>
          <label className="label" htmlFor="activity-notes">{t('whatHappened')}</label>
          <textarea id="activity-notes" className="field min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-nogo">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? tc('loading') : tc('save')}
        </button>
      </form>
    </details>
  );
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  value,
  onChange,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id'>) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (readonly [string, string])[];
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>{text}</option>
        ))}
      </select>
    </div>
  );
}
