/**
 * Finds the scenario a practice session is played against: a built-in one by
 * id, or an org-authored custom scenario. Server only.
 *
 * The session, reply, and scoring routes all need this. Each used to carry its
 * own copy, and the reply route's copy knew only the built-ins, so a custom
 * scenario played in text mode failed on the rep's first line.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { customScenario, getScenario, type Scenario } from './scenarios';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveScenario(
  supabase: SupabaseClient,
  orgId: string,
  scenarioId: string,
  options: { customScenarioId?: string | null; requirePublished?: boolean } = {},
): Promise<Scenario | null> {
  const builtIn = getScenario(scenarioId);
  if (builtIn) return builtIn;

  const id = options.customScenarioId ?? scenarioId;
  if (!UUID.test(id)) return null;

  let query = supabase.from('custom_scenarios').select('*').eq('id', id).eq('org_id', orgId);
  // Starting a session requires a published scenario; one already underway
  // keeps working if a manager unpublishes it mid-conversation.
  if (options.requirePublished) query = query.eq('is_published', true);

  const { data } = await query.maybeSingle();
  return data ? customScenario(data) : null;
}
