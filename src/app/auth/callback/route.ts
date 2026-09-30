/**
 * Where Supabase sends people back after SSO, a password-reset link, or an
 * invitation link.
 *
 * Two shapes arrive here. SSO and PKCE email links carry `?code=`, exchanged
 * for a session with the verifier cookie this browser set. Email templates
 * configured for the token-hash flow carry `?token_hash=&type=`, verified
 * directly. Either way the session cookie is written here — a route handler
 * can set cookies; a page cannot — and the person is sent on to `next`.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';

const OTP_TYPES: EmailOtpType[] = ['invite', 'recovery', 'signup', 'magiclink', 'email', 'email_change'];

/** Only local paths, so this cannot be used to bounce someone to another site. */
function safeNext(raw: string | null): string {
  return raw && /^\/(?!\/)/.test(raw) && !/[\\\u0000- ]/.test(raw) ? raw : '/coach';
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = safeNext(url.searchParams.get('next'));
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  const supabase = await supabaseServer();
  let failed = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failed = Boolean(error);
  } else if (url.searchParams.get('error')) {
    failed = true;
  }

  const target = url.clone();
  target.search = '';
  if (failed) {
    target.pathname = '/login';
    target.searchParams.set('error', 'link');
  } else {
    // An invite or reset link lands on the password page, whatever `next` says.
    target.pathname = type === 'invite' || type === 'recovery' ? '/auth/set-password' : next;
  }
  return NextResponse.redirect(target);
}
