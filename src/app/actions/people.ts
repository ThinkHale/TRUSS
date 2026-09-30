'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import { getSessionContext, isAdminRole } from '@/lib/supabase/session';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';

/**
 * A company running its own roster (migration 0021).
 *
 * Authority lives in SQL: org_invite, org_set_member, and org_remove_member
 * each check the caller is an owner or admin of that company, guard the last
 * owner, and write the audit row. The service-role client appears once, to
 * send the Supabase invite email to someone with no account — the one step
 * RLS cannot reach — and only after org_invite has already accepted the
 * invitation under the caller's own authority.
 */

export type PeopleResult =
  | { ok: true; message?: string; results?: InviteOutcome[] }
  | { ok: false; message: string };

export interface InviteOutcome {
  email: string;
  status: 'emailed' | 'invited' | 'already-member' | 'failed';
  message?: string;
}

const MAX_BULK = 200;

async function adminSession() {
  const session = await getSessionContext();
  if (!session) return { error: 'Your session expired. Sign in and try again.' } as const;
  if (!isAdminRole(session.role)) return { error: 'Only owners and admins can manage people.' } as const;
  return { session } as const;
}

function explain(error: { code?: string; message?: string } | null, fallback: string): string {
  if (!error) return fallback;
  if (['42501', '23514', '22023', '23503', '23505'].includes(error.code ?? '')) return error.message ?? fallback;
  return fallback;
}

async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/**
 * Pulls addresses out of whatever was pasted: one per line, comma-separated,
 * or a CSV export with an email column. Anything that is not an address is
 * dropped, and duplicates are collapsed.
 */
function parseEmails(raw: string): string[] {
  const found = raw.toLowerCase().match(/[^\s,;<>"']+@[^\s,;<>"']+\.[a-z]{2,}/g) ?? [];
  return [...new Set(found)];
}

const inviteSchema = z.object({
  emails: z.string().max(40_000),
  role: z.enum(['rep', 'manager', 'admin', 'owner']),
  branchId: z.string().uuid().nullable(),
});

export async function inviteMembers(input: z.input<typeof inviteSchema>): Promise<PeopleResult> {
  const gate = await adminSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check the list and try again.' };

  const emails = parseEmails(parsed.data.emails);
  if (!emails.length) return { ok: false, message: 'No email addresses found in that list.' };
  if (emails.length > MAX_BULK) {
    return { ok: false, message: `That is ${emails.length} addresses. Invite up to ${MAX_BULK} at a time.` };
  }

  const supabase = await supabaseServer();
  const origin = await siteOrigin();
  const results: InviteOutcome[] = [];

  for (const email of emails) {
    const { data, error } = await supabase
      .rpc('org_invite', {
        p_org: gate.session.orgId,
        p_email: email,
        p_role: parsed.data.role,
        p_branch: parsed.data.branchId,
      })
      .maybeSingle<{ invitation_id: string | null; existing_user: boolean; already_member: boolean }>();

    if (error) {
      results.push({ email, status: 'failed', message: explain(error, 'Could not invite.') });
      // Out of seats applies to everyone after this one too.
      if (error.code === '23514') {
        for (const rest of emails.slice(emails.indexOf(email) + 1)) {
          results.push({ email: rest, status: 'failed', message: 'No seats left.' });
        }
        break;
      }
      continue;
    }
    if (data?.already_member) {
      results.push({ email, status: 'already-member' });
      continue;
    }
    if (data?.existing_user) {
      // They accept it themselves, next time they sign in.
      results.push({ email, status: 'invited' });
      continue;
    }

    // No account yet: create one and send the Supabase invite email. The link
    // signs them in and lands them on a page to choose a password; the open
    // invitation then puts them in this company on their first session.
    const { error: mailError } = await supabaseAdmin().auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/auth/set-password`,
      data: { invited_to_org: gate.session.orgId },
    });
    results.push(
      mailError
        ? {
            email,
            status: 'failed',
            message: 'Invitation saved, but the email did not send. Check SMTP in Supabase Auth, then invite again.',
          }
        : { email, status: 'emailed' },
    );
  }

  revalidatePath('/team/people');
  const sent = results.filter((r) => r.status === 'emailed' || r.status === 'invited').length;
  return { ok: true, results, message: `${sent} of ${emails.length} invited.` };
}

export async function cancelInvitation(id: string): Promise<PeopleResult> {
  const gate = await adminSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: 'Unknown invitation.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('org_cancel_invitation', { p_invitation: id });
  if (error) return { ok: false, message: explain(error, 'Could not cancel that invitation.') };
  revalidatePath('/team/people');
  return { ok: true };
}

const memberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['rep', 'manager', 'admin', 'owner']),
  branchId: z.string().uuid().nullable(),
});

export async function setMember(input: z.input<typeof memberSchema>): Promise<PeopleResult> {
  const gate = await adminSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Invalid change.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('org_set_member', {
    p_org: gate.session.orgId,
    p_user: parsed.data.userId,
    p_role: parsed.data.role,
    p_branch: parsed.data.branchId,
  });
  if (error) return { ok: false, message: explain(error, 'Could not save that change.') };
  revalidatePath('/team/people');
  revalidatePath('/team');
  return { ok: true };
}

/** Removes one or many people. Stops at the first refusal and says which. */
export async function removeMembers(userIds: string[]): Promise<PeopleResult> {
  const gate = await adminSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  const ids = z.array(z.string().uuid()).max(MAX_BULK).safeParse(userIds);
  if (!ids.success || !ids.data.length) return { ok: false, message: 'Choose who to remove.' };
  if (ids.data.includes(gate.session.userId)) {
    return { ok: false, message: 'You cannot remove yourself here. Ask another owner or admin.' };
  }

  const supabase = await supabaseServer();
  let removed = 0;
  for (const userId of ids.data) {
    const { error } = await supabase.rpc('org_remove_member', { p_org: gate.session.orgId, p_user: userId });
    if (error) {
      revalidatePath('/team/people');
      return { ok: false, message: `Removed ${removed}. Then: ${explain(error, 'could not remove the next person.')}` };
    }
    removed++;
  }
  revalidatePath('/team/people');
  revalidatePath('/team');
  return { ok: true, message: `Removed ${removed}.` };
}

// ─── Branches ───────────────────────────────────────────────────────────────

export async function createBranch(name: string): Promise<PeopleResult> {
  const gate = await adminSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  const clean = name.trim();
  if (!clean || clean.length > 80) return { ok: false, message: 'A branch name is 1–80 characters.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.from('branches').insert({ org_id: gate.session.orgId, name: clean });
  if (error) {
    return { ok: false, message: error.code === '23505' ? 'There is already a branch with that name.' : 'Could not add that branch.' };
  }
  revalidatePath('/team/people');
  return { ok: true };
}

export async function deleteBranch(id: string): Promise<PeopleResult> {
  const gate = await adminSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: 'Unknown branch.' };
  const supabase = await supabaseServer();
  // Members and cohorts in it keep their place in the company; only the grouping goes.
  const { error } = await supabase.from('branches').delete().eq('id', id).eq('org_id', gate.session.orgId);
  if (error) return { ok: false, message: 'Could not remove that branch.' };
  revalidatePath('/team/people');
  return { ok: true };
}

// ─── The invitee's side ─────────────────────────────────────────────────────

export async function acceptInvitation(id: string): Promise<PeopleResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: 'Unknown invitation.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('accept_invitation', { p_invitation: id });
  if (error) return { ok: false, message: explain(error, 'Could not accept that invitation.') };
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Moves the signed-in person between companies they belong to. */
export async function switchCompany(orgId: string): Promise<PeopleResult> {
  if (!z.string().uuid().safeParse(orgId).success) return { ok: false, message: 'Unknown company.' };
  const session = await getSessionContext();
  if (!session) return { ok: false, message: 'Your session expired.' };
  const supabase = await supabaseServer();
  const { data: member } = await supabase
    .from('memberships')
    .select('org_id')
    .eq('user_id', session.userId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (!member) return { ok: false, message: 'You are not a member of that company.' };
  const { error } = await supabase.from('profiles').update({ active_org_id: orgId }).eq('id', session.userId);
  if (error) return { ok: false, message: 'Could not switch.' };
  revalidatePath('/', 'layout');
  return { ok: true };
}
