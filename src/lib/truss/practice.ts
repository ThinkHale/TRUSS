/**
 * Shared limits for the practice loop.
 *
 * Realtime voice is the most expensive surface in the product — priced per
 * minute of audio in and out — so these two numbers are what stand between a
 * plan's allowance and the bill.
 *
 * Client-safe: the practice picker imports this, so it must not import the
 * scenario library (which carries the knowledge base) except as a type.
 */

import type { Scenario } from './scenarios';

/** Shelves for the practice picker, so twenty-seven scenarios stay findable. */
export type PracticeGroup = 'storm' | 'home' | 'projects' | 'commercial';
export const PRACTICE_GROUPS: readonly PracticeGroup[] = ['storm', 'home', 'projects', 'commercial'];

export function practiceGroup(s: Pick<Scenario, 'trade' | 'motion'>): PracticeGroup {
  if (s.motion.startsWith('commercial')) return 'commercial';
  if (s.motion === 'canvassing_storm' || ['roofing', 'restoration', 'windows_siding', 'exterior'].includes(s.trade)) {
    return 'storm';
  }
  if (s.motion === 'remodeling' || ['remodeling', 'general_contracting', 'landscaping'].includes(s.trade)) {
    return 'projects';
  }
  return 'home';
}

/**
 * The longest a single session can bill for.
 *
 * Session length is measured from started_at against the wall clock, which is
 * only the real audio time if the rep scored it when they finished. A session
 * opened on Monday and scored on Wednesday would otherwise meter two days of
 * audio nobody consumed.
 */
export const MAX_PRACTICE_SECONDS = 3600;

/** Most turns one session may store. An hour of real talk is well under this. */
export const MAX_SESSION_TURNS = 400;

/** Roughly 12k tokens of transcript, which is more than an hour of speech. */
const MAX_TRANSCRIPT_CHARS = 48_000;

/**
 * Bounds what goes to the scorer. The opening and the ending are kept whole,
 * because that is where Trust is earned and where Secure happens; only the
 * middle of an unusually long transcript is cut, and the cut is marked so the
 * scorer does not read the gap as something the rep failed to do.
 */
export function fitTranscript<T extends { role: 'rep' | 'character'; text: string }>(
  turns: T[],
  maxChars = MAX_TRANSCRIPT_CHARS,
): { role: 'rep' | 'character'; text: string }[] {
  const size = (t: T) => t.text.length + 12;
  if (turns.reduce((n, t) => n + size(t), 0) <= maxChars) return turns;

  const head: T[] = [];
  let used = 0;
  for (const turn of turns) {
    if (used + size(turn) > maxChars / 3) break;
    head.push(turn);
    used += size(turn);
  }

  const tail: T[] = [];
  for (let i = turns.length - 1; i >= head.length; i--) {
    if (used + size(turns[i]) > maxChars) break;
    tail.unshift(turns[i]);
    used += size(turns[i]);
  }

  return [
    ...head,
    { role: 'character', text: '[Part of the middle of this conversation was omitted for length. Do not score the gap.]' },
    ...tail,
  ];
}

/** Elapsed seconds for a session, floored at zero and capped at the ceiling. */
export function billableSeconds(startedAt: string): number {
  const elapsed = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  return Math.min(elapsed, MAX_PRACTICE_SECONDS);
}
