import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandLogo } from '@/components/brand/Logo';
import { AppNav } from '@/components/AppNav';
import { LanguageToggle } from '@/components/LanguageToggle';
import { getSessionContext } from '@/lib/supabase/session';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Without a database configured there is no session to load; send people to
  // setup rather than throwing a stack trace at them.
  if (!isSupabaseConfigured()) redirect('/setup');

  const session = await getSessionContext();
  if (!session) redirect('/onboarding');

  return (
    <div className="app-shell min-h-screen">
      <header className="app-mobile-header">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/coach" aria-label="TRUSS Coach">
            <BrandLogo priority className="app-mobile-logo" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              href="/settings"
              className="app-avatar"
              aria-label="Settings"
            >
              {(session.orgName || 'T').charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>
      </header>

      <div className="app-frame">
        <AppNav orgName={session.orgName} />
        {/* Bottom padding clears the phone nav bar. */}
        <main className="app-main min-w-0 flex-1 pb-24 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
