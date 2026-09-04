import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { STAGE_COLOR } from '@/lib/truss/ui';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import type { StageId } from '@/lib/truss/methodology';
import { NewAccountButton } from '@/components/accounts/NewAccountButton';

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
  const t = await getTranslations('accounts');
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-steel-400">{t('subtitle')}</p>
        </div>
        <NewAccountButton />
      </div>

      {accounts.length === 0 ? (
        <p className="mt-10 text-center text-steel-400">{t('empty')}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {accounts.map((account) => (
            <li key={account.id}>
              <Link
                href={`/accounts/${account.id}`}
                className="card block transition-colors hover:border-steel-600"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold">{account.name}</h2>
                    <p className="truncate text-sm text-steel-400">
                      {[account.address, account.city, account.state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold text-steel-950"
                    style={{ backgroundColor: STAGE_COLOR[account.truss_stage] }}
                  >
                    {account.truss_stage}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
                  <Detail label={t('carrier')} value={account.carrier ?? '—'} />
                  <Detail
                    label={t('deductible')}
                    value={
                      account.deductible_cents != null
                        ? `$${(account.deductible_cents / 100).toLocaleString()}`
                        : '—'
                    }
                  />
                  <Detail label={t('claimStatus')} value={account.claim_status} />
                  <Detail label={t('stage')} value={account.status} />
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
      <dt className="text-xs uppercase tracking-wider text-steel-500">{label}</dt>
      <dd className="truncate font-semibold text-steel-200">{value}</dd>
    </div>
  );
}
