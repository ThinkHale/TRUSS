/**
 * Data export.
 *
 *   GET /api/export?scope=me        everything TRUSS holds about the caller
 *   GET /api/export?scope=org       the company's data, for owners and admins
 *   GET /api/export?scope=accounts  the company's accounts as CSV
 *
 * Everything is read with the caller's own client, so RLS decides what is in
 * the file exactly as it decides what is on screen. That is also why a
 * company export has no Coach conversations: coach_conversations is readable
 * only by the rep who had them, and no role — owner, admin, or TRUSS operator
 * — can read another person's. Each rep downloads their own with scope=me.
 *
 * The JSON is streamed table by table, so a large company's export does not
 * have to fit in memory, and each table is paged past PostgREST's row cap.
 */

import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionContext, isAdminRole } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

const PAGE = 1000;

type Filter = [column: string, value: string];

async function* pages(
  supabase: SupabaseClient,
  table: string,
  columns: string,
  filters: Filter[],
  order = 'created_at',
): AsyncGenerator<Record<string, unknown>[]> {
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from(table).select(columns);
    for (const [column, value] of filters) query = query.eq(column, value);
    const { data, error } = await query.order(order, { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    if (rows.length) yield rows;
    if (rows.length < PAGE) return;
  }
}

interface Section {
  name: string;
  table: string;
  columns: string;
  filters: Filter[];
  order?: string;
}

function orgSections(orgId: string): Section[] {
  const org: Filter[] = [['org_id', orgId]];
  return [
    { name: 'branches', table: 'branches', columns: '*', filters: org },
    { name: 'accounts', table: 'accounts', columns: '*', filters: org },
    { name: 'contacts', table: 'contacts', columns: '*', filters: org },
    { name: 'activities', table: 'activities', columns: '*', filters: org },
    { name: 'campaigns', table: 'campaigns', columns: '*', filters: org },
    {
      name: 'area_research',
      table: 'area_research',
      columns: 'id, user_id, query, formatted_address, lat, lng, state, postal_code, radius_miles, brief, created_at',
      filters: org,
    },
    { name: 'practice_sessions', table: 'practice_sessions', columns: '*', filters: org },
    { name: 'practice_turns', table: 'practice_turns', columns: 'session_id, role, text, offset_ms, created_at', filters: org },
    { name: 'scorecards', table: 'scorecards', columns: '*', filters: org },
    { name: 'field_reviews', table: 'field_reviews', columns: '*', filters: org },
    { name: 'custom_scenarios', table: 'custom_scenarios', columns: '*', filters: org },
    {
      name: 'knowledge_documents',
      table: 'knowledge_documents',
      columns: 'id, title, source_type, source_uri, citation_label, status, stage_tags, chunk_count, uploaded_by, created_at',
      filters: org,
    },
    {
      name: 'knowledge_passages',
      table: 'knowledge_chunks',
      columns: 'document_id, chunk_index, content',
      filters: org,
    },
    { name: 'cohorts', table: 'cohorts', columns: '*', filters: org },
    { name: 'cohort_members', table: 'cohort_members', columns: '*', filters: org, order: 'added_at' },
    { name: 'module_progress', table: 'module_progress', columns: '*', filters: org, order: 'updated_at' },
    { name: 'certifications', table: 'certifications', columns: '*', filters: org, order: 'issued_at' },
    { name: 'outcome_events', table: 'outcome_events', columns: '*', filters: org, order: 'received_at' },
    {
      name: 'integrations',
      table: 'integration_endpoints',
      columns: 'id, name, provider, token_prefix, created_at, last_used_at, revoked_at',
      filters: org,
    },
    { name: 'usage_counters', table: 'usage_counters', columns: '*', filters: org, order: 'period_month' },
  ];
}

function meSections(userId: string, orgId: string): Section[] {
  const mine: Filter[] = [['user_id', userId]];
  return [
    { name: 'coach_conversations', table: 'coach_conversations', columns: '*', filters: mine },
    // coach_messages has no user_id; its policy returns only messages in the caller's conversations.
    { name: 'coach_messages', table: 'coach_messages', columns: 'conversation_id, role, content, citations, created_at', filters: [] },
    { name: 'practice_sessions', table: 'practice_sessions', columns: '*', filters: mine },
    { name: 'scorecards', table: 'scorecards', columns: '*', filters: mine },
    { name: 'field_reviews', table: 'field_reviews', columns: '*', filters: mine },
    { name: 'module_progress', table: 'module_progress', columns: '*', filters: mine, order: 'updated_at' },
    { name: 'certifications', table: 'certifications', columns: '*', filters: mine, order: 'issued_at' },
    { name: 'accounts_owned', table: 'accounts', columns: '*', filters: [['owner_user_id', userId], ['org_id', orgId]] },
  ];
}

export async function GET(req: NextRequest) {
  const session = await getSessionContext();
  if (!session) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const scope = req.nextUrl.searchParams.get('scope') ?? 'me';
  const supabase = await supabaseServer();
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = session.orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company';

  if (scope === 'accounts') {
    if (!isAdminRole(session.role)) return Response.json({ error: 'Owners and admins export company data.' }, { status: 403 });
    await supabase.rpc('record_org_event', { p_org: session.orgId, p_action: 'export.accounts', p_detail: {} });
    return csvResponse(supabase, session.orgId, `truss-accounts-${slug}-${stamp}.csv`);
  }

  if (scope !== 'me' && scope !== 'org') return Response.json({ error: 'Unknown export.' }, { status: 400 });
  if (scope === 'org' && !isAdminRole(session.role)) {
    return Response.json({ error: 'Owners and admins export company data.' }, { status: 403 });
  }

  let header: Record<string, unknown>;
  let sections: Section[];
  if (scope === 'org') {
    const [{ data: org }, { data: settings }, { data: people }] = await Promise.all([
      supabase.from('organizations').select('id, name, slug, plan, kind, seat_limit, created_at').eq('id', session.orgId).maybeSingle(),
      supabase.from('org_settings').select('*').eq('org_id', session.orgId).maybeSingle(),
      supabase.rpc('org_member_directory', { p_org: session.orgId }),
    ]);
    const { data: audit } = await supabase.rpc('org_audit_feed', { p_org: session.orgId, p_limit: 500 });
    header = { organization: org, settings, people: people ?? [], audit_log: audit ?? [] };
    sections = orgSections(session.orgId);
    await supabase.rpc('record_org_event', { p_org: session.orgId, p_action: 'export.org', p_detail: {} });
  } else {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.userId).maybeSingle();
    header = { profile, email: session.email, company: { id: session.orgId, name: session.orgName, role: session.role } };
    sections = meSections(session.userId, session.orgId);
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const write = (s: string) => controller.enqueue(encoder.encode(s));
      try {
        write(`{"export":${JSON.stringify({ scope, generated_at: new Date().toISOString(), format: 'truss-export/1' })}`);
        for (const [key, value] of Object.entries(header)) write(`,${JSON.stringify(key)}:${JSON.stringify(value)}`);
        for (const section of sections) {
          write(`,${JSON.stringify(section.name)}:[`);
          let first = true;
          for await (const rows of pages(supabase, section.table, section.columns, section.filters, section.order)) {
            for (const row of rows) {
              write(`${first ? '' : ','}${JSON.stringify(row)}`);
              first = false;
            }
          }
          write(']');
        }
        write('}');
      } catch (err) {
        // The file is already streaming, so the failure goes into it rather
        // than into a status code nobody will see.
        write(`,"export_error":${JSON.stringify(err instanceof Error ? err.message : 'failed')}}`);
      }
      controller.close();
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="truss-${scope === 'org' ? slug : 'my-data'}-${stamp}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}

const ACCOUNT_COLUMNS = [
  'id', 'name', 'type', 'status', 'truss_stage', 'address', 'city', 'state', 'postal_code',
  'carrier', 'claim_status', 'deductible_cents', 'date_of_loss', 'estimated_value_cents',
  'contract_value_cents', 'signed_at', 'lost_at', 'lost_reason', 'lead_source',
  'external_source', 'external_id', 'owner_user_id', 'created_at', 'updated_at',
];

function csvCell(value: unknown): string {
  if (value == null) return '';
  const s = Array.isArray(value) ? value.join('; ') : String(value);
  // Quote everything that needs it, and neutralize spreadsheet formulas.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function csvResponse(supabase: SupabaseClient, orgId: string, filename: string): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`${ACCOUNT_COLUMNS.join(',')}\r\n`));
      try {
        for await (const rows of pages(supabase, 'accounts', ACCOUNT_COLUMNS.join(', '), [['org_id', orgId]])) {
          const chunk = rows.map((r) => ACCOUNT_COLUMNS.map((c) => csvCell(r[c])).join(',')).join('\r\n');
          controller.enqueue(encoder.encode(`${chunk}\r\n`));
        }
      } catch {
        controller.enqueue(encoder.encode('# export incomplete\r\n'));
      }
      controller.close();
    },
  });
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
