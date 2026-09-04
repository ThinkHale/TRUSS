import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export const metadata: Metadata = { title: 'Pricing' };

/**
 * Plan tiers mirror plan_entitlements in migration 0006. Prices are placeholders
 * until the Stripe products are created; the entitlement shape is what matters.
 */
const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    blurb: 'For the individual rep who wants to get better.',
    features: [
      'TRUSS Coach, 750 messages a month',
      'Voice practice, 5 hours a month',
      'Area research and weather, 60 briefs',
      'Campaign writing in English and Spanish',
      'Accounts and activity tracking',
    ],
    cta: 'Start free',
    href: '/signup',
  },
  {
    id: 'team',
    name: 'Team',
    price: '$39',
    blurb: 'For a crew. Managers see who is practicing and where they are weak.',
    features: [
      'Everything in Pro, with higher limits',
      'Team scorecards and stage-by-stage progress',
      'Shared accounts and research across the crew',
      'Custom roleplay scenarios',
      'Ten seats included',
    ],
    featured: true,
    cta: 'Start free',
    href: '/signup',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    blurb: 'Your playbook, your process, your TRUSS.',
    features: [
      'Unlimited Coach, practice, and research',
      'Your training and policies loaded into the Coach',
      'Scenarios built from your real market',
      'White-labeled for your brand',
      'Onboarding and support',
    ],
    cta: 'Talk to us',
    href: '/enterprise',
  },
];

export default async function PricingPage() {
  const t = await getTranslations('marketing');

  return (
    <div className="px-5 py-16">
      <h1 className="text-center text-4xl font-extrabold tracking-tight">{t('pricingTitle')}</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-steel-300">
        Every plan starts free. No card to try it.
      </p>

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`card flex flex-col ${plan.featured ? 'border-signal-500' : ''}`}
          >
            {plan.featured && (
              <span className="mb-3 w-fit rounded-full bg-signal-500 px-3 py-0.5 text-xs font-bold text-steel-950">
                Most popular
              </span>
            )}
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-4xl font-black">{plan.price}</span>
              {plan.price !== 'Custom' && (
                <span className="text-sm text-steel-400">{t('perMonth')}</span>
              )}
            </div>
            <p className="mt-3 text-sm text-steel-300">{plan.blurb}</p>

            <ul className="mt-5 flex-1 space-y-2 text-sm text-steel-200">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden style={{ color: 'var(--color-go)' }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={plan.href}
              className={`mt-6 ${plan.featured ? 'btn-primary' : 'btn-ghost'} w-full`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
