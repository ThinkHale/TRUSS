/**
 * Enterprise knowledge ingestion, over the API.
 *
 * Takes a document a customer wants their TRUSS to learn from — a playbook, a
 * pricing sheet, a warranty, a training transcript — chunks it, embeds it, and
 * makes it retrievable by that org's Coach only. The Knowledge page does the
 * same through a server action; both run src/lib/ai/ingest.ts.
 *
 * Restricted to owners, admins, and managers: what goes in here shapes what
 * every rep in the org gets coached to do.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { isOpenAIConfigured } from '@/lib/ai/openai';
import { ingestDocument, KNOWLEDGE_SOURCE_TYPES, MAX_DOCUMENT_CHARS } from '@/lib/ai/ingest';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { STAGE_IDS, type StageId } from '@/lib/truss/methodology';

export const runtime = 'nodejs';
export const maxDuration = 120;

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(50).max(MAX_DOCUMENT_CHARS),
  sourceType: z.enum(KNOWLEDGE_SOURCE_TYPES).default('pasted'),
  sourceUri: z.string().url().nullable().optional(),
  citationLabel: z.string().max(200).nullable().optional(),
  stageTags: z.array(z.enum(STAGE_IDS as unknown as [StageId, ...StageId[]])).default([]),
});

export async function POST(req: NextRequest) {
  if (!isOpenAIConfigured()) {
    return Response.json({ error: 'Knowledge ingestion is not configured yet.' }, { status: 503 });
  }

  const session = await getSessionContext();
  if (!session) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  if (!['owner', 'admin', 'manager'].includes(session.role)) {
    return Response.json(
      { error: 'Only owners, admins, and managers can add company knowledge.' },
      { status: 403 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const result = await ingestDocument(await supabaseServer(), session, parsed.data);
  if (!result.ok) return Response.json({ error: result.message }, { status: result.status });

  return Response.json({ documentId: result.documentId, chunks: result.chunks, status: 'ready' });
}
