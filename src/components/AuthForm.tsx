'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Sign in and sign up.
 *
 * Email plus password, because a large share of this workforce does not have a
 * work Google account and magic links get lost in a personal inbox on a phone.
 *
 * Companies that sign in through their own identity provider (SAML SSO,
 * configured per domain — migration 0021) are routed there instead: an address
 * at an SSO-required domain goes to its provider rather than to a password check.
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
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ssoRequired = params.get('sso') === 'required';
  const linkError = params.get('error') === 'link';

  // A password session for an SSO-only domain is ended here, so the next
  // sign-in goes through the identity provider.
  useEffect(() => {
    if (ssoRequired) void supabaseBrowser().auth.signOut();
  }, [ssoRequired]);

  function nextPath(): string {
    const next = params.get('next');
    // Accept only local paths; never pass an arbitrary URL to the router.
    return next && /^\/(?!\/)/.test(next) && !/[\\\u0000-\u0020]/.test(next) ? next : '/coach';
  }

  async function signInWithSso() {
    const domain = email.trim().toLowerCase().split('@')[1];
    if (!domain) {
      setError('Enter your work email first.');
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: ssoError } = await supabaseBrowser().auth.signInWithSSO({
      domain,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}` },
    });
    if (ssoError || !data?.url) {
      setError('Single sign-on is not set up for that email domain. Ask your company admin.');
      setBusy(false);
      return;
    }
    window.location.href = data.url;
  }

  async function sendReset() {
    if (!email.trim()) {
      setError('Enter your email first.');
      return;
    }
    setBusy(true);
    setError(null);
    await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/set-password`,
    });
    // Same message whether or not the address has an account.
    setNotice('If that email has an account, a link to set a new password is on its way.');
    setBusy(false);
  }

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
        const { data: requiresSso } = await supabase.rpc('sso_required_for', { p_email: email });
        if (requiresSso) {
          await signInWithSso();
          return;
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push(nextPath());
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

      {ssoRequired && (
        <p role="status" className="rounded-lg border border-gold-500/40 bg-gold-300/10 px-3 py-2 text-sm">
          Your company signs in through its own login. Enter your work email and choose <b>Sign in with SSO</b>.
        </p>
      )}
      {linkError && (
        <p role="status" className="rounded-lg border border-nogo/30 bg-nogo/5 px-3 py-2 text-sm text-nogo">
          That link has expired or was already used. Request a new one below.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-nogo">{error}</p>}
      {notice && <p role="status" className="text-sm text-go">{notice}</p>}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? t('loading') : mode === 'signup' ? t('getStarted') : t('signIn')}
      </button>

      {mode === 'login' && (
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <button type="button" className="font-semibold text-ink-700 hover:underline" disabled={busy} onClick={signInWithSso}>
            Sign in with SSO
          </button>
          <button type="button" className="font-semibold text-ink-500 hover:underline" disabled={busy} onClick={sendReset}>
            Forgot password?
          </button>
        </div>
      )}

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
