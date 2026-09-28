import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { STAGE_COLOR } from '@/lib/truss/ui';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import type { StageId } from '@/lib/truss/methodology';
import { NewAccountButton } from '@/components/accounts/NewAccountButton';
import {
  ACCOUNT_STATUS_LABELS,
  CLAIM_STATUS_LABELS,
  formatDollars,
  hasInsuranceStory,
  type AccountStatus,
  type ClaimStatus,
} from '@/lib/truss/accounts';

export const metadata: Metadata = { title: 'Accounts' };

interface AccountRow {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  status: string;
  truss_stage: StageId;
  carrier: string | null;
  claim_status: string;
  deductible_cents: number | null;
  updated_at: string;
}

export default async function AccountsPage() {
  const [t, tStage, locale] = await Promise.all([
    getTranslations('accounts'),
    getTranslations('stages'),
    getLocale(),
  ]);
  const lang = locale === 'es' ? 'es' : 'en';
  const session = await getSessionContext();

  let accounts: AccountRow[] = [];
  if (session) {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from('accounts')
      .select('id, name, address, city, state, status, truss_stage, carrier, claim_status, deductible_cents, updated_at')
      .order('updated_at', { ascending: false })
      .limit(100);
    accounts = (data ?? []) as AccountRow[];
  }

  return (
    <div className="app-page">
      <header className="app-page-head">
        <div>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        <NewAccountButton />
      </header>

      {accounts.length === 0 ? (
        <p className="card text-center text-ink-500">{t('empty')}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {accounts.map((account) => (
            <li key={account.id}>
              <Link
                href={`/accounts/${account.id}`}
                className="card block transition-colors hover:border-line-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{account.name}</h2>
                    <p className="truncate text-sm text-ink-500">
                      {[account.address, account.city, account.state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: STAGE_COLOR[account.truss_stage] }}
                  >
                    {tStage(account.truss_stage)}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
                  <Detail
                    label={t('status')}
                    value={ACCOUNT_STATUS_LABELS[lang][account.status as AccountStatus] ?? account.status}
                  />
                  {/* Insurance columns only for claim work; other trades never see them. */}
                  {hasInsuranceStory(account) && (
                    <>
                      <Detail
                        label={t('claimStatus')}
                        value={CLAIM_STATUS_LABELS[lang][account.claim_status as ClaimStatus] ?? account.claim_status}
                      />
                      <Detail label={t('carrier')} value={account.carrier ?? '—'} />
                      <Detail label={t('deductible')} value={formatDollars(account.deductible_cents)} />
                    </>
                  )}
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="truncate font-semibold text-ink-800">{value}</dd>
    </div>
  );
}
