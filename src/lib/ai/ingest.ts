/**
 * Knowledge ingestion, shared by the API route and the Knowledge page.
 *
 * Chunks a document, embeds it, and stores it scoped to one org. Writes use
 * the caller's own client, so the knowledge_documents / knowledge_chunks
 * policies (owners, admins, managers) are what decide whether it is allowed —
 * the role check callers make first is for a readable error, not the gate.
 *
 * Server only.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { chunkText, embedWithUsage } from './knowledge';
import { MODELS } from './openai';
import { recordTokens } from './usage';
import type { StageId } from '@/lib/truss/methodology';

export const KNOWLEDGE_SOURCE_TYPES = [
  'upload', 'pasted', 'url', 'transcript', 'policy', 'pricing', 'training',
] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];

/** Embedding calls are batched; this keeps each request under the token cap. */
const EMBED_BATCH = 64;

/** A 500,000-character document is a long manual. Anything larger is split first. */
export const MAX_DOCUMENT_CHARS = 500_000;
/**
 * Uploads arrive through a server action, whose body limit is 4 MB
 * (next.config.ts) — and Vercel refuses function bodies over 4.5 MB whatever
 * the app allows. This leaves room for the multipart overhead. A larger manual
 * is almost always large because of images; its text goes through the API.
 */
export const MAX_UPLOAD_BYTES = 3.9 * 1024 * 1024;

export interface IngestInput {
  title: string;
  content: string;
  sourceType: KnowledgeSourceType;
  sourceUri?: string | null;
  citationLabel?: string | null;
  stageTags?: StageId[];
}

export type IngestResult =
  | { ok: true; documentId: string; chunks: number }
  | { ok: false; status: number; message: string; documentId?: string };

export async function ingestDocument(
  supabase: SupabaseClient,
  ctx: { orgId: string; userId: string },
  input: IngestInput,
): Promise<IngestResult> {
  const content = input.content.replace(/\u0000/g, '').trim();
  if (content.length < 50) {
    return { ok: false, status: 422, message: 'That document has almost no text in it.' };
  }
  if (content.length > MAX_DOCUMENT_CHARS) {
    return {
      ok: false,
      status: 413,
      message: 'That document is too long to load in one piece. Split it into sections and load each one.',
    };
  }

  const { data: doc, error: docError } = await supabase
    .from('knowledge_documents')
    .insert({
      org_id: ctx.orgId,
      title: input.title,
      source_type: input.sourceType,
      source_uri: input.sourceUri ?? null,
      citation_label: input.citationLabel || input.title,
      stage_tags: input.stageTags ?? [],
      byte_size: Buffer.byteLength(content, 'utf8'),
      status: 'processing',
      uploaded_by: ctx.userId,
    })
    .select('id')
    .single();

  if (docError || !doc) {
    return { ok: false, status: docError?.code === '42501' ? 403 : 500, message: 'Could not create the document.' };
  }

  const chunks = chunkText(content);
  if (!chunks.length) {
    await supabase
      .from('knowledge_documents')
      .update({ status: 'failed', error_message: 'No usable text found.' })
      .eq('id', doc.id);
    return { ok: false, status: 422, message: 'That document had no usable text.', documentId: doc.id };
  }

  try {
    let written = 0;
    let tokens = 0;
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const { vectors, promptTokens } = await embedWithUsage(batch);
      tokens += promptTokens;

      const rows = batch.map((text, j) => ({
        document_id: doc.id,
        org_id: ctx.orgId,
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
      target_org: ctx.orgId,
      target_user: ctx.userId,
      event_kind: 'knowledge_ingest',
      qty: written,
    });
    await recordTokens(supabase, ctx.orgId, 'knowledge_ingest', MODELS.embedding, { prompt_tokens: tokens });
    await supabase.rpc('record_org_event', {
      p_org: ctx.orgId,
      p_action: 'knowledge.add',
      p_detail: { document_id: doc.id, title: input.title, chunks: written },
    });

    return { ok: true, documentId: doc.id, chunks: written };
  } catch (err) {
    // Left behind marked failed so an admin can see why.
    await supabase
      .from('knowledge_documents')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message.slice(0, 500) : 'Ingestion failed.',
      })
      .eq('id', doc.id);
    return { ok: false, status: 500, message: 'Could not process that document.', documentId: doc.id };
  }
}

/**
 * Pulls plain text out of an uploaded file. PDF and Word are what companies
 * actually hand over; text, Markdown, and CSV pass through.
 *
 * Returns null for a type TRUSS cannot read, rather than guessing — a scanned
 * PDF with no text layer comes back as an empty string, which the caller
 * reports as "no usable text" instead of loading nothing silently.
 */
export async function extractText(file: File): Promise<string | null> {
  const name = file.name.toLowerCase();
  const type = file.type;
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    const { extractText: pdfText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(bytes);
    const { text } = await pdfText(pdf, { mergePages: false });
    // Page breaks become paragraph breaks so the chunker keeps pages apart.
    return (Array.isArray(text) ? text : [text]).join('\n\n');
  }

  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return value;
  }

  if (
    type.startsWith('text/') ||
    /\.(txt|md|markdown|csv|tsv|json)$/.test(name)
  ) {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  return null;
}
