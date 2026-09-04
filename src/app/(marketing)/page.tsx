import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { STAGES } from '@/lib/truss/methodology';
import { STAGE_COLOR } from '@/lib/truss/ui';

export default async function LandingPage() {
  const t = await getTranslations();

  return (
    <>
      {/* Hero */}
      <section className="border-b border-steel-800 px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-signal-500">
            {t('brand.tagline')}
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
            {t('marketing.heroTitle')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-steel-300">
            {t('marketing.heroBody')}
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary text-base">
              {t('marketing.heroCta')}
            </Link>
            <Link href="#how" className="btn-ghost text-base">
              {t('marketing.heroSecondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* The methodology — the reason the product exists */}
      <section id="how" className="border-b border-steel-800 px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
            Five things close a job
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-steel-300">
            TRUSS is a methodology before it is software. Every part of the platform teaches
            the same five stages, in the same order.
          </p>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STAGES.map((stage) => (
              <li
                key={stage.id}
                className="card border-t-4"
                style={{ borderTopColor: STAGE_COLOR[stage.id] }}
              >
                <div
                  className="text-3xl font-black leading-none"
                  style={{ color: STAGE_COLOR[stage.id] }}
                >
                  {stage.letter}
                </div>
                <h3 className="mt-2 text-lg font-bold">{stage.name}</h3>
                <p className="mt-2 text-sm text-steel-300">{stage.oneLiner}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Feature blocks, Coach first */}
      <section className="border-b border-steel-800 px-5 py-16">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
          <Feature
            badge="TRUSS Coach"
            title={t('marketing.coachTitle')}
            body={t('marketing.coachBody')}
            wide
          />
          <Feature
            badge="Practice"
            title={t('marketing.practiceTitle')}
            body={t('marketing.practiceBody')}
          />
          <Feature
            badge="Research"
            title={t('marketing.researchTitle')}
            body={t('marketing.researchBody')}
          />
        </div>
      </section>

      {/* Enterprise */}
      <section className="border-b border-steel-800 px-5 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-signal-500">
            Enterprise
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t('marketing.enterpriseTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-steel-300">
            {t('marketing.enterpriseBody')}
          </p>
          <Link href="/enterprise" className="btn-primary mt-8 text-base">
            {t('marketing.enterpriseCta')}
          </Link>
        </div>
      </section>

      {/* Built for this workforce */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-extrabold tracking-tight">
            Built for the people doing the work
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Pillar
              title="English and Spanish"
              body="The whole platform, including voice practice, works in both. Reps pick their language once."
            />
            <Pillar
              title="Made for a phone"
              body="Big type, big buttons, one thumb. It works in a truck between jobs, not just at a desk."
            />
            <Pillar
              title="Honest by design"
              body="TRUSS will not coach a rep to eat a deductible or promise an approval. Those lose licenses."
            />
          </div>
        </div>
      </section>
    </>
  );
}

function Feature({
  badge,
  title,
  body,
  wide = false,
}: {
  badge: string;
  title: string;
  body: string;
  wide?: boolean;
}) {
  return (
    <div className={`card ${wide ? 'md:col-span-2' : ''}`}>
      <span className="inline-block rounded-full bg-signal-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-signal-400">
        {badge}
      </span>
      <h3 className="mt-4 text-2xl font-bold tracking-tight">{title}</h3>
      <p className="mt-3 text-steel-300">{body}</p>
    </div>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-steel-300">{body}</p>
    </div>
  );
}
