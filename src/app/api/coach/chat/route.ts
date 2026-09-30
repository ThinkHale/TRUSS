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
import { coachSystemPrompt } from '@/lib/ai/prompts';
import { retrieveKnowledge } from '@/lib/ai/knowledge';
import { citationLabel } from '@/lib/truss/knowledge';
import { accountRecordText } from '@/lib/truss/accounts';
import { getSessionContext, loadOrgContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { recordTokens, type ProviderUsage } from '@/lib/ai/usage';
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
  const { message, stageFocus } = parsed.data;
  let accountId = parsed.data.accountId ?? null;

  const supabase = await supabaseServer();

  // Quota is checked before spending a token, not after.
  const { data: allowed, error: quotaError } = await supabase.rpc('within_quota', {
    target_org: session.orgId,
    event_kind: 'coach_message',
  });
  if (quotaError || allowed === null) {
    return Response.json({ error: 'Could not check usage. Please try again.' }, { status: 503 });
  }
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
  } else if (!accountId) {
    // Later turns of an account conversation keep its account in view.
    const { data: conversation } = await supabase
      .from('coach_conversations')
      .select('account_id')
      .eq('id', conversationId)
      .maybeSingle();
    accountId = conversation?.account_id ?? null;
  }

  const { data: history } = await supabase
    .from('coach_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  const priorTurns = (history ?? []).reverse();

  // Enterprise context plus anything relevant from the tenant's own material.
  const [orgContext, knowledge, account] = await Promise.all([
    loadOrgContext(session),
    retrieveKnowledge(session.orgId, message),
    accountId ? loadAccount(supabase, accountId) : Promise.resolve(null),
  ]);
  orgContext.knowledge = knowledge;

  // A follow-up like "what do I say then?" only means something next to the
  // turn before it, so the previous rep message rides along into retrieval.
  const lastRepTurn = [...priorTurns].reverse().find((m) => m.role === 'user')?.content ?? '';
  const { system, grounding } = coachSystemPrompt(orgContext, {
    query: `${lastRepTurn}\n${message}`,
    stageFocus,
    account,
  });

  const { error: messageError } = await supabase.from('coach_messages').insert({
    conversation_id: conversationId,
    org_id: session.orgId,
    role: 'user',
    content: message,
  });

  if (messageError) {
    return Response.json({ error: 'Could not save your message. Please try again.' }, { status: 500 });
  }

  const stream = await openai().chat.completions.create({
    model: MODELS.coach,
    stream: true,
    // The final chunk then carries token counts, which is what the answer cost.
    stream_options: { include_usage: true },
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

  // Company sources first, then the TRUSS knowledge base items the answer was
  // grounded in — stored with the message as the response trace.
  const citations = [
    ...(orgContext.knowledge ?? []).map((k) => k.source),
    ...grounding.map(citationLabel),
  ];
  const encoder = new TextEncoder();
  let full = '';
  let usage: ProviderUsage | null = null;

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
          if (chunk.usage) usage = chunk.usage;
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
      await recordTokens(supabase, session.orgId, 'coach', MODELS.coach, usage);

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

/**
 * The account as prompt text, read with the rep's own client so the accounts
 * policies decide whether they may see it. Null when it is not theirs to see.
 */
async function loadAccount(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  accountId: string,
): Promise<string | null> {
  const [{ data: account }, { data: contacts }, { data: activities }] = await Promise.all([
    supabase
      .from('accounts')
      .select(
        'name, type, address, city, state, status, truss_stage, carrier, claim_status, deductible_cents, date_of_loss, preferred_language, notes, updated_at',
      )
      .eq('id', accountId)
      .maybeSingle(),
    supabase
      .from('contacts')
      .select('name, relationship, is_decision_maker')
      .eq('account_id', accountId)
      .limit(10),
    supabase
      .from('activities')
      .select('type, stage, notes, occurred_at')
      .eq('account_id', accountId)
      .order('occurred_at', { ascending: false })
      .limit(10),
  ]);

  return account ? accountRecordText(account, contacts ?? [], activities ?? []) : null;
}
