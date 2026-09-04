import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/SignOutButton';
import { LanguageToggle } from '@/components/LanguageToggle';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const t = await getTranslations('common');
  const session = await getSessionContext();
  if (!session) return null;

  const supabase = await supabaseServer();
  const monthStart = new Date();
  monthStart.setDate(1);

  const { data: usage } = await supabase
    .from('usage_counters')
    .select('coach_messages, practice_seconds, research_briefs')
    .eq('org_id', session.orgId)
    .eq('period_month', monthStart.toISOString().slice(0, 10))
    .maybeSingle();

  const { data: entitlements } = await supabase
    .from('plan_entitlements')
    .select('*')
    .eq('plan', session.plan)
    .maybeSingle();

  return (
    <div className="px-5 py-5">
      <h1 className="text-2xl font-extrabold tracking-tight">{t('language')}</h1>

      <section className="card mt-4">
        <LanguageToggle />
      </section>

      <section className="card mt-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-steel-400">Company</h2>
        <p className="mt-2 text-lg font-bold">{session.orgName}</p>
        <p className="text-sm capitalize text-steel-400">
          {session.plan} plan · {session.role}
        </p>
      </section>

      <section className="card mt-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-steel-400">This month</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Usage
            label="Coach messages"
            used={usage?.coach_messages ?? 0}
            limit={entitlements?.monthly_coach_messages ?? null}
          />
          <Usage
            label="Practice minutes"
            used={Math.round((usage?.practice_seconds ?? 0) / 60)}
            limit={entitlements?.monthly_practice_minutes ?? null}
          />
          <Usage
            label="Research briefs"
            used={usage?.research_briefs ?? 0}
            limit={entitlements?.monthly_research_briefs ?? null}
          />
        </dl>
      </section>

      <div className="mt-6">
        <SignOutButton />
      </div>
    </div>
  );
}

function Usage({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between">
        <dt className="text-steel-300">{label}</dt>
        <dd className="font-semibold">
          {used}
          {limit != null ? ` / ${limit}` : ''}
        </dd>
      </div>
      {limit != null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-steel-800">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              backgroundColor: pct > 90 ? 'var(--color-nogo)' : 'var(--color-signal-500)',
            }}
          />
        </div>
      )}
    </div>
  );
}
