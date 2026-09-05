/**
 * Push-to-talk fallback for the roleplay character.
 *
 * Realtime over WebRTC is the primary path, but reps practice in trucks and on
 * job sites where it will not hold. This route takes a recorded clip (or typed
 * text), transcribes it, generates the character's next line, and returns
 * synthesized speech — one round trip, tolerant of bad signal.
 */

import { NextRequest } from 'next/server';
import { openai, MODELS, isOpenAIConfigured } from '@/lib/ai/openai';
import { roleplayCharacterPrompt } from '@/lib/ai/prompts';
import { getSessionContext, loadOrgContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { getScenario } from '@/lib/truss/scenarios';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const HISTORY_LIMIT = 24;

export async function POST(req: NextRequest) {
  if (!isOpenAIConfigured()) {
    return Response.json({ error: 'Practice mode is not configured yet.' }, { status: 503 });
  }

  const session = await getSessionContext();
  if (!session) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: 'Expected multipart form data.' }, { status: 400 });

  const sessionId = String(form.get('sessionId') ?? '');
  const typed = form.get('text');
  const audio = form.get('audio');

  if (!sessionId) return Response.json({ error: 'sessionId is required.' }, { status: 400 });

  const supabase = await supabaseServer();
  const { data: practiceSession } = await supabase
    .from('practice_sessions')
    .select('id, scenario_id, started_at')
    .eq('id', sessionId)
    .eq('user_id', session.userId)
    .maybeSingle();

  if (!practiceSession) return Response.json({ error: 'Session not found.' }, { status: 404 });

  const scenario = getScenario(practiceSession.scenario_id);
  if (!scenario) return Response.json({ error: 'Scenario not found.' }, { status: 404 });

  // 1. Whatever the rep said, get it into text.
  let repText: string;
  if (audio instanceof File) {
    if (audio.size > MAX_AUDIO_BYTES) {
      return Response.json({ error: 'That recording is too long.' }, { status: 413 });
    }
    const transcription = await openai().audio.transcriptions.create({
      model: MODELS.transcribe,
      file: audio,
      language: scenario.language,
    });
    repText = transcription.text.trim();
  } else if (typeof typed === 'string' && typed.trim()) {
    repText = typed.trim().slice(0, 4000);
  } else {
    return Response.json({ error: 'Send audio or text.' }, { status: 400 });
  }

  if (!repText) {
    return Response.json(
      { error: 'no_speech', message: 'I did not catch that. Try again, a little closer to the phone.' },
      { status: 422 },
    );
  }

  // 2. Replay the conversation so the character stays consistent.
  const { data: history } = await supabase
    .from('practice_turns')
    .select('role, text')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  const orgContext = await loadOrgContext(session);
  const offsetMs = Date.now() - new Date(practiceSession.started_at).getTime();

  const completion = await openai().chat.completions.create({
    model: MODELS.coach,
    temperature: 0.9,
    // Spoken turns are short by design.
    max_tokens: 160,
    messages: [
      { role: 'system', content: roleplayCharacterPrompt(scenario, orgContext) },
      ...(history ?? []).reverse().map((t) => ({
        role: (t.role === 'rep' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: t.text,
      })),
      { role: 'user', content: repText },
    ],
  });

  const characterText = completion.choices[0]?.message?.content?.trim() ?? '';

  await supabase.from('practice_turns').insert([
    { session_id: sessionId, org_id: session.orgId, role: 'rep', text: repText, offset_ms: offsetMs },
    {
      session_id: sessionId,
      org_id: session.orgId,
      role: 'character',
      text: characterText,
      offset_ms: Date.now() - new Date(practiceSession.started_at).getTime(),
    },
  ]);

  // 3. Speak the reply. Base64 keeps this to a single JSON response, which
  //    survives flaky connections better than a second fetch for the audio.
  let audioBase64: string | null = null;
  try {
    const speech = await openai().audio.speech.create({
      model: MODELS.speech,
      voice: scenario.voice,
      input: characterText,
      instructions:
        'Speak like a real person in an unscripted conversation. Natural pace, not announcer-like.',
      response_format: 'mp3',
    });
    audioBase64 = Buffer.from(await speech.arrayBuffer()).toString('base64');
  } catch {
    // Text-only is a degraded but working experience; do not fail the turn.
  }

  return Response.json({
    repText,
    characterText,
    audio: audioBase64,
    audioMimeType: 'audio/mpeg',
  });
}
