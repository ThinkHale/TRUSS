/**
 * Turning a CRM's idea of a job into a TRUSS account outcome.
 *
 * Every contractor CRM names things differently — "Sold", "Closed Won",
 * "Contract Signed", "Job Status: Complete" — and exports money as "$18,450.00"
 * and dates in whatever the office's locale was. This module is the one place
 * that tolerance lives, shared by the webhook (src/app/api/integrations/outcomes)
 * and the CSV import on the Outcomes page. It is pure: no database, no network,
 * so it is unit tested directly.
 */

import { z } from 'zod';
import type { AccountStatus } from '@/lib/truss/accounts';

// ─── Field-level parsing ────────────────────────────────────────────────────

const STATUS_SYNONYMS: [RegExp, AccountStatus][] = [
  // Negatives first, so "Not sold" is not read as "sold".
  [/\b(lost|dead|declined|cancel+ed|closed[\s_-]*lost|no[\s_-]*sale|not[\s_-]*sold|rejected)\b/i, 'lost'],
  [/\b(complete|completed|closed[\s_-]*complete|paid|finished|invoiced|closed[\s_-]*paid)\b/i, 'complete'],
  [/\b(in[\s_-]*production|production|scheduled|in[\s_-]*progress|installing|build)\b/i, 'in-production'],
  [/\b(signed|sold|won|closed[\s_-]*won|contract(ed)?|approved|booked)\b/i, 'signed'],
  [/\b(inspected|inspection|appointment|appt|estimate|quoted|proposal|bid)\b/i, 'inspected'],
  [/\b(lead|new|prospect|open|contacted)\b/i, 'lead'],
];

/** Maps a CRM status to a TRUSS status, or null when it cannot tell. */
export function normalizeStatus(raw: unknown): AccountStatus | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  for (const [pattern, status] of STATUS_SYNONYMS) {
    if (pattern.test(value)) return status;
  }
  return null;
}

/** "$18,450.00", "18450", 18450.5 → cents. Null for blanks and nonsense. */
export function parseMoneyToCents(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? Math.round(raw * 100) : null;
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/[\s$,]/g, '').replace(/^USD/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return cents <= 100_000_000_000 ? cents : null;
}

/**
 * ISO dates, ISO timestamps, and US-style M/D/YYYY. Anything else is refused
 * rather than guessed: a wrong signing date moves a deal between periods.
 */
export function parseDate(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string') return null;
  const value = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}([T ][\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(value)) {
    const d = new Date(value.length === 10 ? `${value}T12:00:00Z` : value.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  const us = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (us) {
    const [, m, d, y] = us;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    const date = new Date(Date.UTC(year, Number(m) - 1, Number(d), 12));
    if (date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return null;
    return date.toISOString();
  }

  return null;
}

// ─── The normalized record ──────────────────────────────────────────────────

const text = (max: number) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => String(v).trim())
    .pipe(z.string().max(max))
    .transform((v) => v || null)
    .nullish();

/**
 * What the webhook accepts, per record. Field names are TRUSS's; the Zapier
 * and Make recipes in docs/INTEGRATIONS.md map each CRM's fields onto these.
 */
export const outcomeRecordSchema = z.object({
  external_id: z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().min(1).max(200)),
  name: text(200),
  address: text(300),
  city: text(120),
  state: text(40),
  postal_code: text(20),
  status: z.unknown().optional(),
  contract_value: z.unknown().optional(),
  signed_at: z.unknown().optional(),
  lost_at: z.unknown().optional(),
  lost_reason: text(500),
  lead_source: text(120),
  rep_email: text(254),
  type: text(20),
});

export type OutcomeRecordInput = z.input<typeof outcomeRecordSchema>;

export interface NormalizedOutcome {
  externalId: string;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  status: AccountStatus | null;
  contractValueCents: number | null;
  signedAt: string | null;
  lostAt: string | null;
  lostReason: string | null;
  leadSource: string | null;
  repEmail: string | null;
  type: 'residential' | 'commercial' | null;
}

export type NormalizeResult =
  | { ok: true; record: NormalizedOutcome; warnings: string[] }
  | { ok: false; externalId: string | null; message: string };

export function normalizeOutcome(input: unknown): NormalizeResult {
  const parsed = outcomeRecordSchema.safeParse(input);
  if (!parsed.success) {
    const externalId =
      input && typeof input === 'object' && 'external_id' in input
        ? String((input as { external_id: unknown }).external_id ?? '') || null
        : null;
    const field = parsed.error.issues[0]?.path.join('.') || 'record';
    return { ok: false, externalId, message: `Invalid ${field}.` };
  }

  const r = parsed.data;
  const warnings: string[] = [];

  const status = normalizeStatus(r.status);
  if (r.status != null && r.status !== '' && !status) warnings.push(`Unrecognized status "${String(r.status)}".`);

  const contractValueCents = parseMoneyToCents(r.contract_value);
  if (r.contract_value != null && r.contract_value !== '' && contractValueCents == null) {
    warnings.push('Contract value was not a number and was ignored.');
  }

  const signedAt = parseDate(r.signed_at);
  if (r.signed_at && !signedAt) warnings.push('Signed date was not a recognized date and was ignored.');
  const lostAt = parseDate(r.lost_at);
  if (r.lost_at && !lostAt) warnings.push('Lost date was not a recognized date and was ignored.');

  const email = r.rep_email?.toLowerCase() ?? null;
  const type = r.type ? (/^comm/i.test(r.type) ? 'commercial' : /^res/i.test(r.type) ? 'residential' : null) : null;

  return {
    ok: true,
    warnings,
    record: {
      externalId: r.external_id,
      name: r.name ?? null,
      address: r.address ?? null,
      city: r.city ?? null,
      state: r.state ?? null,
      postalCode: r.postal_code ?? null,
      status,
      contractValueCents,
      signedAt,
      lostAt,
      lostReason: r.lost_reason ?? null,
      leadSource: r.lead_source ?? null,
      repEmail: email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null,
      type,
    },
  };
}

// ─── CSV ────────────────────────────────────────────────────────────────────

/**
 * RFC 4180: quoted fields, doubled quotes, commas and newlines inside quotes,
 * CRLF or LF. A byte-order mark on the first header is dropped. Blank lines are
 * skipped. Also reads tab-separated files, detected from the header row.
 */
export function parseCsv(input: string): string[][] {
  const textIn = input.replace(/^﻿/, '');
  const firstLine = textIn.slice(0, textIn.search(/\r?\n|$/));
  const delimiter = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? '\t' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < textIn.length; i++) {
    const ch = textIn[i];
    if (quoted) {
      if (ch === '"') {
        if (textIn[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"' && field === '') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && textIn[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  return rows;
}

export const OUTCOME_FIELDS = [
  'external_id', 'name', 'address', 'city', 'state', 'postal_code', 'status',
  'contract_value', 'signed_at', 'lost_at', 'lost_reason', 'lead_source', 'rep_email', 'type',
] as const;
export type OutcomeField = (typeof OUTCOME_FIELDS)[number];

export const OUTCOME_FIELD_LABELS: Record<OutcomeField, string> = {
  external_id: 'Job or deal ID',
  name: 'Customer or job name',
  address: 'Street address',
  city: 'City',
  state: 'State',
  postal_code: 'ZIP',
  status: 'Status',
  contract_value: 'Contract value',
  signed_at: 'Signed / sold date',
  lost_at: 'Lost date',
  lost_reason: 'Lost reason',
  lead_source: 'Lead source',
  rep_email: 'Sales rep email',
  type: 'Residential or commercial',
};

/** Header names seen in real CRM exports, lowercased with punctuation stripped. */
const HEADER_SYNONYMS: Record<OutcomeField, string[]> = {
  external_id: ['externalid', 'jobid', 'jobnumber', 'job', 'dealid', 'opportunityid', 'id', 'recordid', 'jnid', 'number', 'invoicenumber'],
  name: ['name', 'customer', 'customername', 'jobname', 'dealname', 'contact', 'homeowner', 'client', 'accountname'],
  address: ['address', 'street', 'streetaddress', 'address1', 'addressline1', 'jobaddress', 'propertyaddress'],
  city: ['city', 'town'],
  state: ['state', 'province', 'region'],
  postal_code: ['zip', 'zipcode', 'postalcode', 'postcode'],
  status: ['status', 'jobstatus', 'stage', 'dealstage', 'milestone', 'workflowstatus'],
  contract_value: ['contractvalue', 'amount', 'value', 'total', 'contractamount', 'saleamount', 'price', 'revenue', 'jobtotal', 'approvedamount'],
  signed_at: ['signedat', 'signeddate', 'solddate', 'datesold', 'closedate', 'contractdate', 'wondate', 'datesigned'],
  lost_at: ['lostat', 'lostdate', 'datelost', 'cancelleddate', 'canceleddate'],
  lost_reason: ['lostreason', 'reasonlost', 'cancelreason', 'cancellationreason'],
  lead_source: ['leadsource', 'source', 'marketingsource', 'referralsource'],
  rep_email: ['repemail', 'salesrepemail', 'owneremail', 'salespersonemail', 'assignedtoemail', 'email'],
  type: ['type', 'jobtype', 'propertytype', 'category'],
};

/** Best guess at which column feeds which field. The Outcomes page lets a manager correct it. */
export function guessColumnMap(headers: string[]): Partial<Record<OutcomeField, number>> {
  const keys = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const map: Partial<Record<OutcomeField, number>> = {};
  const used = new Set<number>();
  for (const field of OUTCOME_FIELDS) {
    const index = keys.findIndex((k, i) => !used.has(i) && HEADER_SYNONYMS[field].includes(k));
    if (index >= 0) {
      map[field] = index;
      used.add(index);
    }
  }
  return map;
}

export function rowToRecord(row: string[], map: Partial<Record<OutcomeField, number>>): OutcomeRecordInput {
  const record: Record<string, string> = {};
  for (const field of OUTCOME_FIELDS) {
    const index = map[field];
    if (index != null && index < row.length) record[field] = row[index];
  }
  return record as unknown as OutcomeRecordInput;
}

/** Whatever the webhook or CSV sent, the most a single delivery may carry. */
export const MAX_RECORDS_PER_DELIVERY = 500;
