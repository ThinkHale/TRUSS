'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { geocode } from '@/lib/google/geocode';

const createSchema = z.object({
  name: z.string().min(1).max(200),
  address: z.string().max(300).nullable(),
});

/**
 * Creates an account, resolving the address to coordinates when possible so
 * weather and storm history work for it immediately.
 */
export async function createAccount(input: { name: string; address: string | null }) {
  const parsed = createSchema.parse(input);

  const session = await getSessionContext();
  if (!session) throw new Error('Not signed in.');

  let coords: { lat: number; lng: number; city: string | null; state: string | null; postal: string | null; placeId: string | null } = {
    lat: 0,
    lng: 0,
    city: null,
    state: null,
    postal: null,
    placeId: null,
  };

  let resolved = false;
  if (parsed.address) {
    try {
      const result = await geocode(parsed.address);
      coords = {
        lat: result.lat,
        lng: result.lng,
        city: result.city,
        state: result.state,
        postal: result.postalCode,
        placeId: result.placeId,
      };
      resolved = true;
    } catch {
      // A bad or missing address must not block creating the account.
    }
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.from('accounts').insert({
    org_id: session.orgId,
    owner_user_id: session.userId,
    name: parsed.name,
    address: parsed.address,
    city: coords.city,
    state: coords.state,
    postal_code: coords.postal,
    lat: resolved ? coords.lat : null,
    lng: resolved ? coords.lng : null,
    google_place_id: coords.placeId,
  });

  if (error) throw new Error('Could not save that account.');

  revalidatePath('/accounts');
}
