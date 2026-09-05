/**
 * Starts a voice roleplay session.
 *
 * Mints a short-lived OpenAI Realtime credential so the browser can open a
 * WebRTC audio connection directly to OpenAI — the standing API key never
 * leaves the server, and the ephemeral token expires in about a minute.
 *
 * The character's instructions are attached here, server-side, so a rep cannot
 * edit the prompt to make the homeowner easy.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { MODELS, isOpenAIConfigured } from '@/lib/ai/openai';
import { roleplayCharacterPrompt } from '@/lib/ai/prompts';
import { getSessionContext, loadOrgContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { getScenario, type Scenario } from '@/lib/truss/scenarios';

export const runtime = 'nodejs';

const bodySchema = z.object({
  scenarioId: z.string().min(1).max(100),
  mode: z.enum(['voice', 'text']).default('voice'),
});

/** Loads an org-authored scenario and shapes it like a built-in one. */
async function loadCustomScenario(
  orgId: string,
  id: string,
): Promise<Scenario | null> {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(id)) return null;

  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('custom_scenarios')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .eq('is_published', true)
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

export async function POST(req: NextRequest) {
  if (!isOpenAIConfigured()) {
    return Response.json({ error: 'Practice mode is not configured yet.' }, { status: 503 });
  }

  const session = await getSessionContext();
  if (!session) {
    return Response.json({ error: 'Sign in to practice.' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const { scenarioId, mode } = parsed.data;

  const supabase = await supabaseServer();

  const { data: allowed } = await supabase.rpc('within_quota', {
    target_org: session.orgId,
    event_kind: 'practice_seconds',
  });
  if (allowed === false) {
    return Response.json(
      { error: 'quota_exceeded', message: 'You have used all your practice minutes this month.' },
      { status: 429 },
    );
  }

  const scenario =
    getScenario(scenarioId) ?? (await loadCustomScenario(session.orgId, scenarioId));
  if (!scenario) {
    return Response.json({ error: 'That scenario does not exist.' }, { status: 404 });
  }

  const isCustom = !getScenario(scenarioId);
  const { data: practiceSession, error } = await supabase
    .from('practice_sessions')
    .insert({
      org_id: session.orgId,
      user_id: session.userId,
      scenario_id: scenarioId,
      custom_scenario_id: isCustom ? scenarioId : null,
      mode,
      language: scenario.language,
      status: 'active',
    })
    .select('id, started_at')
    .single();

  if (error || !practiceSession) {
    return Response.json({ error: 'Could not start the session.' }, { status: 500 });
  }

  const orgContext = await loadOrgContext(session);
  const instructions = roleplayCharacterPrompt(scenario, orgContext);

  // Text mode needs no audio transport; the browser talks to /api/practice/reply.
  if (mode === 'text') {
    return Response.json({
      sessionId: practiceSession.id,
      mode,
      scenario: publicScenario(scenario),
    });
  }

  const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model: MODELS.realtime,
        instructions,
        output_modalities: ['audio'],
        audio: {
          input: {
            // Transcribe the rep so the turn can be scored later.
            transcription: { model: 'whisper-1' },
            // Reps practice in offices and trucks with other people around.
            // Near-field assumes the speaker is close to the mic and treats
            // the rest of the room as noise, so a conversation next door does
            // not register as the rep taking their turn.
            noise_reduction: { type: 'near_field' },
            turn_detection: {
              type: 'server_vad',
              // Deliberately above the 0.5 default: a false trigger is far
              // worse than a missed one here, because it cuts the character
              // off mid-sentence and derails the roleplay.
              threshold: 0.6,
              prefix_padding_ms: 300,
              // Long enough to let a rep gather their thought mid-answer
              // without the turn being handed back early.
              silence_duration_ms: 900,
              create_response: true,
              // The character finishes its line. Stray noise can no longer
              // cancel a reply that is already being spoken.
              interrupt_response: false,
            },
          },
          output: { voice: scenario.voice },
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    await supabase
      .from('practice_sessions')
      .update({ status: 'abandoned', ended_at: new Date().toISOString() })
      .eq('id', practiceSession.id);

    return Response.json(
      { error: 'Could not open a voice session.', detail: detail.slice(0, 300) },
      { status: 502 },
    );
  }

  const realtime = await res.json();

  return Response.json({
    sessionId: practiceSession.id,
    mode,
    scenario: publicScenario(scenario),
    // Ephemeral, single-use, expires in roughly one minute.
    clientSecret: realtime.value,
    expiresAt: realtime.expires_at,
    model: MODELS.realtime,
  });
}

/** Everything the rep is allowed to see. The character brief is withheld. */
function publicScenario(s: Scenario) {
  return {
    id: s.id,
    title: s.title,
    setup: s.setup,
    persona: s.persona,
    difficulty: s.difficulty,
    focusStages: s.focusStages,
    language: s.language,
  };
}
