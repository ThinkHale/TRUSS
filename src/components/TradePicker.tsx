'use client';

import { useLocale } from 'next-intl';
import { TRADE_GROUPS } from '@/lib/truss/trades';
import { cx } from '@/lib/truss/ui';

/**
 * Pick the trades a company performs. Grouped the way the TRUSS knowledge base
 * splits its trade packs, and shown in the rep's language while storing one
 * stable value, since the stored value is what retrieval reads.
 */
export function TradePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const lang = useLocale() === 'es' ? 'es' : 'en';

  function toggle(trade: string) {
    onChange(value.includes(trade) ? value.filter((t) => t !== trade) : [...value, trade]);
  }

  return (
    <div className="space-y-3">
      {TRADE_GROUPS.map((group) => (
        <div key={group.en}>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-400">{group[lang]}</p>
          <div className="flex flex-wrap gap-2">
            {group.trades.map((trade) => (
              <button
                key={trade.value}
                type="button"
                disabled={disabled}
                onClick={() => toggle(trade.value)}
                aria-pressed={value.includes(trade.value)}
                className={cx(
                  'min-h-touch rounded-xl border px-4 text-sm font-semibold transition-colors disabled:opacity-60',
                  value.includes(trade.value)
                    ? 'border-gold-500 bg-gold-500/15 text-gold-600'
                    : 'border-line-strong text-ink-600',
                )}
              >
                {trade[lang]}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
