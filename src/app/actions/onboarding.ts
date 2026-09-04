'use server';

import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';

const schema = z.object({
  name: z.string().min(1).max(200),
  trades: z.array(z.string().max(60)).max(20),
  serviceArea: z.array(z.string().max(120)).max(50),
});

export type CreateOrganizationResult = { ok: true } | { ok: false; message: string };

/**
 * Creates the org, makes the caller its owner, seeds settings, and sets it as
 * the active org — all inside one database function, because the RLS policies
 * on memberships and org_settings read rows this flow is in the middle of
 * creating.
 *
 * Returns a result rather than throwing: Next.js replaces thrown server action
 * messages with an opaque digest in production, so a throw here would reach the
 * rep as React's internal error text instead of something they can act on.
 */
export async function createOrganization(input: {
  name: string;
  trades: string[];
  serviceArea: string[];
}): Promise<CreateOrganizationResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: 'Check the company name and try again.' };
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Your session expired. Sign in and try again.' };

  const { error } = await supabase.rpc('create_organization', {
    p_name: parsed.data.name,
    p_trades: parsed.data.trades,
    p_service_area: parsed.data.serviceArea,
  });

  if (error) {
    console.error('createOrganization failed', {
      userId: user.id,
      code: error.code,
      message: error.message,
    });
    return { ok: false, message: 'Could not create your company. Please try again.' };
  }

  return { ok: true };
}
