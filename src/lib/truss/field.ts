/**
 * Field reviews: scoring a real, recorded sales conversation (migration 0019).
 *
 * A recording has no roles — just talk. Before it can be scored against the
 * TRUSS rubric, which grades the rep and only the rep, it has to be split into
 * turns and each turn attributed to the rep or the customer. That is one
 * structured call here; scoring then reuses the practice scorer unchanged, so
 * a real conversation and a simulation are graded by the same standard.
 *
 * Server only.
 */

import { z } from 'zod';
import { customScenario, type Scenario } from './scenarios';

export const FIELD_AUDIO_BUCKET = 'field-audio';
/** The transcription endpoint's own ceiling. */
export const MAX_FIELD_AUDIO_BYTES = 25 * 1024 * 1024;
/** Uploads not submitted within this long are swept on the next upload. */
export const ORPHAN_UPLOAD_MS = 60 * 60 * 1000;

export const CONSENT_STATEMENT =
  'Everyone in this recording knew it was being recorded and agreed to it.';

/** A scenario shaped from what the rep said the conversation was, for routing and scoring. */
export function fieldScenario(context: string, language: 'en' | 'es', trades: string[] = []): Scenario {
  return customScenario({
    id: 'field-review',
    persona: 'homeowner',
    title: 'Field conversation',
    setup: `A real conversation in the field, recorded with everyone's consent. The rep described it as: ${context}`,
    // Nothing to play; the text is only there so trade and motion are
    // detected from what the rep said and the company's trades.
    character_brief: `${context} ${trades.join(' ')}`,
    objections: [],
    difficulty: 'moderate',
    focus_stages: null,
    voice: 'ash',
    language,
  });
}

export const diarizedSchema = z.object({
  turns: z
    .array(
      z.object({
        role: z.enum(['rep', 'customer']),
        text: z.string(),
      }),
    )
    .min(1),
});

export function diarizePrompt(companyName: string | undefined, context: string): string {
  return `You are preparing a transcript of a real sales conversation for scoring.

The raw transcript below has no speaker labels. Split it into speaker turns and label each one:
- "rep": the salesperson${companyName ? `, who works for ${companyName}` : ''}.
- "customer": everyone else — homeowner, spouse, property manager, adjuster, business owner.

The rep described the conversation as: ${context}

Rules:
- Keep every word verbatim, in order. Do not summarize, correct grammar, translate, or drop filler.
- Start a new turn whenever the speaker changes. Merge consecutive sentences by the same speaker.
- Attribute by what is said: the rep introduces themselves and the company, explains process, asks
  discovery questions, proposes, and asks for next steps. The customer describes their situation and
  reacts. When a line is genuinely ambiguous, attribute it to whoever the surrounding turns imply.

Respond with JSON only: { "turns": [ { "role": "rep" | "customer", "text": "…" } ] }`;
}

/** The practice scorer's transcript shape: the customer plays the "character" role. */
export function toScoringTranscript(turns: z.infer<typeof diarizedSchema>['turns']) {
  return turns
    .map((t) => ({ role: t.role === 'rep' ? ('rep' as const) : ('character' as const), text: t.text.trim() }))
    .filter((t) => t.text);
}
