'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSessionContext, isAdminRole, isManagerRole } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import {
  MAX_RECORDS_PER_DELIVERY,
  OUTCOME_FIELDS,
  normalizeOutcome,
  parseCsv,
  rowToRecord,
  type NormalizedOutcome,
  type OutcomeField,
} from '@/lib/outcomes/normalize';
import { applyOutcomes, sourceSlug, type ApplySummary } from '@/lib/outcomes/apply';

/**
 * Deal outcomes from a spreadsheet, and the endpoints a CRM posts to.
 *
 * The CSV import runs as the manager doing it: the accounts policies let any
 * member write their company's accounts, and the outcome_events policy lets a
 * manager log a CSV import. Rep emails are resolved with the company
 * directory, which is itself restricted to managers.
 */

export type OutcomesResult =
  | { ok: true; summary?: Pick<ApplySummary, 'created' | 'updated' | 'unchanged' | 'rejected'>; rejectedSample?: string[]; unmatchedReps?: string[]; token?: string }
  | { ok: false; message: string };

/** 2 MB of CSV is tens of thousands of rows; more than one delivery's worth. */
const MAX_CSV_CHARS = 2_000_000;

const importSchema = z.object({
  csv: z.string().min(1).max(MAX_CSV_CHARS),
  source: z.string().max(40),
  map: z.record(z.enum(OUTCOME_FIELDS), z.number().int().min(0).max(200)),
});

export async function importOutcomesCsv(input: {
  csv: string;
  source: string;
  map: Partial<Record<OutcomeField, number>>;
}): Promise<OutcomesResult> {
  const session = await getSessionContext();
  if (!session) return { ok: false, message: 'Your session expired. Sign in and try again.' };
  if (!isManagerRole(session.role)) return { ok: false, message: 'Only managers can import outcomes.' };

  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'That file is too large or empty. Import at most 2 MB at a time.' };
  if (parsed.data.map.external_id == null) {
    return { ok: false, message: 'Choose which column holds the job or deal ID. It is how TRUSS avoids duplicates.' };
  }

  const rows = parseCsv(parsed.data.csv).slice(1);
  if (!rows.length) return { ok: false, message: 'That file has a header row and nothing under it.' };
  if (rows.length > MAX_RECORDS_PER_DELIVERY * 10) {
    return { ok: false, message: `That is ${rows.length} rows. Import up to ${MAX_RECORDS_PER_DELIVERY * 10} at a time.` };
  }

  const records: NormalizedOutcome[] = [];
  const rejected: { externalId: string | null; message: string }[] = [];
  for (const row of rows) {
    const result = normalizeOutcome(rowToRecord(row, parsed.data.map));
    if (result.ok) records.push(result.record);
    else rejected.push({ externalId: result.externalId, message: result.message });
  }

  const supabase = await supabaseServer();
  const { data: directory } = await supabase.rpc('org_member_directory', { p_org: session.orgId });
  const repIds = new Map<string, string>();
  for (const person of (directory ?? []) as { user_id: string; email: string }[]) {
    if (person.email) repIds.set(person.email.toLowerCase(), person.user_id);
  }

  const source = sourceSlug(parsed.data.source, 'csv');
  let summary: ApplySummary = { created: 0, updated: 0, unchanged: 0, rejected: 0, results: [] };
  // Applied in slices so one bad slice cannot hold the rest hostage.
  for (let i = 0; i < Math.max(records.length, 1); i += MAX_RECORDS_PER_DELIVERY) {
    const part = await applyOutcomes(
      supabase,
      { orgId: session.orgId, channel: 'csv', source, repIds },
      records.slice(i, i + MAX_RECORDS_PER_DELIVERY),
      i === 0 ? rejected : [],
    );
    summary = {
      created: summary.created + part.created,
      updated: summary.updated + part.updated,
      unchanged: summary.unchanged + part.unchanged,
      rejected: summary.rejected + part.rejected,
      results: [...summary.results, ...part.results],
    };
  }

  await supabase.rpc('record_org_event', {
    p_org: session.orgId,
    p_action: 'outcomes.import',
    p_detail: { source, created: summary.created, updated: summary.updated, rejected: summary.rejected },
  });

  const unmatchedReps = [
    ...new Set(records.map((r) => r.repEmail).filter((e): e is string => Boolean(e) && !repIds.has(e!))),
  ].slice(0, 20);

  revalidatePath('/team/outcomes');
  revalidatePath('/team');
  revalidatePath('/accounts');
  return {
    ok: true,
    summary: { created: summary.created, updated: summary.updated, unchanged: summary.unchanged, rejected: summary.rejected },
    rejectedSample: summary.results
      .filter((r) => r.result === 'rejected')
      .slice(0, 10)
      .map((r) => `${r.externalId}: ${r.message ?? 'rejected'}`),
    unmatchedReps,
  };
}

const PROVIDERS = ['zapier', 'make', 'jobnimbus', 'acculynx', 'servicetitan', 'leap', 'hubspot', 'salesforce', 'other'] as const;

export async function createIntegration(input: { name: string; provider: string }): Promise<OutcomesResult> {
  const session = await getSessionContext();
  if (!session) return { ok: false, message: 'Your session expired. Sign in and try again.' };
  if (!isAdminRole(session.role)) return { ok: false, message: 'Only owners and admins can connect a system.' };
  const parsed = z
    .object({ name: z.string().trim().min(1).max(80), provider: z.enum(PROVIDERS) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Name the connection and pick where it comes from.' };

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .rpc('org_create_integration', { p_org: session.orgId, p_name: parsed.data.name, p_provider: parsed.data.provider })
    .maybeSingle<{ endpoint_id: string; token: string }>();
  if (error || !data) return { ok: false, message: error?.message ?? 'Could not create the connection.' };
  revalidatePath('/team/outcomes');
  return { ok: true, token: data.token };
}

export async function revokeIntegration(id: string): Promise<OutcomesResult> {
  const session = await getSessionContext();
  if (!session) return { ok: false, message: 'Your session expired. Sign in and try again.' };
  if (!isAdminRole(session.role)) return { ok: false, message: 'Only owners and admins can disconnect a system.' };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: 'Unknown connection.' };
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('org_revoke_integration', { p_endpoint: id });
  if (error) return { ok: false, message: 'Could not disconnect it.' };
  revalidatePath('/team/outcomes');
  return { ok: true };
}
