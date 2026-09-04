import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export const metadata: Metadata = { title: 'Enterprise' };

const CAPABILITIES = [
  {
    title: 'Your training becomes the Coach',
    body: 'We load your playbook, your process documents, your pricing rules, your warranty terms, and your policies. TRUSS Coach cites them by name when it answers a rep, so the coaching your people get is the coaching you wrote.',
  },
  {
    title: 'Scenarios from your real market',
    body: 'Your managers author roleplay characters based on the homeowners, adjusters, and property managers your reps actually face — including the objections specific to your carriers and your region.',
  },
  {
    title: 'Managers see what is actually happening',
    body: 'Stage-by-stage scores across the whole team. You find out that your reps are losing deals at Understand, not at price, and you can coach the thing that is actually broken.',
  },
  {
    title: 'Your brand, your deployment',
    body: 'White-labeled for your company, with your data isolated at the database level rather than filtered in application code.',
  },
];

export default async function EnterprisePage() {
  const t = await getTranslations('marketing');

  return (
    <div className="px-5 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-gold-600">
          Enterprise
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          {t('enterpriseTitle')}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-600">{t('enterpriseBody')}</p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
        {CAPABILITIES.map((item) => (
          <div key={item.title} className="card">
            <h2 className="text-lg font-bold">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-md text-center">
        <a href="mailto:enterprise@trusscoach.com" className="btn-primary w-full">
          {t('enterpriseCta')}
        </a>
        <p className="mt-3 text-sm text-ink-400">enterprise@trusscoach.com</p>
      </div>
    </div>
  );
}
