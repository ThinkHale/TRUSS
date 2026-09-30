/**
 * Step two of a field review: transcribe, attribute, score, and forget the audio.
 *
 *   1. Fetch the recording the caller uploaded to their own folder.
 *   2. Transcribe it, then delete it — in a finally, so a failure later in the
 *      request cannot leave audio behind.
 *   3. Split the transcript into rep and customer turns.
 *   4. Score it with the practice scorer, against the same rubric and the same
 *      critical findings.
 *   5. Store the review with the consent attestation, via the service role:
 *      field_reviews has no client write grants (0019), because the scores are
 *      what a manager reads.
 *
 * A rep reviews their own conversations. A manager can submit one for a rep
 * on their team — a ride-along — and it is filed under that rep.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { openai, MODELS, isOpenAIConfigured } from '@/lib/ai/openai';
import { buildScoringUserPrompt, scoringSystemPrompt } from '@/lib/ai/prompts';
import { recordTokens, type ProviderUsage } from '@/lib/ai/usage';
import { getSessionContext, isManagerRole, loadOrgContext } from '@/lib/supabase/session';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';
import { scorecardSchema } from '@/lib/truss/scoring';
import { fitTranscript } from '@/lib/truss/practice';
import {
  CONSENT_STATEMENT,
  FIELD_AUDIO_BUCKET,
  MAX_FIELD_AUDIO_BYTES,
  diarizePrompt,
  diarizedSchema,
  fieldScenario,
  toScoringTranscript,
} from '@/lib/truss/field';

export const runtime = 'nodejs';
// Transcribing a half-hour conversation and scoring it takes a while.
export const maxDuration = 300;

const bodySchema = z.object({
  path: z.string().min(1).max(300),
  context: z.string().trim().min(3).max(500),
  language: z.enum(['en', 'es']),
  consent: z.literal(true),
  repUserId: z.string().uuid().nullable().optional(),
  accountId: z.string().uuid().nullable().optional(),
  durationSeconds: z.number().int().min(0).max(7200).nullable().optional(),
});

export async function POST(req: NextRequest) {
  if (!isOpenAIConfigured()) {
    return Response.json({ error: 'Field reviews are not configured on this deployment.' }, { status: 503 });
  }
  const session = await getSessionContext();
  if (!session) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const consentMissing = parsed.error.issues.some((i) => i.path[0] === 'consent');
    return Response.json(
      { error: consentMissing ? 'Confirm that everyone on the recording agreed to it.' : 'Describe the conversation and try again.' },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // The path must be one the upload route issued to this caller.
  const folder = `${session.orgId}/${session.userId}/`;
  if (!input.path.startsWith(folder) || input.path.includes('..') || !/^[0-9a-f-]{36}\.[a-z0-9]+$/.test(input.path.slice(folder.length))) {
    return Response.json({ error: 'That upload does not belong to you.' }, { status: 403 });
  }

  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const bucket = admin.storage.from(FIELD_AUDIO_BUCKET);

  // Whose conversation it is. Someone else's only for a manager, and only for
  // someone in the same company — checked with the manager's own client.
  let repUserId = session.userId;
  if (input.repUserId && input.repUserId !== session.userId) {
    if (!isManagerRole(session.role)) {
      await bucket.remove([input.path]);
      return Response.json({ error: 'Only managers can submit a review for someone else.' }, { status: 403 });
    }
    const { data: member } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', session.orgId)
      .eq('user_id', input.repUserId)
      .maybeSingle();
    if (!member) {
      await bucket.remove([input.path]);
      return Response.json({ error: 'That person is not in your company.' }, { status: 403 });
    }
    repUserId = input.repUserId;
  }

  const { data: allowed } = await supabase.rpc('within_quota', { target_org: session.orgId, event_kind: 'field_review' });
  if (!allowed) {
    await bucket.remove([input.path]);
    return Response.json({ error: 'quota', message: 'Your company has used its field reviews for this month.' }, { status: 402 });
  }

  // ── 1–2. Transcribe, and delete the audio whatever happens ────────────────
  let rawTranscript: string;
  try {
    const { data: blob, error } = await bucket.download(input.path);
    if (error || !blob) return Response.json({ error: 'The upload did not arrive. Try again.' }, { status: 404 });
    if (blob.size > MAX_FIELD_AUDIO_BYTES) {
      return Response.json({ error: 'That recording is over 25 MB.' }, { status: 413 });
    }
    const name = input.path.split('/').pop() ?? 'recording.webm';
    const file = new File([blob], name, { type: blob.type || 'audio/webm' });
    const transcription = await openai().audio.transcriptions.create({
      model: MODELS.transcribe,
      file,
      language: input.language,
    });
    await recordTokens(supabase, session.orgId, 'transcription', MODELS.transcribe,
      (transcription as { usage?: ProviderUsage }).usage, input.durationSeconds ?? 0);
    rawTranscript = transcription.text.trim();
  } catch (err) {
    console.error('field transcription failed', { message: err instanceof Error ? err.message : err });
    return Response.json({ error: 'Could not transcribe that recording. Check it plays, and try again.' }, { status: 502 });
  } finally {
    await bucket.remove([input.path]);
  }

  if (rawTranscript.split(/\s+/).length < 40) {
    return Response.json(
      { error: 'too_short', message: 'There is not enough conversation in that recording to score.' },
      { status: 422 },
    );
  }

  const orgContext = await loadOrgContext(session);

  // ── 3. Who said what ─────────────────────────────────────────────────────
  let transcript: { role: 'rep' | 'character'; text: string }[];
  try {
    const completion = await openai().chat.completions.create({
      model: MODELS.structured,
      temperature: 0,
      response_format: { type: 'json_object' },
      max_tokens: 16000,
      messages: [
        { role: 'system', content: diarizePrompt(orgContext.companyName, input.context) },
        { role: 'user', content: rawTranscript.slice(0, 120_000) },
      ],
    });
    await recordTokens(supabase, session.orgId, 'field_review', MODELS.structured, completion.usage);
    transcript = toScoringTranscript(diarizedSchema.parse(JSON.parse(completion.choices[0]?.message?.content ?? '{}')).turns);
  } catch {
    return Response.json({ error: 'Could not separate the speakers in that recording. Try again.' }, { status: 502 });
  }

  if (transcript.filter((t) => t.role === 'rep').length < 2) {
    return Response.json(
      { error: 'too_short', message: 'The rep barely speaks in that recording, so there is nothing to score.' },
      { status: 422 },
    );
  }

  // ── 4. Score ─────────────────────────────────────────────────────────────
  const scenario = fieldScenario(input.context, input.language, orgContext.trades ?? []);
  const bounded = fitTranscript(transcript);
  let card;
  try {
    const completion = await openai().chat.completions.create({
      model: MODELS.structured,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: scoringSystemPrompt(scenario, orgContext, bounded).system },
        { role: 'user', content: buildScoringUserPrompt(bounded) },
      ],
    });
    await recordTokens(supabase, session.orgId, 'field_review', MODELS.structured, completion.usage);
    card = scorecardSchema.parse(JSON.parse(completion.choices[0]?.message?.content ?? '{}'));
  } catch {
    return Response.json({ error: 'Could not score that conversation. Try again.' }, { status: 502 });
  }

  // ── 5. Store ─────────────────────────────────────────────────────────────
  const byStage = Object.fromEntries(card.stages.map((s) => [s.stage, s.score]));
  const { data: saved, error: saveError } = await admin
    .from('field_reviews')
    .insert({
      org_id: session.orgId,
      user_id: repUserId,
      submitted_by: session.userId,
      account_id: input.accountId ?? null,
      context: input.context,
      trade: scenario.trade,
      language: input.language,
      consent_attested_at: new Date().toISOString(),
      consent_statement: CONSENT_STATEMENT,
      audio_seconds: input.durationSeconds ?? null,
      transcript,
      trust: byStage.trust ?? 0,
      relate: byStage.relate ?? 0,
      understand: byStage.understand ?? 0,
      solve: byStage.solve ?? 0,
      secure: byStage.secure ?? 0,
      outcome: card.outcome,
      headline: card.headline,
      summary: card.summary,
      stages: card.stages,
      critical_findings: card.critical,
    })
    .select('id')
    .single();

  if (saveError || !saved) {
    return Response.json({ error: 'Could not save the review.' }, { status: 500 });
  }

  await supabase.rpc('record_usage', {
    target_org: session.orgId,
    target_user: session.userId,
    event_kind: 'field_review',
    qty: 1,
    model_name: MODELS.structured,
  });
  if (input.durationSeconds) {
    await supabase.rpc('record_usage', {
      target_org: session.orgId,
      target_user: session.userId,
      event_kind: 'transcription_seconds',
      qty: input.durationSeconds,
      model_name: MODELS.transcribe,
    });
  }

  return Response.json({ id: saved.id });
}
