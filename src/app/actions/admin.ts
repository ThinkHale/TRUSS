'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseServer, supabaseAdmin } from '@/lib/supabase/server';
import { isPlatformAdmin } from '@/lib/auth/platform';
import { PLAN_IDS } from '@/lib/billing/plans';

/**
 * Operator actions.
 *
 * Authority is checked twice on purpose. The database functions these call are
 * SECURITY DEFINER and each begins with require_platform_admin(), so the
 * database is the real gate and a mistake here cannot open it. The check in
 * `guard()` exists so a non-operator gets a sentence they can read instead of a
 * Postgres error string, and so a mis-wired form fails before it reaches the
 * network.
 *
 * Every one of these returns a result rather than throwing: Next.js replaces
 * thrown server action messages with an opaque digest in production, so a throw
 * would reach the operator as React's internal error text.
 */

export type ActionResult = { ok: true; id?: string } | { ok: false; message: string };

async function guard(): Promise<string | null> {
  return (await isPlatformAdmin()) ? null : 'Platform administration is restricted.';
}

/** Turns a Postgres error into something an operator can act on. */
function explain(error: { code?: string; message?: string } | null, fallback: string): string {
  if (!error) return fallback;
  if (error.code === '42501') return 'Platform administration is restricted.';
  if (error.code === '23514') return error.message ?? fallback;
  if (error.code === '23503') return error.message ?? fallback;
  if (error.code === '22023') return error.message ?? fallback;
  return fallback;
}

// ─── Organizations ──────────────────────────────────────────────────────────

const createOrgSchema = z.object({
  name: z.string().min(1).max(200),
  plan: z.enum(PLAN_IDS),
  seatLimit: z.number().int().min(1).max(100000).nullable(),
  trades: z.array(z.string().max(60)).max(20),
  serviceArea: z.array(z.string().max(120)).max(50),
  playbookRules: z.array(z.string().max(500)).max(50),
  defaultLocale: z.enum(['en', 'es']),
});

export async function adminCreateOrganization(
  input: z.input<typeof createOrgSchema>,
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };

  const parsed = createOrgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check the company name and try again.' };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('admin_create_organization', {
    p_name: parsed.data.name,
    p_plan: parsed.data.plan,
    p_seat_limit: parsed.data.seatLimit,
    p_trades: parsed.data.trades,
    p_service_area: parsed.data.serviceArea,
    p_playbook_rules: parsed.data.playbookRules,
    p_default_locale: parsed.data.defaultLocale,
  });

  if (error) return { ok: false, message: explain(error, 'Could not create the organization.') };

  revalidatePath('/admin/orgs');
  return { ok: true, id: data as string };
}

const setPlanSchema = z.object({
  orgId: z.string().uuid(),
  plan: z.enum(PLAN_IDS),
  seatLimit: z.number().int().min(1).max(100000).nullable(),
});

export async function adminSetOrgPlan(input: z.input<typeof setPlanSchema>): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };

  const parsed = setPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Invalid plan change.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('admin_set_org_plan', {
    p_org: parsed.data.orgId,
    p_plan: parsed.data.plan,
    p_seat_limit: parsed.data.seatLimit,
  });

  if (error) return { ok: false, message: explain(error, 'Could not change the plan.') };

  revalidatePath(`/admin/orgs/${parsed.data.orgId}`);
  revalidatePath('/admin/orgs');
  return { ok: true };
}

const overrideSchema = z.object({
  orgId: z.string().uuid(),
  plan: z.enum(PLAN_IDS).nullable(),
  expiresAt: z.string().datetime().nullable(),
  reason: z.string().max(300).nullable(),
});

/**
 * Grants or clears access independent of billing.
 *
 * This is the "give them everything regardless of subscription" control. It
 * writes plan_override, which effective_plan() prefers over the billed plan and
 * within_quota() reads — so one write reaches Coach, practice, and research at
 * once, and Stripe never fights it.
 */
export async function adminSetOverride(
  input: z.input<typeof overrideSchema>,
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };

  const parsed = overrideSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Invalid grant.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('admin_set_override', {
    p_org: parsed.data.orgId,
    p_plan: parsed.data.plan,
    p_expires_at: parsed.data.expiresAt,
    p_reason: parsed.data.reason,
  });

  if (error) return { ok: false, message: explain(error, 'Could not update access.') };

  revalidatePath(`/admin/orgs/${parsed.data.orgId}`);
  revalidatePath('/admin/orgs');
  return { ok: true };
}

const updateOrgSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().max(60).nullable(),
});

/** Renames a company, and optionally re-slugs it. */
export async function adminUpdateOrganization(
  input: z.input<typeof updateOrgSchema>,
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };

  const parsed = updateOrgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check the name and try again.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('admin_update_organization', {
    p_org: parsed.data.orgId,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
  });

  if (error) return { ok: false, message: explain(error, 'Could not rename the company.') };

  revalidatePath(`/admin/orgs/${parsed.data.orgId}`);
  revalidatePath('/admin/orgs');
  return { ok: true };
}

const deleteOrgSchema = z.object({
  orgId: z.string().uuid(),
  confirmName: z.string().min(1).max(200),
});

/**
 * Deletes a tenant and everything in it.
 *
 * Both guards live in SQL — the retyped name and the refusal to delete a
 * company with live billing — so this wrapper cannot weaken them. There is no
 * undo; every tenant table cascades.
 */
export async function adminDeleteOrganization(
  input: z.input<typeof deleteOrgSchema>,
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };

  const parsed = deleteOrgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Type the company name to confirm.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('admin_delete_organization', {
    p_org: parsed.data.orgId,
    p_confirm_name: parsed.data.confirmName,
  });

  if (error) return { ok: false, message: explain(error, 'Could not delete the company.') };

  revalidatePath('/admin/orgs');
  return { ok: true };
}

const activeOrgSchema = z.object({
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
});

/** Moves which company a person lands in when they sign in. */
export async function adminSetActiveOrg(
  input: z.input<typeof activeOrgSchema>,
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };

  const parsed = activeOrgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('admin_set_active_org', {
    p_user: parsed.data.userId,
    p_org: parsed.data.orgId,
  });

  if (error) return { ok: false, message: explain(error, 'Could not move them.') };

  revalidatePath(`/admin/users/${parsed.data.userId}`);
  return { ok: true };
}

const deleteUserSchema = z.object({
  userId: z.string().uuid(),
  confirmEmail: z.string().min(1).max(320),
});

/**
 * Deletes an account outright.
 *
 * Needs the Auth admin API — auth.users is not something SQL should be
 * cascading by hand. profiles and memberships cascade from it. The typed-email
 * confirmation is checked here rather than in SQL because the delete itself is
 * not a database call, so there is no SECURITY DEFINER function to hold it.
 */
export async function adminDeleteUser(
  input: z.input<typeof deleteUserSchema>,
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };

  const parsed = deleteUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Type the email address to confirm.' };

  const supabase = await supabaseServer();
  const { data: rows, error: lookupError } = await supabase.rpc('admin_user_detail', {
    p_user: parsed.data.userId,
  });
  if (lookupError) return { ok: false, message: explain(lookupError, 'Could not find that account.') };

  const user = (rows as { email: string; is_operator: boolean }[] | null)?.[0];
  if (!user) return { ok: false, message: 'No such account.' };

  if (user.email.toLowerCase() !== parsed.data.confirmEmail.trim().toLowerCase()) {
    return { ok: false, message: 'Type the email address exactly to confirm.' };
  }
  // Revoking operator access is a deliberate, audited step. Deleting the row
  // out from under it would skip that record entirely.
  if (user.is_operator) {
    return { ok: false, message: 'Revoke their operator access first.' };
  }

  const { error } = await supabaseAdmin().auth.admin.deleteUser(parsed.data.userId);
  if (error) {
    console.error('admin delete user failed', { message: error.message });
    return { ok: false, message: error.message };
  }

  // Written after the fact: the audit row references auth.users with
  // ON DELETE SET NULL, so target_user would be blanked if logged before.
  await supabase.rpc('log_admin_action', {
    p_action: 'user.delete',
    p_target_org: null,
    p_target_user: null,
    p_detail: { user_id: parsed.data.userId, email: user.email },
  });

  revalidatePath('/admin/users');
  return { ok: true };
}

const settingsSchema = z.object({
  orgId: z.string().uuid(),
  trades: z.array(z.string().max(60)).max(20),
  serviceArea: z.array(z.string().max(120)).max(50),
  playbookRules: z.array(z.string().max(500)).max(50),
  brandName: z.string().max(120).nullable(),
  brandLogoUrl: z.string().url().max(500).nullable().or(z.literal('').transform(() => null)),
  brandColor: z.string().max(32).nullable(),
  defaultLocale: z.enum(['en', 'es']),
});

/**
 * The Enterprise customization surface: trades, service area, playbook rules,
 * and white-label branding. Written through the caller's own client, because
 * org_settings_write already passes for a platform admin via is_org_admin().
 */
export async function adminUpdateOrgSettings(
  input: z.input<typeof settingsSchema>,
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check the settings and try again.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.from('org_settings').upsert(
    {
      org_id: parsed.data.orgId,
      trades: parsed.data.trades,
      service_area: parsed.data.serviceArea,
      playbook_rules: parsed.data.playbookRules,
      brand_name: parsed.data.brandName,
      brand_logo_url: parsed.data.brandLogoUrl,
      brand_color: parsed.data.brandColor,
      default_locale: parsed.data.defaultLocale,
    },
    { onConflict: 'org_id' },
  );

  if (error) return { ok: false, message: explain(error, 'Could not save the settings.') };

  revalidatePath(`/admin/orgs/${parsed.data.orgId}`);
  return { ok: true };
}

// ─── People ─────────────────────────────────────────────────────────────────

const memberSchema = z.object({
  orgId: z.string().uuid(),
  email: z.string().email().max(320),
  role: z.enum(['owner', 'admin', 'manager', 'rep']),
});

/**
 * Adds an existing user to an org, or changes the role they already hold.
 *
 * The lookup goes through admin_find_user_by_email() rather than the auth admin
 * API, which keeps the service-role key out of the console entirely.
 */
export async function adminAddMember(input: z.input<typeof memberSchema>): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };

  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check the email address and try again.' };

  const supabase = await supabaseServer();

  const { data: userId, error: lookupError } = await supabase.rpc('admin_find_user_by_email', {
    p_email: parsed.data.email,
  });
  if (lookupError) return { ok: false, message: explain(lookupError, 'Could not look up that user.') };
  if (!userId) {
    return {
      ok: false,
      message: 'No account with that email yet. Invite them first, or have them sign up.',
    };
  }

  const { error } = await supabase.rpc('admin_upsert_membership', {
    p_org: parsed.data.orgId,
    p_user: userId as string,
    p_role: parsed.data.role,
  });

  if (error) return { ok: false, message: explain(error, 'Could not add that person.') };

  revalidatePath(`/admin/orgs/${parsed.data.orgId}`);
  return { ok: true };
}

const removeSchema = z.object({ orgId: z.string().uuid(), userId: z.string().uuid() });

export async function adminRemoveMember(
  input: z.input<typeof removeSchema>,
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };

  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('admin_remove_membership', {
    p_org: parsed.data.orgId,
    p_user: parsed.data.userId,
  });

  if (error) return { ok: false, message: explain(error, 'Could not remove that person.') };

  revalidatePath(`/admin/orgs/${parsed.data.orgId}`);
  return { ok: true };
}

const inviteSchema = z.object({
  email: z.string().email().max(320),
  orgId: z.string().uuid().nullable(),
  role: z.enum(['owner', 'admin', 'manager', 'rep']),
});

/**
 * Creates an account for someone who has never signed up, and optionally drops
 * them straight into an org.
 *
 * This is the one operator action that needs the service-role key: creating an
 * auth user is not something SQL can do safely. It depends on SMTP being
 * configured in Supabase Auth — without it the invite email never sends, and
 * the error says so rather than reporting a success nobody receives.
 */
export async function adminInviteUser(input: z.input<typeof inviteSchema>): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };

  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check the email address and try again.' };

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email);

  if (error || !data?.user) {
    console.error('admin invite failed', { message: error?.message });
    return {
      ok: false,
      message:
        error?.message ??
        'Could not send the invite. Check that SMTP is configured in Supabase Auth.',
    };
  }

  if (parsed.data.orgId) {
    const supabase = await supabaseServer();
    const { error: membershipError } = await supabase.rpc('admin_upsert_membership', {
      p_org: parsed.data.orgId,
      p_user: data.user.id,
      p_role: parsed.data.role,
    });
    if (membershipError) {
      return {
        ok: false,
        message: 'The invite was sent, but adding them to the company failed.',
      };
    }
    revalidatePath(`/admin/orgs/${parsed.data.orgId}`);
  }

  revalidatePath('/admin/users');
  return { ok: true, id: data.user.id };
}

const operatorSchema = z.object({
  userId: z.string().uuid(),
  isAdmin: z.boolean(),
  note: z.string().max(200).nullable(),
});

export async function adminSetPlatformAdmin(
  input: z.input<typeof operatorSchema>,
): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return { ok: false, message: denied };

  const parsed = operatorSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('admin_set_platform_admin', {
    p_user: parsed.data.userId,
    p_admin: parsed.data.isAdmin,
    p_note: parsed.data.note,
  });

  if (error) return { ok: false, message: explain(error, 'Could not change operator access.') };

  revalidatePath('/admin/users');
  return { ok: true };
}
