import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Wordmark } from '@/components/brand/Logo';
import { LanguageToggle } from '@/components/LanguageToggle';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-steel-950">
      <header className="sticky top-0 z-40 border-b border-steel-800/80 bg-steel-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" aria-label="TRUSS home">
            <Wordmark compact />
          </Link>
          <nav className="flex items-center gap-2">
            <LanguageToggle />
            <Link href="/pricing" className="hidden px-3 py-2 text-sm font-semibold text-steel-300 hover:text-steel-50 sm:block">
              {t('marketing.pricingTitle')}
            </Link>
            <Link href="/enterprise" className="hidden px-3 py-2 text-sm font-semibold text-steel-300 hover:text-steel-50 sm:block">
              Enterprise
            </Link>
            <Link href="/login" className="btn-ghost px-4 text-sm">
              {t('common.signIn')}
            </Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-steel-800 px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Wordmark compact />
            <p className="mt-3 max-w-sm text-sm text-steel-400">
              {t('brand.expansion')}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-steel-400">
            <Link href="/pricing" className="hover:text-steel-100">{t('marketing.pricingTitle')}</Link>
            <Link href="/enterprise" className="hover:text-steel-100">Enterprise</Link>
            <Link href="/login" className="hover:text-steel-100">{t('common.signIn')}</Link>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-xs text-steel-600">
          © {new Date().getFullYear()} TRUSS · trusscoach.com
        </p>
      </footer>
    </div>
  );
}
