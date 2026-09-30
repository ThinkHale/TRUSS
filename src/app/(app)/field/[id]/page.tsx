import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { Scorecard, type ScorecardData } from '@/components/practice/Scorecard';

export const metadata: Metadata = { title: 'Field review' };

/**
 * One scored real conversation. Readable by the rep it belongs to and their
 * company's managers (field_reviews policies, migration 0019) — the same
 * people who can read a practice scorecard.
 */
export default async function FieldReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const t = await getTranslations('field');
  const session = await getSessionContext();
  if (!session) return null;
  const supabase = await supabaseServer();

  const { data: review } = await supabase.from('field_reviews').select('*').eq('id', id).maybeSingle();
  if (!review) notFound();

  const { data: rep } =
    review.user_id !== session.userId
      ? await supabase.from('profiles').select('full_name').eq('id', review.user_id).maybeSingle()
      : { data: null };

  return (
    <div className="app-page mx-auto max-w-3xl">
      <p className="mb-3 text-sm">
        <Link href={review.user_id === session.userId ? '/field' : `/team/reps/${review.user_id}`}
          className="font-semibold text-ink-500 hover:underline">
          ← {review.user_id === session.userId ? t('back') : rep?.full_name || 'Rep'}
        </Link>
      </p>
      <h1 className="text-2xl font-extrabold tracking-tight">{review.context}</h1>
      <p className="team-note mb-5">
        {new Date(review.created_at).toLocaleString()}
        {review.audio_seconds ? ` · ${Math.round(review.audio_seconds / 60)} min` : ''} · {review.consent_statement}
      </p>
      <Scorecard
        data={review as unknown as ScorecardData}
        transcript={review.transcript as { role: 'rep' | 'character'; text: string }[]}
      />
    </div>
  );
}
