/**
 * TRUSS Coach — streaming chat.
 *
 * The rep's messages never leave the server unauthenticated, the OpenAI key
 * never reaches the browser, and every request is scoped to the caller's org
 * so an Enterprise tenant's knowledge base can be safely mixed in.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { openai, MODELS, isOpenAIConfigured } from '@/lib/ai/openai';
import { coachSystemPrompt, stageCoachPrompt } from '@/lib/ai/prompts';
import { retrieveKnowledge } from '@/lib/ai/knowledge';
import { getSessionContext, loadOrgContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { STAGE_IDS, type StageId } from '@/lib/truss/methodology';

export const runtime = 'nodejs';
export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().min(1).max(8000),
  stageFocus: z.enum(STAGE_IDS as unknown as [StageId, ...StageId[]]).nullable().optional(),
  accountId: z.string().uuid().nullable().optional(),
});

/** Last N turns sent back to the model. Keeps latency and cost predictable. */
const HISTORY_LIMIT = 20;

export async function POST(req: NextRequest) {
  if (!isOpenAIConfigured()) {
    return Response.json({ error: 'TRUSS Coach is not configured yet.' }, { status: 503 });
  }

  const session = await getSessionContext();
  if (!session) {
    return Response.json({ error: 'Sign in to use TRUSS Coach.' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const { message, stageFocus, accountId } = parsed.data;

  const supabase = await supabaseServer();

  // Quota is checked before spending a token, not after.
  const { data: allowed } = await supabase.rpc('within_quota', {
    target_org: session.orgId,
    event_kind: 'coach_message',
  });
  if (allowed === false) {
    return Response.json(
      { error: 'quota_exceeded', message: 'You have used all your Coach messages this month.' },
      { status: 429 },
    );
  }

  // Create the conversation lazily so an abandoned draft leaves nothing behind.
  let conversationId = parsed.data.conversationId ?? null;
  if (!conversationId) {
    const { data, error } = await supabase
      .from('coach_conversations')
      .insert({
        org_id: session.orgId,
        user_id: session.userId,
        title: message.slice(0, 80),
        stage_focus: stageFocus ?? null,
        account_id: accountId ?? null,
      })
      .select('id')
      .single();

    if (error || !data) {
      return Response.json({ error: 'Could not start the conversation.' }, { status: 500 });
    }
    conversationId = data.id;
  }

  const { data: history } = await supabase
    .from('coach_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  const priorTurns = (history ?? []).reverse();

  // Enterprise context plus anything relevant from the tenant's own material.
  const orgContext = await loadOrgContext(session);
  orgContext.knowledge = await retrieveKnowledge(session.orgId, message);

  const system = stageFocus
    ? stageCoachPrompt(stageFocus, orgContext)
    : coachSystemPrompt(orgContext);

  await supabase.from('coach_messages').insert({
    conversation_id: conversationId,
    org_id: session.orgId,
    role: 'user',
    content: message,
  });

  const stream = await openai().chat.completions.create({
    model: MODELS.coach,
    stream: true,
    temperature: 0.6,
    max_tokens: 1600,
    messages: [
      { role: 'system', content: system },
      ...priorTurns.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ],
  });

  const citations = (orgContext.knowledge ?? []).map((k) => k.source);
  const encoder = new TextEncoder();
  let full = '';

  const body = new ReadableStream({
    async start(controller) {
      // The client needs the conversation id before the first token so it can
      // update the URL without waiting for the answer to finish.
      controller.enqueue(
        encoder.encode(
          `${JSON.stringify({ type: 'meta', conversationId, citations })}\n`,
        ),
      );

      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (!delta) continue;
          full += delta;
          controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'delta', text: delta })}\n`));
        }
      } catch {
        controller.enqueue(
          encoder.encode(`${JSON.stringify({ type: 'error', message: 'The Coach dropped out. Try again.' })}\n`),
        );
      }

      // Persist and meter after the stream closes, so a disconnect mid-answer
      // still records what the rep actually received.
      if (full) {
        await supabase.from('coach_messages').insert({
          conversation_id: conversationId,
          org_id: session.orgId,
          role: 'assistant',
          content: full,
          citations: JSON.stringify(citations),
        });
        await supabase
          .from('coach_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
        await supabase.rpc('record_usage', {
          target_org: session.orgId,
          target_user: session.userId,
          event_kind: 'coach_message',
          qty: 1,
          model_name: MODELS.coach,
        });
      }

      controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'done' })}\n`));
      controller.close();
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
