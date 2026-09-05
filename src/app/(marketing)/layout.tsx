import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { BrandLogo, Wordmark } from '@/components/brand/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();

  return (
    <div className="marketing-shell min-h-screen">
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" aria-label="TRUSS home">
            <BrandLogo preload className="site-brand-logo" />
          </Link>
          <nav className="site-nav">
            <LanguageToggle />
            <Link href="/pricing" className="hidden sm:block">
              {t('marketing.pricingTitle')}
            </Link>
            <Link href="/enterprise" className="hidden sm:block">
              Enterprise
            </Link>
            <Link href="/login" className="site-sign-in">
              {t('common.signIn')}
            </Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <Wordmark compact />
            <p>
              {t('brand.expansion')}
            </p>
          </div>
          <div className="site-footer-links">
            <Link href="/pricing">{t('marketing.pricingTitle')}</Link>
            <Link href="/enterprise">Enterprise</Link>
            <Link href="/login">{t('common.signIn')}</Link>
          </div>
        </div>
        <p className="site-copyright">
          © {new Date().getFullYear()} TRUSS · trusscoach.com
        </p>
      </footer>
    </div>
  );
}
