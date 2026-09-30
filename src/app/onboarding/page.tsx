import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Wordmark } from '@/components/brand/Logo';
import { OnboardingForm } from '@/components/OnboardingForm';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase/server';
import { getSessionContext, ssoStatus } from '@/lib/supabase/session';

export const metadata: Metadata = { title: 'Welcome' };

/**
 * A signed-in user with no organization lands here. Creating the org is a
 * separate, explicit step so we can ask what company they work for and which
 * trades they do — both of which shape the Coach from the first question.
 */
export default async function OnboardingPage() {
  // Without a database configured there is no session to load; send people to
  // setup rather than throwing a stack trace at them.
  if (!isSupabaseConfigured()) redirect('/setup');

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // getSessionContext has already accepted any invitation this account was
  // created for, and joined the company that owns its email domain, so
  // reaching here means there was genuinely nowhere to put them.
  const session = await getSessionContext();
  if (session) redirect('/coach');

  // A password sign-in at a domain that requires SSO is not a session at all;
  // they belong on the sign-in page, not here being offered a new company.
  if (!(await ssoStatus()).satisfied) redirect('/login?sso=required');

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <Wordmark />
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight">Tell us about your company</h1>
      <p className="mt-2 text-ink-600">
        This is how TRUSS Coach learns what you sell and where you sell it.
      </p>
      <p className="mt-2 text-sm text-ink-500">
        Joining your company&apos;s TRUSS instead? Ask your manager to invite this email address — you will land
        in it the next time you sign in.
      </p>
      <OnboardingForm />
    </div>
  );
}
