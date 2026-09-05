import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { STAGE_IDS, type StageId } from '@/lib/truss/methodology';
import { CoachChat } from '@/components/coach/CoachChat';
import { BrandLogo } from '@/components/brand/Logo';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Coach' };

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; stage?: string }>;
}) {
  const t = await getTranslations('coach');
  const { c: conversationId, stage } = await searchParams;
  const initialStage = STAGE_IDS.includes(stage as StageId) ? stage as StageId : null;
  const session = await getSessionContext();

  // Resume a conversation when one is addressed in the URL.
  let initialMessages: { role: 'user' | 'assistant'; content: string }[] = [];
  if (conversationId && session) {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from('coach_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(100);
    initialMessages = (data ?? []).reverse() as typeof initialMessages;
  }

  return (
    <div className="coach-page flex flex-col">
      <div className="app-page-heading">
        <h1 className="coach-brand-heading" aria-label={t('title')}><span className="coach-heading-plaque"><BrandLogo className="coach-heading-logo" /></span><span>Coach</span></h1>
        <p>{t('subtitle')}</p>
      </div>

      <CoachChat
        key={`${conversationId ?? 'new'}:${initialStage ?? 'all'}`}
        initialStage={initialStage}
        initialConversationId={conversationId ?? null}
        initialMessages={initialMessages}
      />
    </div>
  );
}
