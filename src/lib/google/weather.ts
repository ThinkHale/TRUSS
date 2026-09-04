/**
 * Google Maps Platform Weather API. Server-only.
 *
 * Contractors live and die by weather, so this powers three different things:
 *   - Can crews work today and this week (install conditions).
 *   - Can reps knock doors today (canvassing conditions).
 *   - Is a storm coming that will create demand.
 */

const BASE = 'https://weather.googleapis.com/v1';

function key(): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new Error('GOOGLE_MAPS_API_KEY is not configured on the server.');
  return k;
}

export interface CurrentConditions {
  description: string;
  tempF: number;
  feelsLikeF: number;
  windMph: number;
  windGustMph: number | null;
  precipProbability: number;
  humidity: number;
  isDaytime: boolean;
  observedAt: string;
}

export interface ForecastDay {
  date: string;
  highF: number;
  lowF: number;
  description: string;
  precipProbability: number;
  precipInches: number;
  windMph: number;
  windGustMph: number | null;
  thunderstormProbability: number;
}

/** How usable a day is, scored separately for the crew and for the canvasser. */
export interface WorkWindow {
  date: string;
  install: { rating: 'good' | 'marginal' | 'no-go'; reason: string };
  canvass: { rating: 'good' | 'marginal' | 'no-go'; reason: string };
}

async function get(path: string, params: Record<string, string | number>) {
  const qs = new URLSearchParams({ key: key(), ...mapValues(params) });
  const res = await fetch(`${BASE}/${path}?${qs}`, { next: { revalidate: 900 } });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Weather API error ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json();
}

function mapValues(o: Record<string, string | number>): Record<string, string> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)]));
}

const cToF = (c: number | undefined | null): number =>
  c === undefined || c === null ? 0 : Math.round((c * 9) / 5 + 32);
const kmhToMph = (k: number | undefined | null): number =>
  k === undefined || k === null ? 0 : Math.round(k * 0.621371);
const mmToIn = (m: number | undefined | null): number =>
  m === undefined || m === null ? 0 : Math.round(m * 0.0393701 * 100) / 100;

export async function currentConditions(lat: number, lng: number): Promise<CurrentConditions> {
  const d = await get('currentConditions:lookup', {
    'location.latitude': lat,
    'location.longitude': lng,
    unitsSystem: 'METRIC',
  });

  return {
    description: d.weatherCondition?.description?.text ?? 'Unknown',
    tempF: cToF(d.temperature?.degrees),
    feelsLikeF: cToF(d.feelsLikeTemperature?.degrees),
    windMph: kmhToMph(d.wind?.speed?.value),
    windGustMph: d.wind?.gust?.value != null ? kmhToMph(d.wind.gust.value) : null,
    precipProbability: d.precipitation?.probability?.percent ?? 0,
    humidity: d.relativeHumidity ?? 0,
    isDaytime: d.isDaytime ?? true,
    observedAt: d.currentTime ?? new Date().toISOString(),
  };
}

export async function forecastDays(
  lat: number,
  lng: number,
  days = 7,
): Promise<ForecastDay[]> {
  const d = await get('forecast/days:lookup', {
    'location.latitude': lat,
    'location.longitude': lng,
    days: Math.min(days, 10),
    unitsSystem: 'METRIC',
  });

  return (d.forecastDays ?? []).map((day: Record<string, any>) => {
    const daypart = day.daytimeForecast ?? {};
    const dd = day.displayDate ?? {};
    const date =
      dd.year && dd.month && dd.day
        ? `${dd.year}-${String(dd.month).padStart(2, '0')}-${String(dd.day).padStart(2, '0')}`
        : '';

    return {
      date,
      highF: cToF(day.maxTemperature?.degrees),
      lowF: cToF(day.minTemperature?.degrees),
      description: daypart.weatherCondition?.description?.text ?? 'Unknown',
      precipProbability: daypart.precipitation?.probability?.percent ?? 0,
      precipInches: mmToIn(daypart.precipitation?.qpf?.quantity),
      windMph: kmhToMph(daypart.wind?.speed?.value),
      windGustMph: daypart.wind?.gust?.value != null ? kmhToMph(daypart.wind.gust.value) : null,
      thunderstormProbability: daypart.thunderstormProbability ?? 0,
    } satisfies ForecastDay;
  });
}

/**
 * Turns a forecast into go / no-go calls.
 *
 * Thresholds reflect common roofing practice: shingles do not seal reliably
 * below the mid-40s, sustained wind past ~25 mph makes tear-off unsafe, and
 * any measurable rain stops a roof from being opened up. They are conservative
 * on purpose — a crew sent out on a marginal day costs more than a lost day.
 */
export function assessWorkWindows(forecast: ForecastDay[]): WorkWindow[] {
  return forecast.map((day) => {
    const gust = day.windGustMph ?? day.windMph;

    let install: WorkWindow['install'];
    if (day.precipProbability >= 60 || day.precipInches >= 0.25) {
      install = { rating: 'no-go', reason: 'Rain likely. Do not open a roof.' };
    } else if (gust >= 30) {
      install = { rating: 'no-go', reason: `Gusts near ${gust} mph. Unsafe for tear-off.` };
    } else if (day.highF < 40) {
      install = { rating: 'no-go', reason: `High of ${day.highF}°F. Shingles will not seal.` };
    } else if (day.precipProbability >= 35 || gust >= 22 || day.highF < 50) {
      install = { rating: 'marginal', reason: 'Workable, but watch conditions and plan a short day.' };
    } else {
      install = { rating: 'good', reason: `${day.highF}°F, wind ${day.windMph} mph. Full production day.` };
    }

    let canvass: WorkWindow['canvass'];
    if (day.precipProbability >= 70 || day.thunderstormProbability >= 50) {
      canvass = { rating: 'no-go', reason: 'Storms. Work the phones and follow-ups instead.' };
    } else if (day.highF < 25 || day.highF > 100) {
      canvass = { rating: 'marginal', reason: 'Hard conditions. Short blocks, stay hydrated or warm.' };
    } else if (day.precipProbability >= 40) {
      canvass = { rating: 'marginal', reason: 'Showers around. Expect a lower contact rate.' };
    } else {
      canvass = { rating: 'good', reason: 'Good door weather. People are home and outside.' };
    }

    return { date: day.date, install, canvass };
  });
}
