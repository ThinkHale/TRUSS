'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { geocode } from '@/lib/google/geocode';
import { STAGE_IDS, type StageId } from '@/lib/truss/methodology';
import {
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  ACTIVITY_TYPES,
  CLAIM_STATUSES,
} from '@/lib/truss/accounts';

/**
 * Account actions.
 *
 * Each returns a result rather than throwing: Next.js replaces a thrown server
 * action's message with an opaque digest in production, so a throw reaches the
 * rep as React's internal error text instead of something they can act on.
 * Writes use the rep's own client, so the accounts policies decide what is
 * allowed — every member of the org can work its accounts.
 */

export type AccountResult = { ok: true } | { ok: false; message: string };

const stage = z.enum(STAGE_IDS as unknown as [StageId, ...StageId[]]);
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => v.trim() || null)
    .nullable();

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().max(300).nullable(),
});

/**
 * Creates an account, resolving the address to coordinates when possible so
 * weather and storm history work for it immediately.
 */
export async function createAccount(input: {
  name: string;
  address: string | null;
}): Promise<AccountResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Give the account a name.' };

  const session = await getSessionContext();
  if (!session) return { ok: false, message: 'Your session expired. Sign in and try again.' };

  let place: { lat: number; lng: number; city: string | null; state: string | null; postal: string | null; placeId: string | null } | null = null;
  if (parsed.data.address) {
    try {
      const result = await geocode(parsed.data.address);
      place = {
        lat: result.lat,
        lng: result.lng,
        city: result.city,
        state: result.state,
        postal: result.postalCode,
        placeId: result.placeId,
      };
    } catch {
      // A bad or missing address must not block creating the account.
    }
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.from('accounts').insert({
    org_id: session.orgId,
    owner_user_id: session.userId,
    name: parsed.data.name,
    address: parsed.data.address,
    city: place?.city ?? null,
    state: place?.state ?? null,
    postal_code: place?.postal ?? null,
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
    google_place_id: place?.placeId ?? null,
  });

  if (error) return { ok: false, message: 'Could not save that account.' };

  revalidatePath('/accounts');
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(ACCOUNT_TYPES),
  status: z.enum(ACCOUNT_STATUSES),
  trussStage: stage,
  carrier: optionalText(120),
  claimStatus: z.enum(CLAIM_STATUSES),
  /** Whole dollars, as a rep would type it. */
  deductibleDollars: z.number().int().min(0).max(1_000_000).nullable(),
  dateOfLoss: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  notes: optionalText(4000),
  /** Whole dollars. What the job sold for — the number outcomes are measured in. */
  contractValueDollars: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  lostReason: optionalText(500).optional(),
  leadSource: optionalText(120).optional(),
});

/** Saves the details that decide the deal and drive the pre-visit brief. */
export async function updateAccount(input: z.input<typeof updateSchema>): Promise<AccountResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check the details and try again.' };

  const session = await getSessionContext();
  if (!session) return { ok: false, message: 'Your session expired. Sign in and try again.' };

  const d = parsed.data;
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('accounts')
    .update({
      type: d.type,
      status: d.status,
      truss_stage: d.trussStage,
      carrier: d.carrier,
      claim_status: d.claimStatus,
      deductible_cents: d.deductibleDollars == null ? null : d.deductibleDollars * 100,
      date_of_loss: d.dateOfLoss,
      notes: d.notes,
      // Outcome fields are left alone when an older client does not send them.
      ...(d.contractValueDollars !== undefined && {
        contract_value_cents: d.contractValueDollars == null ? null : d.contractValueDollars * 100,
      }),
      ...(d.lostReason !== undefined && { lost_reason: d.lostReason }),
      ...(d.leadSource !== undefined && { lead_source: d.leadSource }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', d.id)
    .eq('org_id', session.orgId);

  if (error) return { ok: false, message: 'Could not save those details.' };

  revalidatePath('/accounts');
  revalidatePath(`/accounts/${d.id}`);
  return { ok: true };
}

const contactSchema = z.object({
  accountId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  relationship: optionalText(80),
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || null)
    .pipe(z.string().email().nullable()),
  isDecisionMaker: z.boolean(),
});

/** Adds a person on the account. Who can actually sign is the field that matters. */
export async function addContact(input: z.input<typeof contactSchema>): Promise<AccountResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check the name and email and try again.' };

  const session = await getSessionContext();
  if (!session) return { ok: false, message: 'Your session expired. Sign in and try again.' };

  const d = parsed.data;
  const supabase = await supabaseServer();
  const { error } = await supabase.from('contacts').insert({
    org_id: session.orgId,
    account_id: d.accountId,
    name: d.name,
    relationship: d.relationship,
    phone: d.phone,
    email: d.email,
    is_decision_maker: d.isDecisionMaker,
  });

  if (error) return { ok: false, message: 'Could not add that contact.' };

  revalidatePath(`/accounts/${d.accountId}`);
  return { ok: true };
}

const activitySchema = z.object({
  accountId: z.string().uuid(),
  type: z.enum(ACTIVITY_TYPES),
  stage: stage.nullable(),
  notes: optionalText(4000),
});

/** Records what happened on a visit or call, so the next brief knows it. */
export async function logActivity(input: z.input<typeof activitySchema>): Promise<AccountResult> {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Check the activity and try again.' };

  const session = await getSessionContext();
  if (!session) return { ok: false, message: 'Your session expired. Sign in and try again.' };

  const d = parsed.data;
  const supabase = await supabaseServer();
  const { error } = await supabase.from('activities').insert({
    org_id: session.orgId,
    account_id: d.accountId,
    user_id: session.userId,
    type: d.type,
    stage: d.stage,
    notes: d.notes,
  });

  if (error) return { ok: false, message: 'Could not log that activity.' };

  // The account moved; keep it at the top of the list.
  await supabase
    .from('accounts')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', d.accountId)
    .eq('org_id', session.orgId);

  revalidatePath('/accounts');
  revalidatePath(`/accounts/${d.accountId}`);
  return { ok: true };
}
