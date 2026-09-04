/**
 * Locale handling.
 *
 * TRUSS is built for a workforce where a large share reads Spanish first, so
 * language is a first-class setting rather than an afterthought. There is no
 * URL locale prefix: the locale is a cookie plus a profile column, because a
 * rep who switches to Spanish expects it to stay Spanish everywhere, including
 * on links a teammate texts them.
 */

export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'truss_locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
