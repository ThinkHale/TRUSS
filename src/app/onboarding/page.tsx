import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Wordmark } from '@/components/brand/Logo';
import { OnboardingForm } from '@/components/OnboardingForm';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase/server';
import { getSessionContext } from '@/lib/supabase/session';

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

  const session = await getSessionContext();
  if (session) redirect('/coach');

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <Wordmark />
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight">Tell us about your company</h1>
      <p className="mt-2 text-steel-300">
        This is how TRUSS Coach learns what you sell and where you sell it.
      </p>
      <OnboardingForm />
    </div>
  );
}
