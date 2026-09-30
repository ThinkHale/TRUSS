import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getSessionContext, isManagerRole } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import { FieldReviewForm } from '@/components/field/FieldReviewForm';

export const metadata: Metadata = { title: 'Field review' };

/** Recording or uploading a real conversation, and the rep's past reviews. */
export default async function FieldPage() {
  const t = await getTranslations('field');
  const session = await getSessionContext();
  if (!session) return null;
  const supabase = await supabaseServer();

  const [{ data: reviews }, team] = await Promise.all([
    supabase
      .from('field_reviews')
      .select('id, context, weighted_score, has_critical, created_at')
      .eq('org_id', session.orgId)
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false })
      .limit(20),
    isManagerRole(session.role)
      ? supabase.rpc('org_member_directory', { p_org: session.orgId }).then(({ data }) =>
          ((data ?? []) as { user_id: string; full_name: string | null; email: string }[])
            .filter((p) => p.user_id !== session.userId)
            .map((p) => ({ user_id: p.user_id, label: p.full_name || p.email })),
        )
      : Promise.resolve(null),
  ]);

  return (
    <div className="app-page">
      <header className="app-page-head">
        <div>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
      </header>

      <FieldReviewForm team={team} />

      <h2 className="team-section-title">{t('recent')}</h2>
      {(reviews ?? []).length === 0 ? (
        <p className="card team-empty">{t('none')}</p>
      ) : (
        <ul className="space-y-2">
          {(reviews ?? []).map((r) => (
            <li key={r.id}>
              <Link href={`/field/${r.id}`} className="card flex items-center justify-between gap-3 !p-4 hover:border-gold-500">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{r.context}</span>
                  <span className="text-xs text-ink-500">{new Date(r.created_at).toLocaleDateString()}</span>
                </span>
                <span className="flex items-center gap-2">
                  {r.has_critical && <span className="team-pill team-pill-bad">!</span>}
                  <b className="text-lg">{r.weighted_score}</b>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
