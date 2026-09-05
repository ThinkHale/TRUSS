import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/auth/platform';
import { isSupabaseConfigured } from '@/lib/supabase/server';

/**
 * The operator console.
 *
 * Deliberately not inside the (app) route group and deliberately not styled
 * like the product. An operator acting on someone else's tenant should never be
 * one glance away from believing they are looking at their own account, so this
 * gets its own navy chrome and says whose platform it is at the top.
 *
 * The gate is requirePlatformAdmin(), which redirects rather than 403s — a rep
 * who guesses the URL should land on the Coach, not on a locked door that tells
 * them something exists here.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) redirect('/setup');

  // Deliberately not gated on getSessionContext(): operator authority does not
  // come from org membership, and an operator who has not completed onboarding
  // has no active org. Requiring one here would loop them through
  // /login -> /coach -> /onboarding and never let them reach the console.
  await requirePlatformAdmin();

  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <div className="admin-bar-inner">
          <Link href="/admin" className="admin-brand">
            TRUSS <span>operations</span>
          </Link>

          <nav className="admin-nav" aria-label="Admin">
            <Link href="/admin/orgs">Companies</Link>
            <Link href="/admin/orgs/new">New company</Link>
            <Link href="/admin/users">People</Link>
            <Link href="/admin/audit">Audit</Link>
            <Link href="/coach" className="admin-exit">
              Back to the app
            </Link>
          </nav>
        </div>
      </header>

      <main className="admin-main">{children}</main>
    </div>
  );
}
