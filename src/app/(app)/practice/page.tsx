import type { Metadata } from 'next';
import { getTranslations, getLocale } from 'next-intl/server';
import { PracticeRoom } from '@/components/practice/PracticeRoom';
import { SCENARIOS } from '@/lib/truss/scenarios';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Practice' };

export default async function PracticePage() {
  const t = await getTranslations('practice');
  const locale = (await getLocale()) as 'en' | 'es';
  const session = await getSessionContext();

  // An org's own scenarios sit alongside the built-in ones.
  let custom: { id: string; title: string; setup: string; difficulty: string; language: string }[] = [];
  if (session) {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from('custom_scenarios')
      .select('id, title, setup, difficulty, language')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    custom = data ?? [];
  }

  // Show the rep's own language first; the other language stays available on
  // purpose, because practicing a bilingual door is a real skill.
  const builtIn = [...SCENARIOS].sort((a, b) =>
    a.language === locale && b.language !== locale ? -1 : b.language === locale && a.language !== locale ? 1 : 0,
  );

  return (
    <div className="app-page">
      <header className="app-page-head">
        <div>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
      </header>

      <PracticeRoom
        scenarios={builtIn.map((s) => ({
          id: s.id,
          title: s.title,
          setup: s.setup,
          difficulty: s.difficulty,
          language: s.language,
          persona: s.persona,
          focusStages: [...s.focusStages],
        }))}
        customScenarios={custom.map((s) => ({
          id: s.id,
          title: s.title,
          setup: s.setup,
          difficulty: s.difficulty as 'easy' | 'moderate' | 'hard',
          language: s.language as 'en' | 'es',
          persona: 'homeowner' as const,
          focusStages: [],
        }))}
      />
    </div>
  );
}
