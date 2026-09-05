'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { setLocale } from '@/app/actions/locale';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/config';

/**
 * Language switch.
 *
 * Deliberately always visible rather than buried in settings: a rep who lands
 * on an English page they cannot read needs the way out to be obvious, and
 * each option is labeled in its own language.
 */
export function LanguageToggle() {
  const current = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  return (
    // .lang-toggle carries the navy-chrome treatment: the paper-first colors
    // below are unreadable on the mobile header and the marketing header.
    <div className="lang-toggle flex rounded-lg border border-line-strong p-0.5" role="group" aria-label="Language">
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            disabled={pending || active}
            aria-pressed={active}
            onClick={() => startTransition(() => void setLocale(locale))}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? 'bg-paper-300 text-ink-900'
                : 'text-ink-500 hover:text-ink-900 disabled:opacity-50'
            }`}
          >
            {LOCALE_LABELS[locale]}
          </button>
        );
      })}
    </div>
  );
}
