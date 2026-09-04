/**
 * Resolves the signed-in user and their active organization.
 *
 * Every AI route calls this before doing anything, both to authenticate and to
 * load the enterprise context that personalizes the model's behavior.
 */

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

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // The profile row carries the active org; memberships carry the role.
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_org_id, locale')
    .eq('id', user.id)
    .single();

  if (!profile?.active_org_id) return null;

  const { data: membership } = await supabase
    .from('memberships')
    .select('role, organizations(id, name, plan)')
    .eq('user_id', user.id)
    .eq('org_id', profile.active_org_id)
    .single();

  if (!membership) return null;

  const org = membership.organizations as unknown as {
    id: string;
    name: string;
    plan: SessionContext['plan'];
  };

  return {
    userId: user.id,
    email: user.email ?? null,
    orgId: org.id,
    orgName: org.name,
    role: membership.role as SessionContext['role'],
    plan: org.plan,
    locale: (profile.locale as 'en' | 'es') ?? 'en',
  };
}

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
