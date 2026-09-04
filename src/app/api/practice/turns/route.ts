/**
 * Records roleplay transcript turns.
 *
 * The browser batches turns as the Realtime connection emits transcriptions,
 * so a dropped connection on a job site still leaves a scorable transcript.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  turns: z
    .array(
      z.object({
        role: z.enum(['rep', 'character']),
        text: z.string().min(1).max(6000),
        offsetMs: z.number().int().nonnegative().nullable().optional(),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(req: NextRequest) {
  const session = await getSessionContext();
  if (!session) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const { sessionId, turns } = parsed.data;
  const supabase = await supabaseServer();

  // RLS already scopes this, but an explicit check gives a clean 404.
  const { data: owned } = await supabase
    .from('practice_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', session.userId)
    .maybeSingle();

  if (!owned) return Response.json({ error: 'Session not found.' }, { status: 404 });

  const { error } = await supabase.from('practice_turns').insert(
    turns.map((t) => ({
      session_id: sessionId,
      org_id: session.orgId,
      role: t.role,
      text: t.text,
      offset_ms: t.offsetMs ?? null,
    })),
  );

  if (error) return Response.json({ error: 'Could not save the transcript.' }, { status: 500 });

  return Response.json({ saved: turns.length });
}
