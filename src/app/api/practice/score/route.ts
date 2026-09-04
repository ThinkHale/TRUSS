/**
 * Ends a practice session and produces the TRUSS scorecard.
 *
 * This is the payoff of the whole practice loop: the rep hears what they said
 * scored against the five stages, with a verbatim quote as evidence and one
 * specific thing to change before their next real door.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { openai, MODELS, isOpenAIConfigured } from '@/lib/ai/openai';
import { scoringSystemPrompt, buildScoringUserPrompt } from '@/lib/ai/prompts';
import { scorecardSchema } from '@/lib/truss/scoring';
import { getSessionContext, loadOrgContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { getScenario, type Scenario } from '@/lib/truss/scenarios';

export const runtime = 'nodejs';
export const maxDuration = 90;

const bodySchema = z.object({ sessionId: z.string().uuid() });

/** A conversation this short has nothing meaningful to score. */
const MIN_REP_TURNS = 2;

export async function POST(req: NextRequest) {
  if (!isOpenAIConfigured()) {
    return Response.json({ error: 'Scoring is not configured yet.' }, { status: 503 });
  }

  const session = await getSessionContext();
  if (!session) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const supabase = await supabaseServer();
  const { sessionId } = parsed.data;

  const { data: practiceSession } = await supabase
    .from('practice_sessions')
    .select('id, scenario_id, custom_scenario_id, started_at, status, language')
    .eq('id', sessionId)
    .eq('user_id', session.userId)
    .maybeSingle();

  if (!practiceSession) return Response.json({ error: 'Session not found.' }, { status: 404 });

  // Scoring is not free, so an already-scored session returns what it has.
  if (practiceSession.status === 'scored') {
    const { data: existing } = await supabase
      .from('scorecards')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (existing) return Response.json({ scorecard: existing, cached: true });
  }

  const { data: turns } = await supabase
    .from('practice_turns')
    .select('role, text')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  const transcript = (turns ?? []) as { role: 'rep' | 'character'; text: string }[];
  const repTurns = transcript.filter((t) => t.role === 'rep').length;

  if (repTurns < MIN_REP_TURNS) {
    await supabase
      .from('practice_sessions')
      .update({ status: 'abandoned', ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    return Response.json(
      { error: 'too_short', message: 'That conversation was too short to score. Give it a real run.' },
      { status: 422 },
    );
  }

  await supabase.from('practice_sessions').update({ status: 'scoring' }).eq('id', sessionId);

  const scenario =
    getScenario(practiceSession.scenario_id) ?? (await loadCustomScenario(supabase, practiceSession));

  if (!scenario) {
    return Response.json({ error: 'Scenario is missing; cannot score.' }, { status: 500 });
  }

  const orgContext = await loadOrgContext(session);
  const durationSeconds = Math.max(
    0,
    Math.round((Date.now() - new Date(practiceSession.started_at).getTime()) / 1000),
  );

  let card;
  try {
    const completion = await openai().chat.completions.create({
      model: MODELS.structured,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: scoringSystemPrompt(scenario, orgContext) },
        { role: 'user', content: buildScoringUserPrompt(transcript) },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    card = scorecardSchema.parse(JSON.parse(raw));
  } catch {
    await supabase.from('practice_sessions').update({ status: 'completed' }).eq('id', sessionId);
    return Response.json(
      { error: 'scoring_failed', message: 'Could not score that one. Your transcript is saved — try scoring again.' },
      { status: 502 },
    );
  }

  const byStage = Object.fromEntries(card.stages.map((s) => [s.stage, s.score]));

  const { data: saved, error: saveError } = await supabase
    .from('scorecards')
    .upsert(
      {
        session_id: sessionId,
        org_id: session.orgId,
        user_id: session.userId,
        trust: byStage.trust ?? 0,
        relate: byStage.relate ?? 0,
        understand: byStage.understand ?? 0,
        solve: byStage.solve ?? 0,
        secure: byStage.secure ?? 0,
        outcome: card.outcome,
        headline: card.headline,
        summary: card.summary,
        stages: card.stages,
      },
      { onConflict: 'session_id' },
    )
    .select('*')
    .single();

  if (saveError) {
    return Response.json({ error: 'Could not save the scorecard.' }, { status: 500 });
  }

  await supabase
    .from('practice_sessions')
    .update({
      status: 'scored',
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
    })
    .eq('id', sessionId);

  await supabase.rpc('record_usage', {
    target_org: session.orgId,
    target_user: session.userId,
    event_kind: 'practice_seconds',
    qty: durationSeconds,
    model_name: MODELS.realtime,
  });

  return Response.json({ scorecard: saved, cached: false });
}

async function loadCustomScenario(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  practiceSession: { custom_scenario_id: string | null },
): Promise<Scenario | null> {
  if (!practiceSession.custom_scenario_id) return null;

  const { data } = await supabase
    .from('custom_scenarios')
    .select('*')
    .eq('id', practiceSession.custom_scenario_id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    slug: 'custom',
    persona: data.persona,
    title: data.title,
    setup: data.setup,
    characterBrief: data.character_brief,
    objections: data.objections ?? [],
    difficulty: data.difficulty,
    focusStages: data.focus_stages ?? [],
    trade: 'general',
    voice: data.voice,
    language: data.language,
  } as Scenario;
}
