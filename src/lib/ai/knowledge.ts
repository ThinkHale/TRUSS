/**
 * Enterprise knowledge retrieval.
 *
 * Chunks a tenant's own documents, embeds them, and pulls the most relevant
 * passages into the Coach's context at question time. This is the mechanism
 * behind "a customized version of TRUSS that learns from their material".
 */

import { openai, MODELS } from './openai';
import { supabaseServer } from '@/lib/supabase/server';
import type { KnowledgeChunk } from './prompts';

/** Roughly 1,600 characters with 200 of overlap keeps passages coherent. */
const CHUNK_SIZE = 1600;
const CHUNK_OVERLAP = 200;

/**
 * Splits on paragraph boundaries where possible so a chunk does not cut a
 * thought in half. Falls back to hard slicing for walls of text.
 */
export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= CHUNK_SIZE) return clean ? [clean] : [];

  const paragraphs = clean.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if (para.length > CHUNK_SIZE) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }
      for (let i = 0; i < para.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        chunks.push(para.slice(i, i + CHUNK_SIZE).trim());
      }
      continue;
    }

    if (current.length + para.length + 2 > CHUNK_SIZE) {
      chunks.push(current.trim());
      // Carry the tail forward so context survives the boundary.
      current = current.slice(-CHUNK_OVERLAP) + '\n\n' + para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 40);
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const res = await openai().embeddings.create({
    model: MODELS.embedding,
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

/**
 * Retrieves passages relevant to the rep's question.
 * Returns an empty array on any failure — the Coach must still answer without
 * the knowledge base rather than erroring out on a rep mid-conversation.
 */
export async function retrieveKnowledge(
  orgId: string,
  query: string,
  limit = 6,
): Promise<KnowledgeChunk[]> {
  try {
    const [embedding] = await embed([query]);
    if (!embedding) return [];

    const supabase = await supabaseServer();
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      target_org: orgId,
      match_count: limit,
      min_similarity: 0.25,
    });

    if (error || !data) return [];

    return (data as { content: string; citation_label: string }[]).map((row) => ({
      source: row.citation_label,
      content: row.content,
    }));
  } catch {
    return [];
  }
}
