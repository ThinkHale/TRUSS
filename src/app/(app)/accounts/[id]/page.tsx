import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { STAGES, type StageId } from '@/lib/truss/methodology';
import { STAGE_COLOR } from '@/lib/truss/ui';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Account' };

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations('accounts');
  const tc = await getTranslations('common');

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
          {stage}
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
                <span className="mt-1.5 block text-[10px] font-semibold text-ink-500">{s.name}</span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* The fields that decide the deal. */}
      <section className="card mt-4">
        <dl className="grid grid-cols-2 gap-4">
          <Field label={t('carrier')} value={account.carrier ?? '—'} />
          <Field
            label={t('deductible')}
            value={
              account.deductible_cents != null
                ? `$${(account.deductible_cents / 100).toLocaleString()}`
                : '—'
            }
          />
          <Field label={t('claimStatus')} value={account.claim_status} />
          <Field label="Date of loss" value={account.date_of_loss ?? '—'} />
        </dl>
      </section>

      <div className="mt-4">
        <Link href={`/coach?account=${account.id}`} className="btn-primary w-full">
          {t('brief')}
        </Link>
      </div>

      {contacts && contacts.length > 0 && (
        <section className="card mt-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">Contacts</h2>
          <ul className="mt-3 space-y-2">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-center justify-between gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
                <div>
                  <p className="font-semibold">
                    {contact.name}
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
                    Call
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {activities && activities.length > 0 && (
        <section className="card mt-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">
            {t('lastActivity')}
          </h2>
          <ul className="mt-3 space-y-2.5">
            {activities.map((activity) => (
              <li key={activity.id} className="border-b border-line pb-2.5 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold capitalize">{activity.type.replace('-', ' ')}</span>
                  <span className="text-xs text-ink-400">
                    {new Date(activity.occurred_at).toLocaleDateString()}
                  </span>
                </div>
                {activity.notes && <p className="mt-1 text-sm text-ink-600">{activity.notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
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
