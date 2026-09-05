import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Refreshes the Supabase session cookie on every request and gates the app
 * routes. Marketing pages, auth pages, and the API stay open — the API
 * authenticates per route because it also needs the org context.
 */

const PROTECTED_PREFIXES = ['/coach', '/practice', '/method', '/research', '/campaigns', '/accounts', '/settings',
  // /admin authorizes again in its own layout; this only ensures a signed-out
  // visitor is sent to login rather than through a database round trip.
  '/admin'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase configured, let everything through so the marketing site
  // and a local dev environment still run.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Verified locally against the project's JWKS rather than by a round trip to
  // the auth server, which this runs on every request including each RSC fetch.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ?? null;

  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some((p) => path.startsWith(p));

  if (needsAuth && !user) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.searchParams.set('next', path);
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  // Signed-in reps land on the Coach, not the marketing page.
  if (user && (path === '/login' || path === '/signup')) {
    const app = request.nextUrl.clone();
    app.pathname = '/coach';
    app.search = '';
    const redirect = NextResponse.redirect(app);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)'],
};
