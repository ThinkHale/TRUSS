import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Wordmark } from '@/components/brand/Logo';
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
    <div className="min-h-screen bg-steel-950">
      <header className="sticky top-0 z-30 border-b border-steel-800 bg-steel-950/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/coach" aria-label="TRUSS Coach">
            <Wordmark compact />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              href="/settings"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-steel-800 text-sm font-bold text-steel-200 hover:bg-steel-700"
              aria-label="Settings"
            >
              {(session.orgName || 'T').charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl">
        <AppNav />
        {/* Bottom padding clears the phone nav bar. */}
        <main className="min-w-0 flex-1 pb-24 md:pb-8">{children}</main>
      </div>
    </div>
  );
}
