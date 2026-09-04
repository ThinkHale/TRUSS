'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { RATING_COLOR, cx } from '@/lib/truss/ui';

/**
 * Area research.
 *
 * Everything here is real data — Google Geocoding, Places, and Weather, plus
 * NOAA storm reports — with a written brief on top. The order reflects what a
 * rep actually needs first: the read, then whether crews and canvassers can
 * work, then the storm history that decides whether there is a claim at all.
 */

interface WorkWindow {
  date: string;
  install: { rating: 'good' | 'marginal' | 'no-go'; reason: string };
  canvass: { rating: 'good' | 'marginal' | 'no-go'; reason: string };
}

interface ResearchResult {
  location: { formattedAddress: string; lat: number; lng: number };
  radiusMiles: number;
  current: {
    description: string;
    tempF: number;
    feelsLikeF: number;
    windMph: number;
    windGustMph: number | null;
    precipProbability: number;
  } | null;
  forecast: {
    date: string;
    highF: number;
    lowF: number;
    description: string;
    precipProbability: number;
    windMph: number;
  }[];
  workWindows: WorkWindow[];
  storms: {
    summary: string;
    daysSinceLastEvent: number | null;
    maxHailInches: number | null;
    maxWindMph: number | null;
    alerts: { event: string; headline: string }[];
    reports: {
      occurredAt: string;
      type: string;
      magnitude: number | null;
      unit: string | null;
      city: string;
      state: string;
      distanceMiles?: number;
    }[];
  } | null;
  places: { id: string; name: string; address: string; primaryType: string | null }[];
  brief: string | null;
}

const RADIUS_OPTIONS = [5, 10, 25, 50];

export function AreaResearch() {
  const t = useTranslations('research');
  const tc = useTranslations('common');

  const [query, setQuery] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), radiusMiles }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'failed');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      <form onSubmit={run} className="space-y-3">
        <input
          className="field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('placeholder')}
          aria-label={t('placeholder')}
          autoComplete="street-address"
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-steel-400">{t('radius')}</span>
          <div className="flex gap-1.5">
            {RADIUS_OPTIONS.map((miles) => (
              <button
                key={miles}
                type="button"
                onClick={() => setRadiusMiles(miles)}
                aria-pressed={radiusMiles === miles}
                className={cx(
                  'min-h-touch rounded-xl border px-3.5 text-sm font-semibold transition-colors',
                  radiusMiles === miles
                    ? 'border-signal-500 bg-signal-500/15 text-signal-400'
                    : 'border-steel-700 text-steel-300',
                )}
              >
                {miles}
              </button>
            ))}
          </div>
          <span className="text-sm text-steel-400">{t('miles')}</span>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading || !query.trim()}>
          {loading ? tc('loading') : t('search')}
        </button>
      </form>

      {error && (
        <div role="alert" className="card mt-4 border-nogo/40 bg-nogo/10">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-5">
          <p className="text-sm font-semibold text-steel-300">
            {result.location.formattedAddress}
          </p>

          {result.brief && (
            <section className="card border-l-4" style={{ borderLeftColor: 'var(--color-signal-500)' }}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-signal-400">
                {t('brief')}
              </h2>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-steel-200">
                {result.brief}
              </div>
            </section>
          )}

          {result.current && (
            <section className="card">
              <h2 className="text-xs font-bold uppercase tracking-widest text-steel-400">
                {t('weather')}
              </h2>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-4xl font-black">{result.current.tempF}°</span>
                <span className="text-steel-300">{result.current.description}</span>
              </div>
              <p className="mt-1 text-sm text-steel-400">
                Feels {result.current.feelsLikeF}° · Wind {result.current.windMph} mph
                {result.current.windGustMph ? ` (gusts ${result.current.windGustMph})` : ''} ·{' '}
                {result.current.precipProbability}% precip
              </p>
            </section>
          )}

          {result.workWindows.length > 0 && (
            <section className="card">
              <h2 className="text-xs font-bold uppercase tracking-widest text-steel-400">
                {t('workWindows')}
              </h2>
              <ul className="mt-3 space-y-2.5">
                {result.workWindows.map((day, i) => (
                  <li key={day.date} className="border-b border-steel-800 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">
                        {formatDay(day.date)}
                        <span className="ml-2 font-normal text-steel-400">
                          {result.forecast[i]?.highF}°/{result.forecast[i]?.lowF}°
                        </span>
                      </span>
                      <div className="flex gap-1.5">
                        <RatingPill label={t('install')} rating={day.install.rating} t={t} />
                        <RatingPill label={t('canvass')} rating={day.canvass.rating} t={t} />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-steel-400">{day.install.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.storms && (
            <section className="card">
              <h2 className="text-xs font-bold uppercase tracking-widest text-steel-400">
                {t('storms')}
              </h2>
              <p className="mt-2 text-sm font-semibold text-steel-100">{result.storms.summary}</p>

              {result.storms.alerts.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {result.storms.alerts.map((alert, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-nogo/40 bg-nogo/10 px-3 py-2 text-sm text-red-100"
                    >
                      <strong>{alert.event}</strong>
                      {alert.headline ? ` — ${alert.headline}` : ''}
                    </li>
                  ))}
                </ul>
              )}

              {result.storms.reports.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm text-steel-300">
                  {result.storms.reports.slice(0, 10).map((report, i) => (
                    <li key={i} className="flex justify-between gap-3 border-b border-steel-800 py-1.5 last:border-0">
                      <span>
                        <span className="font-semibold text-steel-200">
                          {report.type}
                          {report.magnitude ? ` ${report.magnitude}${report.unit ?? ''}` : ''}
                        </span>{' '}
                        · {report.city}, {report.state}
                      </span>
                      <span className="shrink-0 text-steel-500">
                        {report.occurredAt.slice(0, 10)}
                        {report.distanceMiles != null ? ` · ${report.distanceMiles}mi` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-steel-400">{t('noStorms')}</p>
              )}
            </section>
          )}

          {result.places.length > 0 && (
            <section className="card">
              <h2 className="text-xs font-bold uppercase tracking-widest text-steel-400">
                {t('properties')}
              </h2>
              <ul className="mt-3 space-y-2">
                {result.places.slice(0, 20).map((place) => (
                  <li key={place.id} className="border-b border-steel-800 pb-2 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold">{place.name}</p>
                    <p className="text-xs text-steel-400">{place.address}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function RatingPill({
  label,
  rating,
  t,
}: {
  label: string;
  rating: 'good' | 'marginal' | 'no-go';
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-bold text-steel-950"
      style={{ backgroundColor: RATING_COLOR[rating] }}
      title={`${label}: ${t(`ratings.${rating}`)}`}
    >
      {label} · {t(`ratings.${rating}`)}
    </span>
  );
}

function formatDay(iso: string): string {
  if (!iso) return '';
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
}
