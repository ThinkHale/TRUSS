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

  // dvh, not vh, on the shell: the Coach work area measures itself the same
  // way, and a vh floor here would leave the shell taller than its own content
  // while the phone's URL bar is showing.
  return (
    <div className="app-shell min-h-dvh">
      {/* The band is a fixed height and the lockup is sized to sit inside it —
          see --app-header-h. Letting the logo drive the height instead lets the
          tagline hang below the navy on a phone. */}
      <header className="app-mobile-header">
        <div className="flex h-full items-center justify-between gap-3 px-3.5">
          <Link href="/coach" aria-label="TRUSS Coach">
            <BrandLogo preload className="app-mobile-logo" />
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
        <AppNav orgName={session.orgName} isPlatformAdmin={session.isPlatformAdmin} />
        {/* Clearance for the phone tab bar is set in CSS, from the same
            variable the tab bar and the Coach work area measure from. */}
        <main className="app-main min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
