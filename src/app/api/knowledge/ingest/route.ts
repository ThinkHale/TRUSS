/**
 * Enterprise knowledge ingestion.
 *
 * Takes a document a customer wants their TRUSS to learn from — a playbook, a
 * pricing sheet, a warranty, a training transcript — chunks it, embeds it, and
 * makes it retrievable by that org's Coach only.
 *
 * Restricted to owners, admins, and managers: what goes in here shapes what
 * every rep in the org gets coached to do.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { chunkText, embed } from '@/lib/ai/knowledge';
import { isOpenAIConfigured } from '@/lib/ai/openai';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { STAGE_IDS, type StageId } from '@/lib/truss/methodology';

export const runtime = 'nodejs';
export const maxDuration = 120;

const bodySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(50).max(500_000),
  sourceType: z
    .enum(['upload', 'pasted', 'url', 'transcript', 'policy', 'pricing', 'training'])
    .default('pasted'),
  sourceUri: z.string().url().nullable().optional(),
  citationLabel: z.string().max(200).nullable().optional(),
  stageTags: z.array(z.enum(STAGE_IDS as unknown as [StageId, ...StageId[]])).default([]),
});

/** Embedding calls are batched; this keeps each request under the token cap. */
const EMBED_BATCH = 64;

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

  const { title, content, sourceType, sourceUri, citationLabel, stageTags } = parsed.data;
  const supabase = await supabaseServer();

  const { data: doc, error: docError } = await supabase
    .from('knowledge_documents')
    .insert({
      org_id: session.orgId,
      title,
      source_type: sourceType,
      source_uri: sourceUri ?? null,
      citation_label: citationLabel ?? title,
      stage_tags: stageTags,
      byte_size: Buffer.byteLength(content, 'utf8'),
      status: 'processing',
      uploaded_by: session.userId,
    })
    .select('id')
    .single();

  if (docError || !doc) {
    return Response.json({ error: 'Could not create the document.' }, { status: 500 });
  }

  const chunks = chunkText(content);
  if (!chunks.length) {
    await supabase
      .from('knowledge_documents')
      .update({ status: 'failed', error_message: 'No usable text found.' })
      .eq('id', doc.id);
    return Response.json({ error: 'That document had no usable text.' }, { status: 422 });
  }

  try {
    let written = 0;
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const vectors = await embed(batch);

      const rows = batch.map((text, j) => ({
        document_id: doc.id,
        org_id: session.orgId,
        chunk_index: i + j,
        content: text,
        embedding: vectors[j] as unknown as string,
        token_count: Math.ceil(text.length / 4),
      }));

      const { error } = await supabase.from('knowledge_chunks').insert(rows);
      if (error) throw new Error(error.message);
      written += rows.length;
    }

    await supabase
      .from('knowledge_documents')
      .update({ status: 'ready', chunk_count: written })
      .eq('id', doc.id);

    await supabase.rpc('record_usage', {
      target_org: session.orgId,
      target_user: session.userId,
      event_kind: 'knowledge_ingest',
      qty: written,
    });

    return Response.json({ documentId: doc.id, chunks: written, status: 'ready' });
  } catch (err) {
    // Leave the document row behind marked failed so an admin can see why.
    await supabase
      .from('knowledge_documents')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message.slice(0, 500) : 'Ingestion failed.',
      })
      .eq('id', doc.id);

    return Response.json({ error: 'Could not process that document.' }, { status: 500 });
  }
}
