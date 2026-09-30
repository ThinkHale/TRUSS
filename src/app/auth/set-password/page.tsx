import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Wordmark } from '@/components/brand/Logo';
import { SetPasswordForm } from '@/components/SetPasswordForm';
import { isSupabaseConfigured, supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Choose a password' };

/**
 * Someone arriving from an invitation or a reset link is signed in but may
 * have no password yet. Without this, an invited rep is locked out the first
 * time their session expires.
 */
export default async function SetPasswordPage() {
  if (!isSupabaseConfigured()) redirect('/setup');
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect('/login?error=link');

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-12">
      <Wordmark />
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight">Choose a password</h1>
      <p className="mt-2 text-ink-600">You will use it with {String(data.claims.email ?? 'your email')} to sign in.</p>
      <SetPasswordForm />
    </div>
  );
}
