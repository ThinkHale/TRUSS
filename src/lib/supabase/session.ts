/**
 * Resolves the signed-in user and their active organization.
 *
 * Every AI route calls this before doing anything, both to authenticate and to
 * load the enterprise context that personalizes the model's behavior.
 */

import { cache } from 'react';
import { supabaseServer } from './server';
import type { OrgContext } from '@/lib/ai/prompts';

export interface SessionContext {
  userId: string;
  email: string | null;
  orgId: string;
  orgName: string;
  role: 'owner' | 'admin' | 'manager' | 'rep';
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  locale: 'en' | 'es';
}

/**
 * Memoized for the life of one request. The app layout and the page inside it
 * both need the session, and without this each render pass paid for a separate
 * round of auth and database calls — the bulk of the delay when switching
 * sections.
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await supabaseServer();

  // getClaims verifies the token's ES256 signature against the project's
  // published JWKS in-process. getUser would ask the auth server to do the
  // same thing over the network on every single render.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;
  const user = { id: claims.sub, email: claims.email ?? null };

  // The profile row carries the active org; memberships carry the role. Both
  // are keyed off the user alone, so they go out together rather than in
  // sequence — a rep belongs to one org in practice, so this stays small.
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('active_org_id, locale').eq('id', user.id).single(),
    supabase
      .from('memberships')
      .select('org_id, role, organizations(id, name, plan)')
      .eq('user_id', user.id),
  ]);

  if (!profile?.active_org_id) return null;

  const membership = memberships?.find((m) => m.org_id === profile.active_org_id);
  if (!membership) return null;

  const org = membership.organizations as unknown as {
    id: string;
    name: string;
    plan: SessionContext['plan'];
  };

  return {
    userId: user.id,
    email: user.email,
    orgId: org.id,
    orgName: org.name,
    role: membership.role as SessionContext['role'],
    plan: org.plan,
    locale: (profile.locale as 'en' | 'es') ?? 'en',
  };
});

/**
 * Builds the org context that personalizes prompts. For Enterprise tenants this
 * is where their playbook, trades, and service area come from.
 */
export async function loadOrgContext(session: SessionContext): Promise<OrgContext> {
  const supabase = await supabaseServer();

  const { data: settings } = await supabase
    .from('org_settings')
    .select('trades, service_area, playbook_rules')
    .eq('org_id', session.orgId)
    .maybeSingle();

  return {
    companyName: session.orgName,
    trades: settings?.trades ?? undefined,
    serviceArea: settings?.service_area ?? undefined,
    playbookRules: settings?.playbook_rules ?? undefined,
    locale: session.locale,
  };
}
