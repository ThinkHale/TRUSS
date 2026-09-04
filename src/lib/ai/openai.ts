/**
 * OpenAI access. Server-only — the key never reaches the browser.
 *
 * Model choices are centralized here so they can be swapped per environment
 * or per enterprise tenant without touching feature code.
 */

import OpenAI from 'openai';

let client: OpenAI | null = null;

export function openai(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server.');
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

export const MODELS = {
  /** TRUSS Coach conversation and account briefs. */
  coach: process.env.OPENAI_MODEL_COACH ?? 'gpt-4.1',
  /** Structured work: scorecards, research synthesis, campaign generation. */
  structured: process.env.OPENAI_MODEL_STRUCTURED ?? 'gpt-4.1',
  /** Speech-to-speech roleplay. */
  realtime: process.env.OPENAI_MODEL_REALTIME ?? 'gpt-realtime',
  /** Transcription for the push-to-talk fallback path. */
  transcribe: process.env.OPENAI_MODEL_TRANSCRIBE ?? 'gpt-4o-transcribe',
  /** Speech synthesis for the push-to-talk fallback path. */
  speech: process.env.OPENAI_MODEL_SPEECH ?? 'gpt-4o-mini-tts',
  /** Knowledge-base embeddings for the Enterprise RAG index. */
  embedding: process.env.OPENAI_MODEL_EMBEDDING ?? 'text-embedding-3-small',
} as const;

/** Must match the vector dimension in the knowledge-base migration. */
export const EMBEDDING_DIMENSIONS = 1536;

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}
