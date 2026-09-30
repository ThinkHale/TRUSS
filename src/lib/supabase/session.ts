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
  /** 'portfolio' for a holding company; 'company' for an operating tenant. */
  orgKind: 'company' | 'portfolio';
  /** The portfolio this company belongs to, when it belongs to one. */
  parentOrgId: string | null;
}

/** True for the roles that manage people: the team dashboard, cohorts, knowledge. */
export function isManagerRole(role: SessionContext['role']): boolean {
  return role === 'owner' || role === 'admin' || role === 'manager';
}

/** True for the roles that administer the company: roster, integrations, exports. */
export function isAdminRole(role: SessionContext['role']): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Whether this sign-in satisfies the company's SSO requirement.
 *
 * A company that signs in through its identity provider can mark its domain
 * "SSO required" (org_domains, migration 0021). A password session for an
 * address at that domain is then refused everywhere, because the whole point
 * is that deprovisioning someone in the identity provider ends their access.
 * Supabase stamps the authentication method into the token's `amr` claim;
 * SAML sign-ins carry an `sso/saml` entry.
 *
 * Memoized per request; one small RPC, run alongside the session queries.
 */
export const ssoStatus = cache(async (): Promise<{ required: boolean; satisfied: boolean }> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as { email?: string; amr?: { method?: string }[] } | undefined;
  if (!claims?.email) return { required: false, satisfied: true };

  const { data: required } = await supabase.rpc('sso_required_for', { p_email: claims.email });
  if (!required) return { required: false, satisfied: true };

  const viaSso = (claims.amr ?? []).some((entry) => entry.method?.startsWith('sso'));
  return { required: true, satisfied: viaSso };
});

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
  const ORG_COLUMNS = 'id, name, plan, plan_override, override_expires_at, override_reason';
  const query = (orgColumns: string) =>
    supabase
      .from('memberships')
      .select(`org_id, role, created_at, organizations(${orgColumns})` as 'org_id')
      .eq('user_id', user.id)
      // Oldest first, so the fallback below is deterministic rather than
      // whatever order the planner happened to return.
      .order('created_at', { ascending: true })
      .overrideTypes<{ org_id: string; role: string; created_at: string; organizations: unknown }[], { merge: false }>();

  // kind and parent_org_id arrive with migration 0018. If this code reaches a
  // database that has not had it yet, an undefined-column error must not read
  // as "no memberships" — that sends every user to onboarding.
  const loadMemberships = async () => {
    const result = await query(`${ORG_COLUMNS}, kind, parent_org_id`);
    return result.error?.code === '42703' ? query(ORG_COLUMNS) : result;
  };

  const [{ data: profile }, membershipResult, { data: operator }, sso] = await Promise.all([
    supabase.from('profiles').select('active_org_id, locale').eq('id', user.id).single(),
    loadMemberships(),
    supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    ssoStatus(),
  ]);

  // A password session for a domain that requires SSO is not a session. The
  // sign-in page explains; onboarding sends them there rather than offering
  // to build a company.
  if (!sso.satisfied) return null;

  let memberships = membershipResult.data;

  // Nobody belongs to nothing if there is somewhere they were meant to land:
  // an invitation that created their account, or their company's email
  // domain. Both are checked in SQL against their own confirmed address, so
  // this cannot place anyone somewhere they were not invited or entitled to be.
  if (!memberships?.length) {
    const { data: accepted } = await supabase.rpc('accept_invitations_for_new_account');
    const joined = accepted ? null : (await supabase.rpc('join_by_email_domain')).data;
    if (accepted || joined) memberships = (await loadMemberships()).data;
  }

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
    kind: 'company' | 'portfolio' | null;
    parent_org_id: string | null;
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
    // Absent until migration 0018 is applied; a flat tenant is a company.
    orgKind: org.kind ?? 'company',
    parentOrgId: org.parent_org_id ?? null,
  };
});

/**
 * Builds the org context that personalizes prompts. For Enterprise tenants this
 * is where their playbook, trades, and service area come from.
 */
export async function loadOrgContext(session: SessionContext): Promise<OrgContext> {
  const supabase = await supabaseServer();

  // A company in a portfolio is held to the portfolio's rules as well as its
  // own. RLS lets its members read the portfolio's settings (0018); the rules
  // are labelled with where they came from, so a rep can tell the house
  // standard from their own company's.
  const [{ data: settings }, parent] = await Promise.all([
    supabase
      .from('org_settings')
      .select('trades, service_area, playbook_rules')
      .eq('org_id', session.orgId)
      .maybeSingle(),
    session.parentOrgId
      ? Promise.all([
          supabase.rpc('org_parent_summary', { p_org: session.orgId }).maybeSingle<{ name: string }>(),
          supabase
            .from('org_settings')
            .select('playbook_rules')
            .eq('org_id', session.parentOrgId)
            .maybeSingle(),
        ])
      : Promise.resolve(null),
  ]);

  const inherited = parent
    ? (parent[1].data?.playbook_rules ?? []).map(
        (rule: string) => `${rule} (${parent[0].data?.name ?? 'Portfolio'} standard)`,
      )
    : [];
  const rules = [...inherited, ...(settings?.playbook_rules ?? [])];

  return {
    companyName: session.orgName,
    trades: settings?.trades ?? undefined,
    serviceArea: settings?.service_area ?? undefined,
    playbookRules: rules.length ? rules : undefined,
    locale: session.locale,
  };
}
