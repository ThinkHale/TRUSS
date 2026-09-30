'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSessionContext, isManagerRole } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * The eight-week program (migration 0020).
 *
 * Cohorts and enrolment are ordinary rows the cohorts policies let managers
 * write. Everything that decides a credential — submissions, weekly checks,
 * issuing and revoking — goes through the SQL functions, which re-check
 * authority and the criteria themselves.
 */

export type ProgramResult = { ok: true; id?: string; code?: string } | { ok: false; message: string };

function explain(error: { code?: string; message?: string } | null, fallback: string): string {
  if (!error) return fallback;
  if (['42501', '23514', '22023', '23503', '23505'].includes(error.code ?? '')) return error.message ?? fallback;
  return fallback;
}

async function managerSession() {
  const session = await getSessionContext();
  if (!session) return { error: 'Your session expired. Sign in and try again.' } as const;
  if (!isManagerRole(session.role)) return { error: 'Only managers can run a cohort.' } as const;
  return { session } as const;
}

const cohortSchema = z.object({
  name: z.string().trim().min(1).max(120),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branchId: z.string().uuid().nullable(),
  memberIds: z.array(z.string().uuid()).max(500),
});

export async function createCohort(input: z.input<typeof cohortSchema>): Promise<ProgramResult> {
  const gate = await managerSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  const parsed = cohortSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Give the cohort a name and a start date.' };

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('cohorts')
    .insert({
      org_id: gate.session.orgId,
      name: parsed.data.name,
      starts_on: parsed.data.startsOn,
      branch_id: parsed.data.branchId,
      created_by: gate.session.userId,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false, message: 'Could not create the cohort.' };

  if (parsed.data.memberIds.length) {
    const { error: enrolError } = await supabase.from('cohort_members').insert(
      parsed.data.memberIds.map((userId) => ({ cohort_id: data.id, org_id: gate.session.orgId, user_id: userId })),
    );
    if (enrolError) return { ok: false, message: 'The cohort was created, but enrolling people failed. Add them on its page.' };
  }

  revalidatePath('/team/program');
  return { ok: true, id: data.id };
}

export async function setCohortMembers(input: {
  cohortId: string;
  add: string[];
  remove: string[];
}): Promise<ProgramResult> {
  const gate = await managerSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  const parsed = z
    .object({ cohortId: z.string().uuid(), add: z.array(z.string().uuid()).max(500), remove: z.array(z.string().uuid()).max(500) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Invalid change.' };

  const supabase = await supabaseServer();
  if (parsed.data.add.length) {
    const { error } = await supabase.from('cohort_members').upsert(
      parsed.data.add.map((userId) => ({ cohort_id: parsed.data.cohortId, org_id: gate.session.orgId, user_id: userId })),
      { onConflict: 'cohort_id,user_id', ignoreDuplicates: true },
    );
    if (error) return { ok: false, message: 'Could not enroll those people.' };
  }
  if (parsed.data.remove.length) {
    const { error } = await supabase
      .from('cohort_members')
      .delete()
      .eq('cohort_id', parsed.data.cohortId)
      .eq('org_id', gate.session.orgId)
      .in('user_id', parsed.data.remove);
    if (error) return { ok: false, message: 'Could not remove those people.' };
  }
  revalidatePath(`/team/program/${parsed.data.cohortId}`);
  return { ok: true };
}

export async function archiveCohort(cohortId: string, archived: boolean): Promise<ProgramResult> {
  const gate = await managerSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  if (!z.string().uuid().safeParse(cohortId).success) return { ok: false, message: 'Unknown cohort.' };
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('cohorts')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', cohortId)
    .eq('org_id', gate.session.orgId);
  if (error) return { ok: false, message: 'Could not update the cohort.' };
  revalidatePath('/team/program');
  revalidatePath(`/team/program/${cohortId}`);
  return { ok: true };
}

export async function recordManagerCheck(input: {
  cohortId: string;
  userId: string;
  week: number;
  note: string | null;
  clear?: boolean;
}): Promise<ProgramResult> {
  const gate = await managerSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  const parsed = z
    .object({
      cohortId: z.string().uuid(),
      userId: z.string().uuid(),
      week: z.number().int().min(1).max(8),
      note: z.string().max(4000).nullable(),
      clear: z.boolean().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Invalid check.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('record_manager_check', {
    p_cohort: parsed.data.cohortId,
    p_user: parsed.data.userId,
    p_week: parsed.data.week,
    p_note: parsed.data.note,
    p_clear: parsed.data.clear ?? false,
  });
  if (error) return { ok: false, message: explain(error, 'Could not record that check.') };
  revalidatePath(`/team/program/${parsed.data.cohortId}`);
  return { ok: true };
}

export async function issueCertification(input: {
  cohortId: string;
  userId: string;
  routingAttested: boolean;
  evidenceAttested: boolean;
}): Promise<ProgramResult> {
  const gate = await managerSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  const parsed = z
    .object({
      cohortId: z.string().uuid(),
      userId: z.string().uuid(),
      routingAttested: z.boolean(),
      evidenceAttested: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Invalid request.' };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('issue_certification', {
    p_cohort: parsed.data.cohortId,
    p_user: parsed.data.userId,
    p_routing_attested: parsed.data.routingAttested,
    p_evidence_attested: parsed.data.evidenceAttested,
  });
  if (error) return { ok: false, message: explain(error, 'Could not issue the credential.') };
  revalidatePath(`/team/program/${parsed.data.cohortId}`);
  return { ok: true, code: data as string };
}

export async function revokeCertification(id: string, reason: string): Promise<ProgramResult> {
  const gate = await managerSession();
  if ('error' in gate) return { ok: false, message: gate.error! };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: 'Unknown credential.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('revoke_certification', { p_certification: id, p_reason: reason });
  if (error) return { ok: false, message: explain(error, 'Could not revoke the credential.') };
  revalidatePath('/team/program');
  return { ok: true };
}

// ─── The rep's side ─────────────────────────────────────────────────────────

export async function submitModuleWork(input: {
  cohortId: string;
  week: number;
  kind: 'prework' | 'field';
  text: string;
}): Promise<ProgramResult> {
  const parsed = z
    .object({
      cohortId: z.string().uuid(),
      week: z.number().int().min(1).max(8),
      kind: z.enum(['prework', 'field']),
      text: z.string().max(8000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Keep it under 8,000 characters.' };

  const session = await getSessionContext();
  if (!session) return { ok: false, message: 'Your session expired. Sign in and try again.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('submit_module_work', {
    p_cohort: parsed.data.cohortId,
    p_week: parsed.data.week,
    p_kind: parsed.data.kind,
    p_text: parsed.data.text,
  });
  if (error) return { ok: false, message: explain(error, 'Could not save that.') };
  revalidatePath('/program');
  return { ok: true };
}
