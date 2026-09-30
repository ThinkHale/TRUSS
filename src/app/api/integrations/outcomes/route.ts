/**
 * Inbound outcomes from a company's CRM.
 *
 *   POST /api/integrations/outcomes
 *   Authorization: Bearer trs_…
 *   { "records": [ { "external_id": "J-1042", "status": "Sold", "contract_value": "18450", … } ] }
 *
 * A single record object, or a bare array, is accepted too — Zapier and Make
 * send one record per run by default. See docs/INTEGRATIONS.md for the field
 * list and per-CRM recipes.
 *
 * There is no user session here. The token is the credential: it resolves to
 * exactly one company through integration_for_token(), which compares SHA-256
 * hashes and refuses revoked endpoints, and every write below is pinned to that
 * company. The service-role client is used because the caller is a machine,
 * not a member — the same reason the Stripe webhook uses it.
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  MAX_RECORDS_PER_DELIVERY,
  normalizeOutcome,
  type NormalizedOutcome,
} from '@/lib/outcomes/normalize';
import { applyOutcomes, sourceSlug } from '@/lib/outcomes/apply';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Enough for 500 generous records; anything bigger is not a CRM webhook. */
const MAX_BODY_BYTES = 1_000_000;

export async function POST(req: NextRequest) {
  const token = bearer(req);
  if (!token) {
    return Response.json({ error: 'Send your TRUSS token as "Authorization: Bearer trs_…".' }, { status: 401 });
  }

  const length = Number(req.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) {
    return Response.json({ error: 'That delivery is too large. Send at most 500 records at a time.' }, { status: 413 });
  }

  const admin = supabaseAdmin();
  const { data: endpoints, error: lookupError } = await admin.rpc('integration_for_token', { p_token: token });
  if (lookupError) {
    console.error('integration lookup failed', { code: lookupError.code });
    return Response.json({ error: 'Could not check that token. Try again.' }, { status: 503 });
  }
  const endpoint = (endpoints as { endpoint_id: string; org_id: string; provider: string }[] | null)?.[0];
  if (!endpoint) {
    // Same answer for unknown and revoked, so a probe learns nothing.
    return Response.json({ error: 'That token is not valid.' }, { status: 401 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: 'That delivery is too large. Send at most 500 records at a time.' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'The body must be JSON.' }, { status: 400 });
  }

  const list: unknown[] = Array.isArray(body)
    ? body
    : body && typeof body === 'object' && Array.isArray((body as { records?: unknown }).records)
      ? (body as { records: unknown[] }).records
      : [body];

  if (!list.length) return Response.json({ error: 'No records.' }, { status: 400 });
  if (list.length > MAX_RECORDS_PER_DELIVERY) {
    return Response.json({ error: `Send at most ${MAX_RECORDS_PER_DELIVERY} records at a time.` }, { status: 413 });
  }

  // A "source" on the envelope (or the first record) names the CRM; otherwise
  // the provider the endpoint was created for does.
  const envelopeSource =
    (body && typeof body === 'object' && !Array.isArray(body) && typeof (body as { source?: unknown }).source === 'string'
      ? (body as { source: string }).source
      : null) ??
    (typeof (list[0] as { source?: unknown })?.source === 'string' ? (list[0] as { source: string }).source : null);
  const source = sourceSlug(envelopeSource, endpoint.provider);

  const records: NormalizedOutcome[] = [];
  const rejected: { externalId: string | null; message: string }[] = [];
  const warnings: { externalId: string; warnings: string[] }[] = [];
  for (const item of list) {
    const result = normalizeOutcome(item);
    if (result.ok) {
      records.push(result.record);
      if (result.warnings.length) warnings.push({ externalId: result.record.externalId, warnings: result.warnings });
    } else {
      rejected.push({ externalId: result.externalId, message: result.message });
    }
  }

  // Resolve rep emails inside this company only.
  const emails = [...new Set(records.map((r) => r.repEmail).filter((e): e is string => Boolean(e)))];
  const repIds = new Map<string, string>();
  for (let i = 0; i < emails.length; i += 25) {
    const batch = emails.slice(i, i + 25);
    const found = await Promise.all(
      batch.map((email) => admin.rpc('org_member_by_email', { p_org: endpoint.org_id, p_email: email })),
    );
    found.forEach(({ data }, j) => {
      if (typeof data === 'string') repIds.set(batch[j], data);
    });
  }

  const summary = await applyOutcomes(
    admin,
    { orgId: endpoint.org_id, channel: 'webhook', source, endpointId: endpoint.endpoint_id, repIds },
    records,
    rejected,
  );

  const unmatchedReps = emails.filter((e) => !repIds.has(e));

  return Response.json(
    {
      created: summary.created,
      updated: summary.updated,
      unchanged: summary.unchanged,
      rejected: summary.rejected,
      results: summary.results,
      warnings,
      // Not an error: the job is recorded, but no rep is credited until the
      // address matches someone in the company.
      unmatched_rep_emails: unmatchedReps,
    },
    { status: summary.rejected && !summary.created && !summary.updated && !summary.unchanged ? 422 : 200 },
  );
}

function bearer(req: NextRequest): string | null {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(trs_[0-9a-f]{48})\s*$/i);
  if (match) return match[1].toLowerCase();
  const alt = req.headers.get('x-truss-token')?.trim();
  return alt && /^trs_[0-9a-f]{48}$/i.test(alt) ? alt.toLowerCase() : null;
}
