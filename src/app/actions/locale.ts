'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LOCALE_COOKIE, isLocale } from '@/lib/i18n/config';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Switches the interface language. Persists to the profile when signed in so
 * the choice follows the rep to their next device.
 */
export async function setLocale(next: string) {
  if (!isLocale(next)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, next, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ locale: next }).eq('id', user.id);
    }
  } catch {
    // A signed-out visitor still gets the cookie, which is enough.
  }

  revalidatePath('/', 'layout');
}
