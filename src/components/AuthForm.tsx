'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Sign in and sign up.
 *
 * Email plus password, because a large share of this workforce does not have a
 * work Google account and magic links get lost in a personal inbox on a phone.
 */
export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const supabase = supabaseBrowser();

      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, locale } },
        });
        if (signUpError) throw signUpError;
        router.push('/onboarding');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push(params.get('next') ?? '/coach');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">
        {mode === 'signup' ? t('getStarted') : t('signIn')}
      </h1>

      {mode === 'signup' && (
        <div>
          <label className="label" htmlFor="auth-name">Name</label>
          <input
            id="auth-name"
            className="field"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          required
          className="field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
        />
      </div>

      <div>
        <label className="label" htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          required
          minLength={8}
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
      </div>

      {error && <p role="alert" className="text-sm text-nogo">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? t('loading') : mode === 'signup' ? t('getStarted') : t('signIn')}
      </button>

      <p className="text-center text-sm text-ink-500">
        {mode === 'signup' ? (
          <Link href="/login" className="font-semibold text-ink-800 hover:underline">
            {t('signIn')}
          </Link>
        ) : (
          <Link href="/signup" className="font-semibold text-ink-800 hover:underline">
            {t('getStarted')}
          </Link>
        )}
      </p>
    </form>
  );
}
