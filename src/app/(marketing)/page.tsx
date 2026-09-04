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
      <div className="site-hero-scene" aria-label="TRUSS Coach mobile experience"><div className="site-roof-lines" aria-hidden><i/><i/><i/><i/></div><div className="site-phone site-phone-hero"><div className="site-phone-bar"><b>TRUSS Coach</b><span>•••</span></div><div className="site-live"><span/> Live coaching</div><div className="site-wave">{Array.from({length: 24}, (_, i) => <i key={i} style={{height: `${8 + ((i * 7) % 24)}px`}} />)}</div><p className="site-phone-label">COACH GUIDANCE</p><div className="site-message">Lead with what you heard. Their concern is timing—not trust.</div><div className="site-message site-message-gold">Try: “What would make the timing feel right?”</div><button aria-label="Mute"><Icon name="mic" /></button></div><div className="site-scene-note"><strong>02:14</strong><span>Conversation confidence</span><em>84%</em></div></div>
    </section>

    <section id="how" className="site-method"><div className="site-section-heading"><span>01 / The method</span><h2>Five things close a job.</h2><p>One proven structure your whole team can use—from the first knock to the signed agreement.</p></div><ol className="site-stage-rail">{STAGES.map((stage, i) => <li key={stage.id}><b>{i + 1}</b><div><span>{stage.letter}</span><h3>{stage.name}</h3><p>{stage.oneLiner}</p></div></li>)}</ol></section>

    <section className="site-products"><div className="site-section-heading site-section-heading-light"><span>02 / The platform</span><h2>Built around the conversations that matter.</h2></div><article className="site-product site-product-featured"><div><Icon name="spark"/><small>TRUSS Coach</small><h3>{t('marketing.coachTitle')}</h3><p>{t('marketing.coachBody')}</p><Link href="/signup">Meet your coach <span>↗</span></Link></div><div className="site-chat-demo"><header><b>TRUSS Coach</b><span>Online</span></header><div className="site-chat-question">They said they already signed with someone.</div><div className="site-chat-answer">Don’t challenge the decision. Find the gap.<br/><strong>“What made you feel confident they were the right fit?”</strong></div><footer><span>Ask anything…</span><b>↑</b></footer></div></article><div className="site-product-pair"><article className="site-product site-practice"><div><Icon name="mic"/><small>Practice</small><h3>{t('marketing.practiceTitle')}</h3><p>{t('marketing.practiceBody')}</p></div><div className="site-mini-phone"><span>HOMEOWNER</span><b>“We need to think<br/>about it.”</b><i><Icon name="mic"/></i><small>Hold to respond</small></div></article><article className="site-product site-research"><div><Icon name="search"/><small>Research</small><h3>{t('marketing.researchTitle')}</h3><p>{t('marketing.researchBody')}</p></div><div className="site-map"><span className="site-map-road r1"/><span className="site-map-road r2"/><span className="site-map-road r3"/><i className="pin p1"/><i className="pin p2"/><i className="pin p3"/><div><b>3 recent storms</b><small>Maple District · 4.2 mi</small></div></div></article></div></section>

    <section className="site-enterprise"><div><span>03 / Enterprise</span><h2>{t('marketing.enterpriseTitle')}</h2></div><div><p>{t('marketing.enterpriseBody')}</p><Link href="/enterprise" className="site-btn-light">{t('marketing.enterpriseCta')} <span>↗</span></Link></div></section>
    <section className="site-workforce"><div className="site-section-heading"><span>04 / Made for the trades</span><h2>Built for the people doing the work.</h2></div><div className="site-benefits"><div><Icon name="globe"/><b>English and Spanish</b><p>The whole platform, including voice practice, works in both.</p></div><div><Icon name="phone"/><b>Made for a phone</b><p>Big type, big buttons, one thumb. Ready between jobs.</p></div><div><Icon name="shield"/><b>Honest by design</b><p>Coaching that protects trust, the customer, and your license.</p></div></div></section>
    <section className="site-final-cta"><div className="site-final-mark" aria-hidden>△</div><h2>Put your best closer<br/>in every truck.</h2><Link href="/signup" className="site-btn-primary">Start free <span>↗</span></Link></section>
  </>;
}
