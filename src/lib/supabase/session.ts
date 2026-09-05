/**
 * Resolves the signed-in user and their active organization.
 *
 * Every AI route calls this before doing anything, both to authenticate and to
 * load the enterprise context that personalizes the model's behavior.
 */

import { cache } from 'react';
import { supabaseServer } from './server';
import { effectivePlan, type PlanId } from '@/lib/billing/plans';
import type { OrgContext } from '@/lib/ai/prompts';

export interface SessionContext {
  userId: string;
  email: string | null;
  orgId: string;
  orgName: string;
  role: 'owner' | 'admin' | 'manager' | 'rep';
  /**
   * The plan actually in force, operator override included. Mirrors
   * effective_plan() in migration 0008, which is what within_quota() enforces,
   * so what a rep is told matches what they are allowed to do.
   */
  plan: PlanId;
  /** What billing says, before any override. */
  billedPlan: PlanId;
  planOverride: PlanId | null;
  overrideExpiresAt: string | null;
  overrideReason: string | null;
  locale: 'en' | 'es';
  /** Operator of TRUSS itself. Gates the admin console entry point. */
  isPlatformAdmin: boolean;
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

  // The profile row carries the active org; memberships carry the role; the
  // platform_admins row says whether this user operates TRUSS itself. All three
  // are keyed off the user alone, so they go out together rather than in
  // sequence — a rep belongs to one org in practice, so this stays small, and
  // the operator check costs no extra round trip.
  const [{ data: profile }, { data: memberships }, { data: operator }] = await Promise.all([
    supabase.from('profiles').select('active_org_id, locale').eq('id', user.id).single(),
    supabase
      .from('memberships')
      .select(
        'org_id, role, created_at, organizations(id, name, plan, plan_override, override_expires_at, override_reason)',
      )
      .eq('user_id', user.id)
      // Oldest first, so the fallback below is deterministic rather than
      // whatever order the planner happened to return.
      .order('created_at', { ascending: true }),
    supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
  ]);

  // active_org_id is a pointer, not the source of truth — membership is. The
  // pointer gets blanked whenever the org it named is deleted, because the
  // foreign key is ON DELETE SET NULL, and it can also name an org the user has
  // since been removed from. Treating either case as "no organization" sent
  // people to onboarding while they held a perfectly good membership, and
  // onboarding then built them a second company.
  //
  // So: prefer the org the pointer names, fall back to any membership they
  // hold, and only give up when there is genuinely nothing to fall back to.
  const membership =
    memberships?.find((m) => m.org_id === profile?.active_org_id) ?? memberships?.[0];
  if (!membership) return null;

  // Repair the pointer so the next request takes the fast path, and so the rest
  // of the app — which reads profiles.active_org_id directly — agrees with the
  // org this session resolved to.
  if (profile?.active_org_id !== membership.org_id) {
    await supabase
      .from('profiles')
      .update({ active_org_id: membership.org_id })
      .eq('id', user.id);
  }

  const org = membership.organizations as unknown as {
    id: string;
    name: string;
    plan: PlanId;
    plan_override: PlanId | null;
    override_expires_at: string | null;
    override_reason: string | null;
  };

  const planState = {
    plan: org.plan,
    planOverride: org.plan_override,
    overrideExpiresAt: org.override_expires_at,
  };

  return {
    userId: user.id,
    email: user.email,
    orgId: org.id,
    orgName: org.name,
    role: membership.role as SessionContext['role'],
    plan: effectivePlan(planState),
    billedPlan: org.plan,
    planOverride: org.plan_override,
    overrideExpiresAt: org.override_expires_at,
    overrideReason: org.override_reason,
    locale: (profile?.locale as 'en' | 'es') ?? 'en',
    isPlatformAdmin: Boolean(operator),
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
