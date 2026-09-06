/**
 * Shared limits for the practice loop.
 *
 * Realtime voice is the most expensive surface in the product — priced per
 * minute of audio in and out — so these two numbers are what stand between a
 * plan's allowance and the bill.
 */

/**
 * The longest a single session can bill for.
 *
 * Session length is measured from started_at against the wall clock, which is
 * only the real audio time if the rep scored it when they finished. A session
 * opened on Monday and scored on Wednesday would otherwise meter two days of
 * audio nobody consumed.
 */
export const MAX_PRACTICE_SECONDS = 3600;

/** Elapsed seconds for a session, floored at zero and capped at the ceiling. */
export function billableSeconds(startedAt: string): number {
  const elapsed = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  return Math.min(elapsed, MAX_PRACTICE_SECONDS);
}
