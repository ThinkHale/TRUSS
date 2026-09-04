/**
 * Google Geocoding API. Server-only.
 *
 * Replaces Scout's Azure Maps address search. Every research and weather lookup
 * starts here, because both the Places and Weather APIs are coordinate-based.
 */

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  /** Two-letter state code where available. Used for licensing and legal nuance. */
  state: string | null;
  postalCode: string | null;
  city: string | null;
  placeId: string;
}

function key(): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new Error('GOOGLE_MAPS_API_KEY is not configured on the server.');
  return k;
}

function component(
  components: { long_name: string; short_name: string; types: string[] }[],
  type: string,
  form: 'long' | 'short' = 'long',
): string | null {
  const match = components.find((c) => c.types.includes(type));
  if (!match) return null;
  return form === 'short' ? match.short_name : match.long_name;
}

export async function geocode(query: string): Promise<GeocodeResult> {
  const url = `${GEOCODE_URL}?address=${encodeURIComponent(query)}&key=${key()}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });

  if (!res.ok) throw new Error(`Geocoding failed (${res.status}).`);

  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Could not find "${query}". Try a full address, city and state, or a ZIP code.`);
  }

  const r = data.results[0];
  return {
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng,
    formattedAddress: r.formatted_address,
    state: component(r.address_components, 'administrative_area_level_1', 'short'),
    postalCode: component(r.address_components, 'postal_code'),
    city:
      component(r.address_components, 'locality') ??
      component(r.address_components, 'sublocality') ??
      component(r.address_components, 'administrative_area_level_2'),
    placeId: r.place_id,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  const url = `${GEOCODE_URL}?latlng=${lat},${lng}&key=${key()}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });

  if (!res.ok) throw new Error(`Reverse geocoding failed (${res.status}).`);

  const data = await res.json();
  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error('Could not resolve that location.');
  }

  const r = data.results[0];
  return {
    lat,
    lng,
    formattedAddress: r.formatted_address,
    state: component(r.address_components, 'administrative_area_level_1', 'short'),
    postalCode: component(r.address_components, 'postal_code'),
    city: component(r.address_components, 'locality'),
    placeId: r.place_id,
  };
}
