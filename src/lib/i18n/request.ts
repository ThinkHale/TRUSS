import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config';

/**
 * Resolves the locale for a request: an explicit choice wins, then the
 * browser's Accept-Language, then English.
 */
async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const chosen = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;

  const accept = (await headers()).get('accept-language') ?? '';
  if (accept.toLowerCase().startsWith('es')) return 'es';

  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
