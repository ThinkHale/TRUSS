/**
 * Platform administration — the operator role that sits above org tenancy.
 *
 * The authority itself lives in the database: `platform_admins` plus the
 * widened RLS helpers in migration 0008. Nothing here grants access. These
 * functions only ask the database what it already believes, so a bug in the
 * application can hide the admin console but cannot open it.
 *
 * Everything the console reads goes through the caller's own Supabase client,
 * with RLS applied. That is deliberate: it means the Coach-privacy policy
 * (`coach_conversations` gated on `user_id = auth.uid()`) keeps holding for the
 * operator, exactly as ENTERPRISE.md promises reps it does. The service-role
 * client appears in exactly one place — listing and creating auth users, which
 * RLS cannot reach — and never for tenant data.
 */

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';

/**
 * Emails that should hold platform admin, from the environment.
 *
 * This is the bootstrap: the first operator cannot be granted through the
 * console because the console requires being an operator. Rather than asking
 * for a hand-run SQL insert, the list is reconciled on entry to /admin, which
 * also makes it a recovery path if the last admin row is ever deleted.
 *
 * Anyone who can set this variable can already read the service-role key from
 * the same environment, so it grants nothing they did not already have.
 */
function bootstrapEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * True when the signed-in user is a platform operator.
 *
 * Memoized per request: the admin layout, its nav, and the page inside it all
 * ask, and one answer per request is enough.
 */
export const isPlatformAdmin = cache(async (): Promise<boolean> => {
  const supabase = await supabaseServer();

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return false;

  // platform_admins_read lets a user see their own row, so this needs no
  // elevated client and cannot be used to enumerate other operators.
  const { data } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(data);
});

/**
 * Grants platform admin to any signed-in user whose email is in the bootstrap
 * list and who does not hold it yet. Returns true if the caller ends up an
 * operator.
 *
 * Uses the service-role client because the caller is, by definition, not yet an
 * operator, so `admin_set_platform_admin` would reject them.
 */
export const reconcileBootstrapAdmin = cache(async (): Promise<boolean> => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const email = claims?.claims?.email?.toLowerCase();
  if (!userId || !email) return false;

  if (await isPlatformAdmin()) return true;
  if (!bootstrapEmails().includes(email)) return false;

  const admin = supabaseAdmin();
  const { error } = await admin
    .from('platform_admins')
    .upsert({ user_id: userId, note: 'Bootstrapped from PLATFORM_ADMIN_EMAILS' }, { onConflict: 'user_id' });

  if (error) {
    console.error('platform admin bootstrap failed', { userId, code: error.code });
    return false;
  }

  await admin.from('admin_audit_log').insert({
    actor_id: userId,
    actor_email: email,
    action: 'platform_admin.bootstrap',
    target_user: userId,
    detail: { source: 'PLATFORM_ADMIN_EMAILS' },
  });

  return true;
});

/**
 * Gate for every admin route and server action.
 *
 * Sends a non-operator to the Coach rather than to a 403 page: a rep who
 * guesses the URL should see the product, not a door with a lock on it.
 */
export async function requirePlatformAdmin(): Promise<void> {
  const allowed = (await isPlatformAdmin()) || (await reconcileBootstrapAdmin());
  if (!allowed) redirect('/coach');
}

/** True when a bootstrap list is configured at all, for the setup checklist. */
export function hasBootstrapList(): boolean {
  return bootstrapEmails().length > 0;
}
