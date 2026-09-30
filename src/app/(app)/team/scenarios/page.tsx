import type { Metadata } from 'next';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { ScenarioList } from '@/components/team/ScenarioList';
import type { ScenarioDraft } from '@/components/team/ScenarioEditor';

export const metadata: Metadata = { title: 'Scenarios' };

/**
 * Roleplay characters built from the company's real market. Published ones
 * appear on every rep's Practice screen beside the built-in library. A
 * portfolio's published scenarios appear here too, read-only, because they
 * reach this company's reps as well (migration 0018).
 */
export default async function ScenariosPage() {
  const session = await getSessionContext();
  if (!session) return null;
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from('custom_scenarios')
    .select('id, org_id, title, setup, character_brief, objections, difficulty, focus_stages, persona, voice, language, is_published')
    .order('updated_at', { ascending: false });

  const rows = data ?? [];
  const own: ScenarioDraft[] = rows
    .filter((r) => r.org_id === session.orgId)
    .map((r) => ({
      id: r.id,
      title: r.title,
      setup: r.setup,
      characterBrief: r.character_brief,
      objections: r.objections ?? [],
      difficulty: r.difficulty,
      focusStages: r.focus_stages ?? [],
      persona: r.persona,
      voice: r.voice,
      language: r.language,
      isPublished: r.is_published,
    }));
  const inherited = rows.filter((r) => r.org_id !== session.orgId);

  return (
    <div>
      <p className="team-note mb-4">
        Write the homeowners, adjusters, and property managers your reps actually face — your carriers, your
        region, your objections. Reps see the setup; the character brief stays hidden and drives the voice.
      </p>
      <ScenarioList scenarios={own} />

      {inherited.length > 0 && (
        <>
          <h2 className="team-section-title">From your portfolio</h2>
          <div className="space-y-2">
            {inherited.map((s) => (
              <div key={s.id} className="card flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{s.title}</span>
                <span className="team-pill team-pill-gold">House standard · read-only</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
