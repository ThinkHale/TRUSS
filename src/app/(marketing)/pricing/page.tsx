import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PLANS, PUBLIC_PLAN_ORDER } from '@/lib/billing/plans';
import { getSessionContext } from '@/lib/supabase/session';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Pricing' };

/**
 * Plan tiers read from the shared catalog, which is the same source the
 * Settings billing card and the admin console read. The enforced limits live in
 * plan_entitlements (migration 0006); the copy here is the sales version of it.
 *
 * A signed-out visitor is sent to signup. A signed-in one is sent to Settings,
 * where the actual Checkout controls live — rather than a second set of upgrade
 * buttons here that would need the same role checks and seat picker.
 */
export default async function PricingPage() {
  const t = await getTranslations('marketing');

  // The marketing site has to render on a deployment with no database, so a
  // missing session is a normal state here rather than a redirect.
  const session = isSupabaseConfigured() ? await getSessionContext() : null;

  return (
    <div className="px-5 py-16">
      <h1 className="text-center text-4xl font-extrabold tracking-tight">{t('pricingTitle')}</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-ink-600">
        Every plan starts free. No card to try it.
      </p>

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-3">
        {PUBLIC_PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const current = session?.plan === id;

          const { href, label } = callToAction(id, Boolean(session), current);

          return (
            <div
              key={plan.id}
              className={`card flex flex-col ${plan.featured ? 'border-gold-500' : ''}`}
            >
              {plan.featured && (
                <span className="mb-3 w-fit rounded-full bg-gold-500 px-3 py-0.5 text-xs font-bold text-navy-900">
                  Most popular
                </span>
              )}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-4xl font-black">{plan.price}</span>
                {plan.cadence && <span className="text-sm text-ink-500">{plan.cadence}</span>}
              </div>
              <p className="mt-3 text-sm text-ink-600">{plan.blurb}</p>

              <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-800">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span aria-hidden style={{ color: 'var(--color-go)' }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {current ? (
                <p className="mt-6 w-full rounded-lg border border-line-strong py-3 text-center text-sm font-bold text-ink-500">
                  Your current plan
                </p>
              ) : (
                <Link
                  href={href}
                  className={`mt-6 ${plan.featured ? 'btn-primary' : 'btn-ghost'} w-full`}
                >
                  {label}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function callToAction(
  id: string,
  signedIn: boolean,
  current: boolean,
): { href: string; label: string } {
  if (id === 'enterprise') return { href: '/enterprise', label: 'Talk to us' };
  if (current) return { href: '/settings', label: 'Your current plan' };
  if (signedIn) return { href: '/settings', label: 'Upgrade' };
  return { href: '/signup', label: 'Start free' };
}
