/**
 * Severe-weather signal — the demand driver for storm restoration work.
 *
 * The Google Weather API covers current conditions and forecast but does not
 * expose historical hail and wind reports, which is the data a restoration
 * contractor actually sells on. So this module reads two free, public,
 * US-government feeds instead:
 *
 *   - api.weather.gov      Active NWS watches, warnings, and advisories.
 *   - Iowa Environmental Mesonet  Archive of NWS Local Storm Reports (hail size,
 *                                 wind gusts, damage) sourced from NOAA.
 *
 * Both are keyless and free. Enterprise tenants that buy a commercial hail
 * verification product can swap `stormHistory` for that provider without
 * touching callers — the return shape is the contract.
 */

const NWS_ALERTS = 'https://api.weather.gov/alerts/active';
const IEM_LSR = 'https://mesonet.agron.iastate.edu/geojson/lsr.geojson';

const USER_AGENT =
  process.env.NWS_USER_AGENT ?? 'TRUSS (trusscoach.com; support@trusscoach.com)';

export interface StormAlert {
  event: string;
  severity: string;
  headline: string;
  onset: string | null;
  expires: string | null;
  description: string;
}

export interface StormReport {
  /** ISO timestamp of the report. */
  occurredAt: string;
  /** HAIL, TSTM WND GST, TORNADO, etc. */
  type: string;
  /** Hail diameter in inches, or wind speed in mph, depending on type. */
  magnitude: number | null;
  unit: string | null;
  city: string;
  county: string;
  state: string;
  lat: number;
  lng: number;
  remark: string | null;
  distanceMiles?: number;
}

export interface StormSignal {
  alerts: StormAlert[];
  reports: StormReport[];
  /** Days since the most significant nearby event, or null if none found. */
  daysSinceLastEvent: number | null;
  /** Largest hail diameter reported nearby in the window, in inches. */
  maxHailInches: number | null;
  /** Highest wind gust reported nearby in the window, in mph. */
  maxWindMph: number | null;
  /** Plain-language read a rep can act on. */
  summary: string;
}

/** Hail at or above this diameter typically causes claimable shingle damage. */
export const CLAIMABLE_HAIL_INCHES = 1.0;
/** Sustained gusts at or above this typically cause claimable wind damage. */
export const CLAIMABLE_WIND_MPH = 58;

function milesBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function activeAlerts(lat: number, lng: number): Promise<StormAlert[]> {
  try {
    const res = await fetch(`${NWS_ALERTS}?point=${lat},${lng}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.features ?? []).map((f: Record<string, any>) => ({
      event: f.properties?.event ?? 'Unknown',
      severity: f.properties?.severity ?? 'Unknown',
      headline: f.properties?.headline ?? '',
      onset: f.properties?.onset ?? null,
      expires: f.properties?.expires ?? null,
      description: (f.properties?.description ?? '').slice(0, 600),
    }));
  } catch {
    // Weather alerts are supplementary. A research brief is still useful without them.
    return [];
  }
}

/**
 * Local Storm Reports within `radiusMiles` over the last `days`.
 * The claim window for most policies is one to two years, so 730 is the practical cap.
 */
export async function stormHistory(
  lat: number,
  lng: number,
  radiusMiles = 25,
  days = 365,
): Promise<StormReport[]> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // Bounding box first, then filter to a true radius below.
  const latPad = radiusMiles / 69;
  const lngPad = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180) || 1);

  const qs = new URLSearchParams({
    sts: `${fmt(start)}T00:00Z`,
    ets: `${fmt(end)}T23:59Z`,
    west: String(lng - lngPad),
    east: String(lng + lngPad),
    south: String(lat - latPad),
    north: String(lat + latPad),
  });

  try {
    const res = await fetch(`${IEM_LSR}?${qs}`, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const data = await res.json();
    const origin = { lat, lng };

    return (data.features ?? [])
      .map((f: Record<string, any>): StormReport | null => {
        const c = f.geometry?.coordinates;
        if (!c) return null;
        const point = { lat: c[1], lng: c[0] };
        const distance = milesBetween(origin, point);
        if (distance > radiusMiles) return null;

        const p = f.properties ?? {};
        return {
          occurredAt: p.valid ?? '',
          type: p.type ?? p.typetext ?? 'Unknown',
          magnitude: p.magnitude != null ? Number(p.magnitude) : null,
          unit: p.unit ?? null,
          city: p.city ?? '',
          county: p.county ?? '',
          state: p.state ?? '',
          lat: point.lat,
          lng: point.lng,
          remark: p.remark ?? null,
          distanceMiles: Math.round(distance * 10) / 10,
        };
      })
      .filter((r: StormReport | null): r is StormReport => r !== null)
      .sort((a: StormReport, b: StormReport) => b.occurredAt.localeCompare(a.occurredAt));
  } catch {
    return [];
  }
}

function isHail(r: StormReport) {
  return r.type.toUpperCase().includes('HAIL');
}
function isWind(r: StormReport) {
  const t = r.type.toUpperCase();
  return t.includes('WND') || t.includes('WIND');
}

export async function stormSignal(
  lat: number,
  lng: number,
  radiusMiles = 25,
  days = 365,
): Promise<StormSignal> {
  const [alerts, reports] = await Promise.all([
    activeAlerts(lat, lng),
    stormHistory(lat, lng, radiusMiles, days),
  ]);

  const hail = reports.filter(isHail).filter((r) => r.magnitude != null);
  const wind = reports.filter(isWind).filter((r) => r.magnitude != null);

  const maxHailInches = hail.length ? Math.max(...hail.map((r) => r.magnitude!)) : null;
  const maxWindMph = wind.length ? Math.max(...wind.map((r) => r.magnitude!)) : null;

  const claimable = reports.filter(
    (r) =>
      (isHail(r) && (r.magnitude ?? 0) >= CLAIMABLE_HAIL_INCHES) ||
      (isWind(r) && (r.magnitude ?? 0) >= CLAIMABLE_WIND_MPH),
  );

  const mostRecent = claimable[0] ?? reports[0] ?? null;
  const daysSinceLastEvent = mostRecent?.occurredAt
    ? Math.floor((Date.now() - new Date(mostRecent.occurredAt).getTime()) / 86_400_000)
    : null;

  return {
    alerts,
    reports: reports.slice(0, 50),
    daysSinceLastEvent,
    maxHailInches,
    maxWindMph,
    summary: buildSummary({
      alerts,
      reports,
      claimable,
      maxHailInches,
      maxWindMph,
      daysSinceLastEvent,
      radiusMiles,
    }),
  };
}

function buildSummary(input: {
  alerts: StormAlert[];
  reports: StormReport[];
  claimable: StormReport[];
  maxHailInches: number | null;
  maxWindMph: number | null;
  daysSinceLastEvent: number | null;
  radiusMiles: number;
}): string {
  const { alerts, reports, claimable, maxHailInches, maxWindMph, daysSinceLastEvent, radiusMiles } =
    input;

  if (alerts.length) {
    const names = [...new Set(alerts.map((a) => a.event))].join(', ');
    return `Active now: ${names}. Hold crews and check back after it clears.`;
  }

  if (!reports.length) {
    return `No severe weather reports within ${radiusMiles} miles in this window. This is a relationship and referral area, not a storm area.`;
  }

  if (!claimable.length) {
    return `${reports.length} storm reports nearby, but none at claimable severity. Expect insurance conversations to be a hard sell here.`;
  }

  const parts: string[] = [];
  if (maxHailInches) parts.push(`hail up to ${maxHailInches}"`);
  if (maxWindMph) parts.push(`gusts to ${maxWindMph} mph`);

  const age =
    daysSinceLastEvent === null
      ? ''
      : daysSinceLastEvent <= 30
        ? ` The most recent was ${daysSinceLastEvent} days ago — this is live.`
        : daysSinceLastEvent <= 365
          ? ` Most recent was ${daysSinceLastEvent} days ago, likely still inside the claim window.`
          : ` Most recent was ${daysSinceLastEvent} days ago — check the policy deadline before promising anything.`;

  return `${claimable.length} claimable events within ${radiusMiles} miles${parts.length ? ` (${parts.join(', ')})` : ''}.${age}`;
}
