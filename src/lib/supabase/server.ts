/**
 * Supabase clients for server components, route handlers, and privileged jobs.
 *
 * Tenant isolation is enforced in the database by Row Level Security, so the
 * request-scoped client below is the one nearly all code should use. The
 * service-role client bypasses RLS and is reserved for Stripe webhooks and
 * knowledge-base ingestion, which run without a user session.
 */

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { cache } from 'react';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured on the server.`);
  return value;
}

/**
 * Request-scoped client that carries the signed-in user. RLS applies.
 *
 * Memoized per request: a layout, its page, and any helper they share all ask
 * for a client, and there is no reason to build more than one against the same
 * cookie store.
 */
export const supabaseServer = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Session refresh is handled by middleware instead.
          }
        },
      },
    },
  );
});

/**
 * Bypasses RLS. Only for trusted server contexts with no user session:
 * Stripe webhooks and knowledge-base ingestion. Never expose to a route a
 * user can reach without an explicit authorization check first.
 */
export function supabaseAdmin() {
  return createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
