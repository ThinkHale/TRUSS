/**
 * Records what a model call actually cost, in the provider's own units.
 *
 * usage_events counts product actions for quotas. This records tokens per
 * call (ai_token_usage, migration 0024) so the operator economics view can
 * price them. It never throws and never blocks the response: a rep should not
 * lose an answer because a cost row failed to write, and the quota metering
 * that actually gates spend is separate.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type AiFeature =
  | 'coach'
  | 'scoring'
  | 'research'
  | 'campaign'
  | 'account_brief'
  | 'practice_reply'
  | 'field_review'
  | 'knowledge_ingest'
  | 'transcription'
  | 'speech';

/** The subset of the OpenAI usage object every endpoint shares. */
export interface ProviderUsage {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  prompt_tokens_details?: { cached_tokens?: number | null } | null;
  /** Embeddings and some audio endpoints report only a total or input count. */
  total_tokens?: number | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
}

export async function recordTokens(
  supabase: SupabaseClient,
  orgId: string,
  feature: AiFeature,
  model: string,
  usage: ProviderUsage | null | undefined,
  audioSeconds = 0,
): Promise<void> {
  const input = usage?.prompt_tokens ?? usage?.input_tokens ?? (usage?.completion_tokens == null ? usage?.total_tokens : 0) ?? 0;
  const output = usage?.completion_tokens ?? usage?.output_tokens ?? 0;
  const cached = usage?.prompt_tokens_details?.cached_tokens ?? 0;
  if (!input && !output && !audioSeconds) return;

  try {
    const { error } = await supabase.rpc('record_tokens', {
      target_org: orgId,
      p_feature: feature,
      p_model: model,
      p_input: clamp(input),
      p_output: clamp(output),
      p_cached: clamp(cached),
      p_audio_seconds: Math.max(0, Math.min(86400, Math.round(audioSeconds))),
    });
    if (error) console.warn('record_tokens failed', { feature, code: error.code });
  } catch (err) {
    console.warn('record_tokens failed', { feature, err: err instanceof Error ? err.message : err });
  }
}

function clamp(n: number | null | undefined): number {
  return Math.max(0, Math.min(2_000_000, Math.round(n ?? 0)));
}
