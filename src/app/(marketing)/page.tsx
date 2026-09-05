import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { STAGES } from '@/lib/truss/methodology';

const Icon = ({ name }: { name: 'spark' | 'mic' | 'search' | 'phone' | 'globe' | 'shield' }) => {
  const paths = {
    spark: <><path d="M12 2 9.8 8.1 4 10.4l5.8 2.2L12 19l2.2-6.4 5.8-2.2-5.8-2.3L12 2Z"/><path d="m5 17-.8 2.2L2 20l2.2.8L5 23l.8-2.2L8 20l-2.2-.8L5 17Z"/></>,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    phone: <><path d="M7.3 3h3l1.5 5-2.1 1.4a15 15 0 0 0 5 5l1.3-2.1 5 1.5v3c0 2.2-1.8 4-4 4A14 14 0 0 1 3 7c0-2.2 1.8-4 4.3-4Z"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,
    shield: <><path d="M12 2 4.5 5v6.4c0 4.8 3.1 8.8 7.5 10.6 4.4-1.8 7.5-5.8 7.5-10.6V5L12 2Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="site-icon" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};

export default async function LandingPage() {
  const t = await getTranslations();
  return <>
    <section className="site-hero">
      <div className="site-hero-copy"><h1>{t('marketing.heroTitle')}</h1><p>{t('marketing.heroBody')}</p><div className="site-hero-actions"><Link href="/signup" className="site-btn-primary">{t('marketing.heroCta')} <span>↗</span></Link><Link href="#how" className="site-text-link">{t('marketing.heroSecondary')} <span>↓</span></Link></div><div className="site-proof"><span>Built for the field</span><span>English + Spanish</span><span>Mobile first</span></div></div>
      <aside className="site-field-note" aria-labelledby="field-note-title">
        <span className="site-note-eyebrow">TRUSS / Conversation field notes</span>
        <h2 id="field-note-title">A better next question.</h2>
        <p className="site-note-label">Illustrative conversation · Understand</p>
        <blockquote>“We need to think about it.”</blockquote>
        <p>Before offering another solution, find out what still feels unresolved.</p>
        <div className="site-note-response"><span>Try asking</span><p>“What would you need to feel comfortable with the next step?”</p></div>
        <p className="site-note-foot">Bring your situation to Coach. Rehearse it in Practice. Return to the method when you need a refresher.</p>
        <a href="#how" className="site-text-link">Explore the five stages <span aria-hidden>↓</span></a>
      </aside>
    </section>

    <section id="how" className="site-method"><div className="site-section-heading"><span>01 / The method</span><h2>Five stages. A clearer conversation.</h2><p>One shared structure to help your team listen, explain the work, and agree on a clear next step.</p></div><ol className="site-stage-rail">{STAGES.map((stage, i) => <li key={stage.id}><b>{i + 1}</b><div><span>{stage.letter}</span><h3>{stage.name}</h3><p>{stage.oneLiner}</p></div></li>)}</ol></section>

    <section className="site-products">
      <div className="site-section-heading site-section-heading-light"><span>02 / Inside TRUSS</span><h2>Prepare. Practice. Put it to work.</h2><p>Tools built around the five stages of a sales conversation.</p></div>
      <div className="site-feature-grid">
        <article><Icon name="spark"/><h3>{t('marketing.coachTitle')}</h3><p>{t('marketing.coachBody')}</p><p>Describe a situation in chat, choose a stage to focus on, and work through your next conversation.</p><Link href="/coach">Open Coach ↗</Link></article>
        <article><Icon name="mic"/><h3>{t('marketing.practiceTitle')}</h3><p>{t('marketing.practiceBody')}</p><p>Choose a scenario, use voice or typed replies, then review a scorecard across the five stages.</p><Link href="/practice">Explore Practice ↗</Link></article>
        <article><Icon name="search"/><h3>{t('marketing.researchTitle')}</h3><p>{t('marketing.researchBody')}</p><p>Available reports provide area context; they do not confirm damage to a specific property or insurance coverage.</p><Link href="/research">Open Research ↗</Link></article>
        <article><Icon name="shield"/><h3>Your TRUSS field manual</h3><p>Learn Trust, Relate, Understand, Solve, and Secure in plain language. Each step includes practical tips, example questions, and a short exercise.</p><p>Start with the basics or revisit a stage after a difficult conversation.</p><Link href="/method">Read the method ↗</Link></article>
      </div>
    </section>

    <section className="site-enterprise"><div><span>03 / Enterprise</span><h2>{t('marketing.enterpriseTitle')}</h2></div><div><p>{t('marketing.enterpriseBody')}</p><Link href="/enterprise" className="site-btn-light">{t('marketing.enterpriseCta')} <span>↗</span></Link></div></section>
    <section className="site-workforce"><div className="site-section-heading"><span>04 / Made for the trades</span><h2>Built for the people doing the work.</h2></div><div className="site-benefits"><div><Icon name="globe"/><b>English and Spanish</b><p>Choose English or Spanish for navigation, the field manual, and supported practice scenarios.</p></div><div><Icon name="phone"/><b>Made for a phone</b><p>Big type, big buttons, one thumb. Ready between jobs.</p></div><div><Icon name="shield"/><b>Honest by design</b><p>Coaching that protects trust, the customer, and your license.</p></div></div></section>
    <section className="site-final-cta"><div className="site-final-mark" aria-hidden>△</div><h2>Put your best closer<br/>in every truck.</h2><Link href="/signup" className="site-btn-primary">Start free <span>↗</span></Link></section>
  </>;
}
