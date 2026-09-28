'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

const schema = z.object({
  trades: z.array(z.string().trim().min(1).max(60)).max(20),
  serviceArea: z.array(z.string().trim().min(1).max(120)).max(50),
});

export type CompanyResult = { ok: true } | { ok: false; message: string };

/**
 * Lets an owner or admin keep their company's trades and service area current.
 *
 * Trades decide which trade packs of the knowledge base the Coach, Practice
 * scorer, and campaign writer lean on, so a company that grows from roofing
 * into gutters or HVAC should not need TRUSS support to say so. The write uses
 * the caller's own client: org_settings only accepts it from an owner or admin.
 */
export async function updateCompanyProfile(input: z.input<typeof schema>): Promise<CompanyResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check the trades and places and try again.' };

  const session = await getSessionContext();
  if (!session) return { ok: false, message: 'Your session expired. Sign in and try again.' };
  if (!['owner', 'admin'].includes(session.role)) {
    return { ok: false, message: 'Only an owner or admin can change what the company does.' };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('org_settings')
    .update({
      trades: [...new Set(parsed.data.trades)],
      service_area: [...new Set(parsed.data.serviceArea)],
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', session.orgId);

  if (error) return { ok: false, message: 'Could not save that. Please try again.' };

  revalidatePath('/settings');
  return { ok: true };
}
