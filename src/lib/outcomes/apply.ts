/**
 * Writing normalized outcomes into accounts. Server only.
 *
 * Shared by the webhook (service-role client, pinned to the org its token
 * belongs to) and the CSV import (the manager's own client, so the accounts
 * policies apply). Either way every write names the org explicitly.
 *
 * Matching is on (org, external_source, external_id), the unique key 0017
 * added, so a CRM that sends the same job ten times updates one account.
 * Fields the record leaves blank are left alone on an existing account —
 * a status-only webhook must not wipe the address a rep typed in.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedOutcome } from './normalize';

export interface ApplyContext {
  orgId: string;
  channel: 'webhook' | 'csv';
  /** Lowercase slug for where the records came from, e.g. "jobnimbus". */
  source: string;
  endpointId?: string | null;
  /** Rep email → user id, already restricted to members of this org. */
  repIds: Map<string, string>;
}

export interface ApplySummary {
  created: number;
  updated: number;
  unchanged: number;
  rejected: number;
  results: { externalId: string; result: 'created' | 'updated' | 'unchanged' | 'rejected'; message?: string }[];
}

export function sourceSlug(raw: string | null | undefined, fallback: string): string {
  const slug = (raw ?? '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return slug || fallback;
}

export async function applyOutcomes(
  supabase: SupabaseClient,
  ctx: ApplyContext,
  records: NormalizedOutcome[],
  rejectedUpfront: { externalId: string | null; message: string }[] = [],
): Promise<ApplySummary> {
  const summary: ApplySummary = { created: 0, updated: 0, unchanged: 0, rejected: 0, results: [] };

  for (const r of rejectedUpfront) {
    summary.rejected++;
    summary.results.push({ externalId: r.externalId ?? '(missing id)', result: 'rejected', message: r.message });
  }

  // Later rows for the same job win, the way a CRM's own history would.
  const byId = new Map<string, NormalizedOutcome>();
  for (const record of records) byId.set(record.externalId, record);
  const unique = [...byId.values()];

  const existing = new Map<string, { id: string; name: string }>();
  for (let i = 0; i < unique.length; i += 200) {
    const ids = unique.slice(i, i + 200).map((r) => r.externalId);
    const { data } = await supabase
      .from('accounts')
      .select('id, name, external_id')
      .eq('org_id', ctx.orgId)
      .eq('external_source', ctx.source)
      .in('external_id', ids);
    for (const row of data ?? []) existing.set(row.external_id as string, { id: row.id, name: row.name });
  }

  const inserts: Record<string, unknown>[] = [];
  const insertIds: string[] = [];

  for (const r of unique) {
    const ownerId = r.repEmail ? ctx.repIds.get(r.repEmail) ?? null : null;
    const patch: Record<string, unknown> = {};
    if (r.name) patch.name = r.name;
    if (r.address) patch.address = r.address;
    if (r.city) patch.city = r.city;
    if (r.state) patch.state = r.state;
    if (r.postalCode) patch.postal_code = r.postalCode;
    if (r.type) patch.type = r.type;
    if (r.status) patch.status = r.status;
    if (r.contractValueCents != null) patch.contract_value_cents = r.contractValueCents;
    if (r.signedAt) patch.signed_at = r.signedAt;
    if (r.lostAt) patch.lost_at = r.lostAt;
    if (r.lostReason) patch.lost_reason = r.lostReason;
    if (r.leadSource) patch.lead_source = r.leadSource;
    if (ownerId) patch.owner_user_id = ownerId;

    const found = existing.get(r.externalId);
    if (found) {
      if (Object.keys(patch).length === 0) {
        summary.unchanged++;
        summary.results.push({ externalId: r.externalId, result: 'unchanged' });
        continue;
      }
      const { error } = await supabase
        .from('accounts')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', found.id)
        .eq('org_id', ctx.orgId);
      if (error) {
        summary.rejected++;
        summary.results.push({ externalId: r.externalId, result: 'rejected', message: 'Could not update that account.' });
      } else {
        summary.updated++;
        summary.results.push({ externalId: r.externalId, result: 'updated' });
      }
      continue;
    }

    if (!r.name) {
      summary.rejected++;
      summary.results.push({
        externalId: r.externalId,
        result: 'rejected',
        message: 'A new job needs a name. Map the customer or job name column.',
      });
      continue;
    }

    inserts.push({
      org_id: ctx.orgId,
      external_source: ctx.source,
      external_id: r.externalId,
      ...patch,
    });
    insertIds.push(r.externalId);
  }

  for (let i = 0; i < inserts.length; i += 200) {
    const batch = inserts.slice(i, i + 200);
    const ids = insertIds.slice(i, i + 200);
    const { error } = await supabase.from('accounts').insert(batch);
    for (const externalId of ids) {
      if (error) {
        summary.rejected++;
        summary.results.push({ externalId, result: 'rejected', message: 'Could not create that account.' });
      } else {
        summary.created++;
        summary.results.push({ externalId, result: 'created' });
      }
    }
  }

  // One log row per record, so a manager can see what happened to each job.
  const log = summary.results.map((r) => ({
    org_id: ctx.orgId,
    endpoint_id: ctx.endpointId ?? null,
    channel: ctx.channel,
    external_source: ctx.source,
    external_id: r.externalId.slice(0, 200),
    result: r.result,
    message: r.message ?? null,
  }));
  for (let i = 0; i < log.length; i += 500) {
    await supabase.from('outcome_events').insert(log.slice(i, i + 500));
  }

  return summary;
}
