/**
 * Google Places API (New). Server-only.
 *
 * Replaces Scout's Azure Maps POI search. Used two ways:
 *   1. Commercial prospecting — find businesses worth a call in an area.
 *   2. Property context — what kind of area is this, for the research brief.
 */

const NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';

/** Only request the fields we use. Places bills per field mask. */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.primaryType',
  'places.types',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.businessStatus',
  'places.rating',
  'places.userRatingCount',
].join(',');

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  primaryType: string | null;
  types: string[];
  website: string | null;
  phone: string | null;
  rating: number | null;
  ratingCount: number | null;
}

function key(): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new Error('GOOGLE_MAPS_API_KEY is not configured on the server.');
  return k;
}

/**
 * Place types worth a trades sales call. Deliberately biased toward buildings
 * with roofs an owner is responsible for, and away from tenants in malls.
 */
export const COMMERCIAL_TARGET_TYPES = [
  'storage',
  'warehouse',
  'church',
  'school',
  'gym',
  'car_dealer',
  'car_repair',
  'lodging',
  'restaurant',
  'medical_lab',
  'dental_clinic',
  'doctor',
  'veterinary_care',
  'day_care_center',
  'funeral_home',
  'bank',
  'real_estate_agency',
  'apartment_complex',
] as const;

/** Types that are almost never a viable trades prospect. Filtered out. */
const EXCLUDED_TYPES = new Set([
  'atm',
  'bus_stop',
  'transit_station',
  'parking',
  'political',
  'locality',
  'postal_code',
  'route',
  'street_address',
]);

interface RawPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  primaryType?: string;
  types?: string[];
  websiteUri?: string;
  nationalPhoneNumber?: string;
  businessStatus?: string;
  rating?: number;
  userRatingCount?: number;
}

function normalize(raw: RawPlace): Place | null {
  if (!raw.location || !raw.displayName?.text) return null;
  if (raw.businessStatus === 'CLOSED_PERMANENTLY') return null;
  if (raw.types?.some((t) => EXCLUDED_TYPES.has(t))) return null;

  return {
    id: raw.id,
    name: raw.displayName.text,
    address: raw.formattedAddress ?? '',
    lat: raw.location.latitude,
    lng: raw.location.longitude,
    primaryType: raw.primaryType ?? null,
    types: raw.types ?? [],
    website: raw.websiteUri ?? null,
    phone: raw.nationalPhoneNumber ?? null,
    rating: raw.rating ?? null,
    ratingCount: raw.userRatingCount ?? null,
  };
}

async function post(url: string, body: unknown): Promise<RawPlace[]> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key(),
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Places API error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.places ?? [];
}

export async function searchNearby(
  lat: number,
  lng: number,
  radiusMeters: number,
  includedTypes: readonly string[] = COMMERCIAL_TARGET_TYPES,
  maxResults = 20,
): Promise<Place[]> {
  const raw = await post(NEARBY_URL, {
    // Places caps nearby radius at 50km.
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: Math.min(radiusMeters, 50_000),
      },
    },
    // Places caps includedTypes at 50 entries.
    includedTypes: includedTypes.slice(0, 50),
    maxResultCount: Math.min(maxResults, 20),
    rankPreference: 'POPULARITY',
  });

  return raw.map(normalize).filter((p): p is Place => p !== null);
}

export async function searchText(
  query: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  maxResults = 20,
): Promise<Place[]> {
  const raw = await post(TEXT_URL, {
    textQuery: query,
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: Math.min(radiusMeters, 50_000),
      },
    },
    maxResultCount: Math.min(maxResults, 20),
  });

  return raw.map(normalize).filter((p): p is Place => p !== null);
}

/** Straight-line distance in miles. Good enough for "how far is this stop". */
export function distanceMiles(
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
