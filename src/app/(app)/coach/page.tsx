import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CoachChat } from '@/components/coach/CoachChat';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Coach' };

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const t = await getTranslations('coach');
  const { c: conversationId } = await searchParams;
  const session = await getSessionContext();

  // Resume a conversation when one is addressed in the URL.
  let initialMessages: { role: 'user' | 'assistant'; content: string }[] = [];
  if (conversationId && session) {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from('coach_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100);
    initialMessages = (data ?? []) as typeof initialMessages;
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col md:h-[calc(100vh-4rem)]">
      <div className="border-b border-steel-800 px-5 py-4">
        <h1 className="text-2xl font-extrabold tracking-tight">{t('title')}</h1>
        <p className="mt-0.5 text-sm text-steel-400">{t('subtitle')}</p>
      </div>

      <CoachChat
        initialConversationId={conversationId ?? null}
        initialMessages={initialMessages}
      />
    </div>
  );
}
