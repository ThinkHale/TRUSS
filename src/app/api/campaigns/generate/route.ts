/**
 * Campaign generation.
 *
 * Every piece is tagged with the TRUSS stage it serves, and every piece is
 * produced in English and Spanish, because a large share of this audience
 * sells to Spanish-speaking homeowners. A brief the knowledge base says must
 * not run yet comes back as a hold (422) with what is missing, not as copy.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { openai, MODELS, isOpenAIConfigured } from '@/lib/ai/openai';
import { campaignSystemPrompt, campaignUserPrompt } from '@/lib/ai/prompts';
import { getSessionContext, loadOrgContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { STAGE_IDS, getStage, type StageId } from '@/lib/truss/methodology';
import { recordTokens } from '@/lib/ai/usage';

export const runtime = 'nodejs';
export const maxDuration = 90;

const CHANNELS = ['door-hanger', 'text', 'email', 'voicemail', 'postcard', 'social'] as const;

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  audience: z.string().min(3).max(400),
  stage: z.enum(STAGE_IDS as unknown as [StageId, ...StageId[]]).default('trust'),
  channels: z.array(z.enum(CHANNELS)).min(1).max(6),
  triggerNote: z.string().max(600).optional(),
  areaResearchId: z.string().uuid().nullable().optional(),
});

const pieceSchema = z.object({
  channel: z.enum(CHANNELS),
  language: z.enum(['en', 'es']),
  stage: z.enum(STAGE_IDS as unknown as [StageId, ...StageId[]]),
  subject: z.string().nullable(),
  body: z.string(),
  /** Why this piece works, for the rep who has to deliver it. */
  note: z.string(),
});

/**
 * The knowledge base's campaign contract says some briefs must not run yet —
 * unknown consent, an unverified trigger — so "hold" is a valid answer.
 */
const holdSchema = z.object({
  hold: z.object({ reason: z.string().min(1), missing: z.array(z.string()) }),
});

const responseSchema = z.union([z.object({ pieces: z.array(pieceSchema).min(1) }), holdSchema]);

export async function POST(req: NextRequest) {
  if (!isOpenAIConfigured()) {
    return Response.json({ error: 'Campaign generation is not configured yet.' }, { status: 503 });
  }

  const session = await getSessionContext();
  if (!session) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const { name, audience, stage, channels, triggerNote, areaResearchId } = parsed.data;
  const supabase = await supabaseServer();

  // Checked before the model is called, not after. The counter has been
  // recorded since 0006 but nothing read it back until 0015 gave campaigns a
  // column, so this route was metered and unlimited at the same time.
  const { data: allowed, error: quotaError } = await supabase.rpc('within_quota', {
    target_org: session.orgId,
    event_kind: 'campaign_generation',
  });
  if (quotaError || allowed === null) {
    return Response.json({ error: 'Could not check usage. Please try again.' }, { status: 503 });
  }
  if (allowed === false) {
    return Response.json(
      {
        error: 'quota_exceeded',
        message: 'You have used all your campaign generations this month.',
      },
      { status: 429 },
    );
  }

  // Ground the copy in real conditions when the rep started from a research brief.
  let researchContext = '';
  if (areaResearchId) {
    const { data: research } = await supabase
      .from('area_research')
      .select('formatted_address, brief, storm_signal')
      .eq('id', areaResearchId)
      .maybeSingle();

    if (research) {
      const signal = research.storm_signal as { summary?: string } | null;
      researchContext =
        `\n\nAREA CONTEXT\nArea: ${research.formatted_address}` +
        (signal?.summary ? `\nStorm signal: ${signal.summary}` : '') +
        (research.brief ? `\nBrief: ${research.brief.slice(0, 1200)}` : '');
    }
  }

  const stageInfo = getStage(stage);
  const orgContext = await loadOrgContext(session);

  const brief =
    `Campaign: ${name}\n` +
    `Audience: ${audience}\n` +
    `TRUSS beam this campaign serves: ${stageInfo.name} (as defined in the TRUSS Method)\n` +
    `Channels requested: ${channels.join(', ')}\n` +
    (triggerNote ? `What triggered this: ${triggerNote}\n` : '');

  const { system } = campaignSystemPrompt(orgContext, `${brief}${researchContext}`);
  const userPrompt = campaignUserPrompt(`${brief}${researchContext}`, channels.length);

  let result;
  try {
    const completion = await openai().chat.completions.create({
      model: MODELS.structured,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
    });

    await recordTokens(supabase, session.orgId, 'campaign', MODELS.structured, completion.usage);
    const raw = completion.choices[0]?.message?.content ?? '{}';
    result = responseSchema.parse(JSON.parse(raw));
  } catch {
    return Response.json(
      { error: 'generation_failed', message: 'Could not write that campaign. Try again.' },
      { status: 502 },
    );
  }

  if ('hold' in result) {
    // Nothing is saved, but the model ran, so it is metered like any generation.
    await supabase.rpc('record_usage', {
      target_org: session.orgId,
      target_user: session.userId,
      event_kind: 'campaign_generation',
      qty: 1,
      model_name: MODELS.structured,
    });

    const { reason, missing } = result.hold;
    return Response.json(
      {
        error: 'campaign_hold',
        message: missing.length ? `${reason} ${missing.map((m) => `• ${m}`).join(' ')}` : reason,
        reason,
        missing,
      },
      { status: 422 },
    );
  }

  const { pieces } = result;

  const { data: saved, error } = await supabase
    .from('campaigns')
    .insert({
      org_id: session.orgId,
      created_by: session.userId,
      name,
      audience,
      stage,
      trigger_note: triggerNote ?? null,
      pieces,
      area_research_id: areaResearchId ?? null,
      status: 'draft',
    })
    .select('*')
    .single();

  if (error) return Response.json({ error: 'Could not save the campaign.' }, { status: 500 });

  await supabase.rpc('record_usage', {
    target_org: session.orgId,
    target_user: session.userId,
    event_kind: 'campaign_generation',
    qty: 1,
    model_name: MODELS.structured,
  });

  return Response.json({ campaign: saved });
}
