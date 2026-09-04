'use server';

import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';

const schema = z.object({
  name: z.string().min(1).max(200),
  trades: z.array(z.string().max(60)).max(20),
  serviceArea: z.array(z.string().max(120)).max(50),
});

/**
 * Creates the org, makes the caller its owner, seeds settings, and sets it as
 * the active org. Ordered so a failure partway through leaves no org the user
 * cannot reach.
 */
export async function createOrganization(input: {
  name: string;
  trades: string[];
  serviceArea: string[];
}) {
  const parsed = schema.parse(input);

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const slug =
    parsed.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'company';

  // Suffix keeps the slug unique without a round trip to check.
  const uniqueSlug = `${slug}-${Math.random().toString(36).slice(2, 7)}`;

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: parsed.name, slug: uniqueSlug, plan: 'free', seat_limit: 1 })
    .select('id')
    .single();

  if (orgError || !org) throw new Error('Could not create your company.');

  const { error: membershipError } = await supabase
    .from('memberships')
    .insert({ org_id: org.id, user_id: user.id, role: 'owner' });

  if (membershipError) throw new Error('Could not add you to your company.');

  await supabase.from('org_settings').insert({
    org_id: org.id,
    trades: parsed.trades,
    service_area: parsed.serviceArea,
  });

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ active_org_id: org.id })
    .eq('id', user.id);

  if (profileError) throw new Error('Could not finish setting up your account.');
}
