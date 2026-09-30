import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { STAGES, type StageId } from '@/lib/truss/methodology';
import { STAGE_COLOR } from '@/lib/truss/ui';
import {
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_TYPE_LABELS,
  ACTIVITY_LABELS,
  CLAIM_STATUS_LABELS,
  formatDollars,
  hasInsuranceStory,
  type AccountStatus,
  type AccountType,
  type ActivityType,
  type ClaimStatus,
} from '@/lib/truss/accounts';
import { AccountDetailsForm, AddContactForm, LogActivityForm } from '@/components/accounts/AccountForms';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Account' };

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, tc, tStage, locale] = await Promise.all([
    getTranslations('accounts'),
    getTranslations('common'),
    getTranslations('stages'),
    getLocale(),
  ]);
  const lang = locale === 'es' ? 'es' : 'en';

  const session = await getSessionContext();
  if (!session) notFound();

  const supabase = await supabaseServer();

  const [{ data: account }, { data: contacts }, { data: activities }] = await Promise.all([
    supabase.from('accounts').select('*').eq('id', id).maybeSingle(),
    supabase.from('contacts').select('*').eq('account_id', id).order('is_decision_maker', { ascending: false }),
    supabase
      .from('activities')
      .select('id, type, stage, outcome, notes, occurred_at')
      .eq('account_id', id)
      .order('occurred_at', { ascending: false })
      .limit(30),
  ]);

  if (!account) notFound();

  const stage = account.truss_stage as StageId;
  const insurance = hasInsuranceStory(account);

  return (
    <div className="app-page">
      <Link href="/accounts" className="text-sm font-semibold text-ink-500 hover:text-ink-800">
        ← {tc('back')}
      </Link>

      <header className="app-page-head mt-3">
        <div>
          <h1>{account.name}</h1>
          <p>
            {[account.address, account.city, account.state].filter(Boolean).join(', ') || '—'}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-sm font-bold text-white"
          style={{ backgroundColor: STAGE_COLOR[stage] }}
        >
          {tStage(stage)}
        </span>
      </header>

      {/* Where this account sits in the methodology. */}
      <section className="card mt-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">{t('stage')}</h2>
        <ol className="mt-3 flex gap-1.5">
          {STAGES.map((s) => {
            const reached = STAGES.findIndex((x) => x.id === stage) >= STAGES.findIndex((x) => x.id === s.id);
            return (
              <li key={s.id} className="flex-1">
                <div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: reached ? STAGE_COLOR[s.id] : 'var(--color-paper-300)' }}
                />
                <span className="mt-1.5 block text-[10px] font-semibold text-ink-500">{tStage(s.id)}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* The fields that decide the deal. Insurance ones only on claim work. */}
      <section className="card mt-4">
        <dl className="grid grid-cols-2 gap-4">
          <Field label={t('type')} value={ACCOUNT_TYPE_LABELS[lang][account.type as AccountType] ?? account.type} />
          <Field label={t('status')} value={ACCOUNT_STATUS_LABELS[lang][account.status as AccountStatus] ?? account.status} />
          {insurance && (
            <>
              <Field label={t('claimStatus')} value={CLAIM_STATUS_LABELS[lang][account.claim_status as ClaimStatus] ?? account.claim_status} />
              <Field label={t('carrier')} value={account.carrier ?? '—'} />
              <Field label={t('deductible')} value={formatDollars(account.deductible_cents)} />
              <Field label={t('dateOfLoss')} value={account.date_of_loss ?? '—'} />
            </>
          )}
        </dl>
        {account.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-ink-600">{account.notes}</p>}
      </section>

      <div className="mt-4">
        <Link href={`/coach?account=${account.id}`} className="btn-primary w-full">
          {t('brief')}
        </Link>
        <p className="mt-2 text-center text-xs text-ink-500">{t('briefHint')}</p>
      </div>

      <AccountDetailsForm
        account={{
          id: account.id,
          type: account.type,
          status: account.status,
          truss_stage: stage,
          carrier: account.carrier,
          claim_status: account.claim_status,
          deductible_cents: account.deductible_cents,
          date_of_loss: account.date_of_loss,
          notes: account.notes,
          contract_value_cents: account.contract_value_cents ?? null,
          lost_reason: account.lost_reason ?? null,
          lead_source: account.lead_source ?? null,
        }}
      />

      <section className="card mt-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">{t('contacts')}</h2>
        {contacts && contacts.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-semibold">
                    {contact.name}
                    {contact.relationship && <span className="font-normal text-ink-500"> · {contact.relationship}</span>}
                    {contact.is_decision_maker && (
                      <span className="ml-2 rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold text-navy-900">
                        {t('decisionMaker')}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-ink-500">{contact.phone ?? contact.email ?? '—'}</p>
                </div>
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="btn-ghost px-4 text-sm">
                    {t('call')}
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-500">{t('noContacts')}</p>
        )}
      </section>
      <AddContactForm accountId={account.id} />

      <section className="card mt-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">{t('lastActivity')}</h2>
        {activities && activities.length > 0 ? (
          <ul className="mt-3 space-y-2.5">
            {activities.map((activity) => (
              <li key={activity.id} className="border-b border-line pb-2.5 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">
                    {ACTIVITY_LABELS[lang][activity.type as ActivityType] ?? activity.type}
                    {activity.stage && (
                      <span className="font-normal text-ink-500"> · {tStage(activity.stage as StageId)}</span>
                    )}
                  </span>
                  <span className="text-xs text-ink-400">
                    {new Date(activity.occurred_at).toLocaleDateString(locale)}
                  </span>
                </div>
                {activity.notes && <p className="mt-1 text-sm text-ink-600">{activity.notes}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ink-500">{t('noActivity')}</p>
        )}
      </section>
      <LogActivityForm accountId={account.id} currentStage={stage} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink-900">{value}</dd>
    </div>
  );
}
