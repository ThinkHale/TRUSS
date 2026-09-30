/**
 * Ends a practice session and produces the TRUSS scorecard.
 *
 * This is the payoff of the whole practice loop: the rep hears what they said
 * scored against the five stages, with a verbatim quote as evidence and one
 * specific thing to change before their next real door.
 *
 * Reps can read their sessions and scorecards but not write them (0016): the
 * scores are what a manager reads, and started_at is what the minutes are
 * billed from. Ownership is established with the rep's own client, then every
 * write goes through the service role, scoped to this session and this rep.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { openai, MODELS, isOpenAIConfigured } from '@/lib/ai/openai';
import { scoringSystemPrompt, buildScoringUserPrompt } from '@/lib/ai/prompts';
import { scorecardSchema } from '@/lib/truss/scoring';
import { getSessionContext, loadOrgContext } from '@/lib/supabase/session';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';
import { resolveScenario } from '@/lib/truss/resolveScenario';
import { billableSeconds, fitTranscript } from '@/lib/truss/practice';
import { recordTokens } from '@/lib/ai/usage';

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
    .select('id, scenario_id, custom_scenario_id, started_at, status, language, duration_seconds')
    .eq('id', sessionId)
    .eq('user_id', session.userId)
    .maybeSingle();

  if (!practiceSession) return Response.json({ error: 'Session not found.' }, { status: 404 });

  // Writes bypass RLS, so each one is pinned to the session and rep verified above.
  const admin = supabaseAdmin();
  const updateSession = (patch: Record<string, unknown>) =>
    admin.from('practice_sessions').update(patch).eq('id', sessionId).eq('user_id', session.userId);

  // A session is billed once. duration_seconds is set exactly when it is —
  // here, or by the stale-session sweep when the rep opened another one — so a
  // session swept and billed as abandoned can still be scored without paying twice.
  const alreadyBilled = practiceSession.duration_seconds != null;

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

  const fullTranscript = (turns ?? []) as { role: 'rep' | 'character'; text: string }[];
  // Bounded, so a runaway or padded transcript cannot make scoring arbitrarily expensive.
  const transcript = fitTranscript(fullTranscript);
  const repTurns = fullTranscript.filter((t) => t.role === 'rep').length;

  if (repTurns < MIN_REP_TURNS) {
    const seconds = alreadyBilled ? practiceSession.duration_seconds! : billableSeconds(practiceSession.started_at);
    await updateSession({ status: 'abandoned', ended_at: new Date().toISOString(), duration_seconds: seconds });

    // Too short to score is not the same as free. The audio still happened.
    if (seconds > 0 && !alreadyBilled) {
      await supabase.rpc('record_usage', {
        target_org: session.orgId,
        target_user: session.userId,
        event_kind: 'practice_seconds',
        qty: seconds,
        model_name: MODELS.realtime,
      });
    }

    return Response.json(
      { error: 'too_short', message: 'That conversation was too short to score. Give it a real run.' },
      { status: 422 },
    );
  }

  await updateSession({ status: 'scoring' });

  const scenario = await resolveScenario(supabase, [session.orgId, session.parentOrgId], practiceSession.scenario_id, {
    customScenarioId: practiceSession.custom_scenario_id,
  });

  if (!scenario) {
    return Response.json({ error: 'Scenario is missing; cannot score.' }, { status: 500 });
  }

  const orgContext = await loadOrgContext(session);
  // Capped: this is wall clock since the session opened, which only equals the
  // audio consumed if the rep scored it when they finished.
  const durationSeconds = alreadyBilled
    ? practiceSession.duration_seconds!
    : billableSeconds(practiceSession.started_at);

  let card;
  try {
    const completion = await openai().chat.completions.create({
      model: MODELS.structured,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: scoringSystemPrompt(scenario, orgContext, transcript).system },
        { role: 'user', content: buildScoringUserPrompt(transcript) },
      ],
    });

    await recordTokens(supabase, session.orgId, 'scoring', MODELS.structured, completion.usage);
    const raw = completion.choices[0]?.message?.content ?? '{}';
    card = scorecardSchema.parse(JSON.parse(raw));
  } catch {
    // Left in 'scoring' rather than moved to 'completed': a retry still works,
    // and if the rep walks away the stale-session sweep still bills the audio.
    // 'completed' was invisible to that sweep, so a failed score was free.
    return Response.json(
      { error: 'scoring_failed', message: 'Could not score that one. Your transcript is saved — try scoring again.' },
      { status: 502 },
    );
  }

  const byStage = Object.fromEntries(card.stages.map((s) => [s.stage, s.score]));

  const row = {
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
    critical_findings: card.critical,
  };
  const save = (values: Record<string, unknown>) =>
    admin.from('scorecards').upsert(values, { onConflict: 'session_id' }).select('*').single();

  let { data: saved, error: saveError } = await save(row);
  // critical_findings arrives with migration 0017. A deploy that reaches the
  // database first must not stop every scorecard from saving; the findings are
  // still named in the summary, as they always were.
  if (saveError && (saveError.code === 'PGRST204' || saveError.code === '42703')) {
    const { critical_findings: _omitted, ...withoutFindings } = row;
    void _omitted;
    ({ data: saved, error: saveError } = await save(withoutFindings));
  }

  if (saveError) {
    return Response.json({ error: 'Could not save the scorecard.' }, { status: 500 });
  }

  await updateSession({
    status: 'scored',
    ended_at: new Date().toISOString(),
    duration_seconds: durationSeconds,
  });

  if (!alreadyBilled) {
    await supabase.rpc('record_usage', {
      target_org: session.orgId,
      target_user: session.userId,
      event_kind: 'practice_seconds',
      qty: durationSeconds,
      model_name: MODELS.realtime,
    });
  }

  return Response.json({ scorecard: saved, cached: false });
}

