/**
 * Account vocabulary shared by the account pages, their actions, and the
 * Coach's pre-visit brief. The value lists mirror the enums in migration 0003;
 * the labels are what a rep reads instead of the raw values.
 *
 * Client-safe: no server imports.
 */

export const ACCOUNT_TYPES = ['residential', 'commercial'] as const;
export const ACCOUNT_STATUSES = ['lead', 'inspected', 'signed', 'in-production', 'complete', 'lost'] as const;
export const CLAIM_STATUSES = [
  'none',
  'considering',
  'filed',
  'adjuster-scheduled',
  'adjuster-met',
  'approved',
  'partially-approved',
  'denied',
  'supplementing',
  'closed',
] as const;
export const ACTIVITY_TYPES = [
  'knock',
  'call',
  'text',
  'email',
  'inspection',
  'adjuster-meeting',
  'presentation',
  'signed',
  'note',
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

type Labels<K extends string> = Record<'en' | 'es', Record<K, string>>;

export const ACCOUNT_TYPE_LABELS: Labels<AccountType> = {
  en: { residential: 'Residential', commercial: 'Commercial' },
  es: { residential: 'Residencial', commercial: 'Comercial' },
};

export const ACCOUNT_STATUS_LABELS: Labels<AccountStatus> = {
  en: {
    lead: 'Lead',
    inspected: 'Inspected',
    signed: 'Signed',
    'in-production': 'In production',
    complete: 'Complete',
    lost: 'Lost',
  },
  es: {
    lead: 'Prospecto',
    inspected: 'Inspeccionado',
    signed: 'Firmado',
    'in-production': 'En producción',
    complete: 'Terminado',
    lost: 'Perdido',
  },
};

export const CLAIM_STATUS_LABELS: Labels<ClaimStatus> = {
  en: {
    none: 'No insurance claim',
    considering: 'Considering a claim',
    filed: 'Claim filed',
    'adjuster-scheduled': 'Adjuster scheduled',
    'adjuster-met': 'Adjuster met',
    approved: 'Approved',
    'partially-approved': 'Partly approved',
    denied: 'Denied',
    supplementing: 'Supplementing',
    closed: 'Closed',
  },
  es: {
    none: 'Sin reclamo de seguro',
    considering: 'Considerando un reclamo',
    filed: 'Reclamo presentado',
    'adjuster-scheduled': 'Ajustador programado',
    'adjuster-met': 'Reunión con ajustador',
    approved: 'Aprobado',
    'partially-approved': 'Aprobado en parte',
    denied: 'Negado',
    supplementing: 'En suplemento',
    closed: 'Cerrado',
  },
};

export const ACTIVITY_LABELS: Labels<ActivityType> = {
  en: {
    knock: 'Door knock',
    call: 'Call',
    text: 'Text',
    email: 'Email',
    inspection: 'Inspection',
    'adjuster-meeting': 'Adjuster meeting',
    presentation: 'Presentation',
    signed: 'Signed',
    note: 'Note',
  },
  es: {
    knock: 'Visita a la puerta',
    call: 'Llamada',
    text: 'Mensaje',
    email: 'Correo',
    inspection: 'Inspección',
    'adjuster-meeting': 'Reunión con ajustador',
    presentation: 'Presentación',
    signed: 'Firmado',
    note: 'Nota',
  },
};

/** Insurance fields matter only on claim work; everywhere else they are noise. */
export function hasInsuranceStory(account: {
  claim_status: string;
  carrier: string | null;
  deductible_cents: number | null;
}): boolean {
  return account.claim_status !== 'none' || Boolean(account.carrier) || account.deductible_cents != null;
}

export function formatDollars(cents: number | null): string {
  return cents == null ? '—' : `$${(cents / 100).toLocaleString()}`;
}

export interface AccountRecord {
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  status: string;
  truss_stage: string;
  carrier: string | null;
  claim_status: string;
  deductible_cents: number | null;
  date_of_loss: string | null;
  preferred_language: string;
  notes: string | null;
  updated_at: string;
}

/**
 * The account as plain text for the Coach's pre-visit brief. Missing fields
 * are stated as unknown rather than dropped, because what the record does not
 * say is half of what the brief is for.
 */
export function accountRecordText(
  account: AccountRecord,
  contacts: { name: string; relationship: string | null; is_decision_maker: boolean }[],
  activities: { type: string; stage: string | null; notes: string | null; occurred_at: string }[],
): string {
  const place = [account.address, account.city, account.state].filter(Boolean).join(', ') || 'unknown';
  const lines = [
    `Account: ${account.name} (${account.type})`,
    `Location: ${place}`,
    `Pipeline status: ${account.status}. Current TRUSS stage on record: ${account.truss_stage}.`,
    `Preferred language: ${account.preferred_language === 'es' ? 'Spanish' : 'English'}.`,
  ];

  if (hasInsuranceStory(account)) {
    lines.push(
      `Insurance: claim status ${account.claim_status}; carrier ${account.carrier ?? 'unknown'}; ` +
        `deductible ${account.deductible_cents == null ? 'unknown' : formatDollars(account.deductible_cents)}; ` +
        `date of loss ${account.date_of_loss ?? 'unknown'}.`,
    );
  } else {
    lines.push('Insurance: no claim on record.');
  }

  lines.push(
    contacts.length
      ? `People: ${contacts
          .map((c) => `${c.name}${c.relationship ? ` (${c.relationship})` : ''}${c.is_decision_maker ? ' — can sign' : ''}`)
          .join('; ')}.`
      : 'People: none recorded, and no decision maker identified.',
  );

  if (account.notes) lines.push(`Notes: ${account.notes}`);

  lines.push(
    activities.length
      ? `Recent activity, newest first:\n${activities
          .map(
            (a) =>
              `  - ${a.occurred_at.slice(0, 10)} ${a.type}${a.stage ? ` (${a.stage})` : ''}${a.notes ? `: ${a.notes}` : ''}`,
          )
          .join('\n')}`
      : 'Recent activity: none recorded.',
  );

  lines.push(`Record last updated ${account.updated_at.slice(0, 10)}.`);
  return lines.join('\n');
}
