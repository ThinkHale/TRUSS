/**
 * Campaign generation.
 *
 * Every piece is tagged with the TRUSS stage it serves, and every piece is
 * produced in English and Spanish, because a large share of this audience
 * sells to Spanish-speaking homeowners.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { openai, MODELS, isOpenAIConfigured } from '@/lib/ai/openai';
import { campaignSystemPrompt } from '@/lib/ai/prompts';
import { getSessionContext, loadOrgContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { STAGE_IDS, getStage, type StageId } from '@/lib/truss/methodology';

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

const responseSchema = z.object({ pieces: z.array(pieceSchema).min(1) });

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

  const userPrompt =
    `Campaign: ${name}\n` +
    `Audience: ${audience}\n` +
    `TRUSS stage this campaign serves: ${stageInfo.name} — ${stageInfo.oneLiner}\n` +
    `Purpose of this stage: ${stageInfo.purpose}\n` +
    `Channels requested: ${channels.join(', ')}\n` +
    (triggerNote ? `What triggered this: ${triggerNote}\n` : '') +
    researchContext +
    `\n\nProduce one piece per channel in English and one in Spanish (so ${channels.length * 2} pieces total). ` +
    `Respond with JSON: { "pieces": [{ "channel", "language", "stage", "subject", "body", "note" }] }. ` +
    `"subject" is null for channels that have no subject line. "note" is one sentence to the rep about ` +
    `when and how to use the piece. No markdown.`;

  let pieces;
  try {
    const completion = await openai().chat.completions.create({
      model: MODELS.structured,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: campaignSystemPrompt(orgContext) },
        { role: 'user', content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    pieces = responseSchema.parse(JSON.parse(raw)).pieces;
  } catch {
    return Response.json(
      { error: 'generation_failed', message: 'Could not write that campaign. Try again.' },
      { status: 502 },
    );
  }

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
