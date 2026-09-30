import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getSessionContext } from '@/lib/supabase/session';
import { supabaseServer } from '@/lib/supabase/server';
import {
  CERTIFICATION_CRITERIA,
  CERTIFICATION_DISCLAIMER,
  PRACTICE_SESSIONS_PER_WEEK,
  PROGRAM,
  currentWeek,
  weekWindow,
  type CertificationStatus,
} from '@/lib/truss/curriculum';
import { getStage } from '@/lib/truss/methodology';
import { ModuleSubmit } from '@/components/program/ModuleSubmit';

export const metadata: Metadata = { title: 'Program' };

/**
 * The rep's side of the eight-week program: where they are, what each week
 * asks, a place to hand in the week's work, and how close they are to the
 * credential. In the rep's language; the manager's view is /team/program.
 */
export default async function RepProgramPage() {
  const t = await getTranslations('program');
  const tNav = await getTranslations('nav');
  const locale = ((await getLocale()) === 'es' ? 'es' : 'en') as 'en' | 'es';
  const session = await getSessionContext();
  if (!session) return null;
  const supabase = await supabaseServer();

  const { data: enrolments } = await supabase
    .from('cohort_members')
    .select('cohort_id, cohorts(id, name, starts_on, archived_at)')
    .eq('user_id', session.userId)
    .eq('org_id', session.orgId);

  const cohort = (enrolments ?? [])
    .map((e) => e.cohorts as unknown as { id: string; name: string; starts_on: string; archived_at: string | null } | null)
    .filter((c): c is NonNullable<typeof c> => Boolean(c) && !c!.archived_at)
    .sort((a, b) => b.starts_on.localeCompare(a.starts_on))[0];

  if (!cohort) {
    return (
      <div className="app-page">
        <header className="app-page-head">
          <div><h1>{t('title')}</h1><p>{t('subtitle')}</p></div>
        </header>
        <section className="card">
          <p className="font-bold">{t('notEnrolled')}</p>
          <p className="mt-2 text-sm text-ink-600">{t('notEnrolledBody')}</p>
        </section>
        <ol className="mt-5 grid gap-2">
          {PROGRAM.map((w) => (
            <li key={w.week} className="card !p-4">
              <b>{t('week', { n: w.week })}: {w.title[locale]}</b>
              <p className="mt-1 text-sm text-ink-600">{w.focus[locale]}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const first = weekWindow(cohort.starts_on, 1);
  const last = weekWindow(cohort.starts_on, 8);
  const [{ data: progress }, { data: practice }, { data: status }] = await Promise.all([
    supabase.from('module_progress').select('*').eq('cohort_id', cohort.id).eq('user_id', session.userId),
    supabase
      .from('scorecards')
      .select('created_at')
      .eq('user_id', session.userId)
      .eq('org_id', session.orgId)
      .gte('created_at', first.from)
      .lt('created_at', last.to),
    supabase.rpc('certification_status', { p_cohort: cohort.id, p_user: session.userId }),
  ]);

  const now = currentWeek(cohort.starts_on);
  const cert = status as CertificationStatus | null;
  const criteria = CERTIFICATION_CRITERIA[locale];
  const byWeek = new Map((progress ?? []).map((p) => [p.week as number, p]));

  return (
    <div className="app-page">
      <header className="app-page-head">
        <div>
          <h1>{t('title')}</h1>
          <p>
            {t('cohort')}: {cohort.name}
            {now > 0 && <> · {t('week', { n: now })}</>}
          </p>
        </div>
      </header>

      {now === 0 && (
        <p className="card mb-4 font-semibold">
          {t('startsOn', { date: new Date(`${cohort.starts_on}T12:00:00Z`).toLocaleDateString(locale) })}
        </p>
      )}

      <div className="grid gap-3">
        {PROGRAM.map((w) => {
          const p = byWeek.get(w.week);
          const window = weekWindow(cohort.starts_on, w.week);
          const practiced = (practice ?? []).filter((s) => s.created_at >= window.from && s.created_at < window.to).length;
          const state = p?.manager_checked_at ? 'done' : w.week === now ? 'current' : undefined;
          const statusText = p?.manager_checked_at
            ? t('done')
            : p?.prework_submitted_at && p?.field_submitted_at
              ? t('waiting')
              : p?.prework_submitted_at || p?.field_submitted_at
                ? t('inProgress')
                : w.week === now
                  ? t('currentWeek')
                  : '';
          return (
            <details key={w.week} className="program-week" data-state={state} open={w.week === now}>
              <summary>
                <span className="program-week-num">{w.week}</span>
                <span className="flex-1">
                  <span className="block font-bold">{w.title[locale]}</span>
                  {statusText && <span className="text-xs font-semibold text-ink-500">{statusText}</span>}
                </span>
              </summary>
              <div className="program-week-body">
                <p>{w.focus[locale]}</p>
                <div>
                  <h4>{t('prework')}</h4>
                  <ul>{w.prework[locale].map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
                <div>
                  <h4>{t('live')}</h4>
                  <ul>{w.live[locale].map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
                <div>
                  <h4>{t('fieldTarget')}</h4>
                  <ul>{w.fieldTarget[locale].map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
                <div>
                  <h4>{t('measure')}</h4>
                  <p>{w.measure[locale]}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-paper-200/70 px-3 py-2">
                  <span className={practiced >= PRACTICE_SESSIONS_PER_WEEK ? 'font-bold text-go' : 'font-semibold'}>
                    {t('practice', { done: practiced, goal: PRACTICE_SESSIONS_PER_WEEK })}
                    {w.beams.length > 0 && <> · {w.beams.map((b) => getStage(b).name).join(', ')}</>}
                  </span>
                  <Link href="/practice" className="btn-ghost !min-h-0 !py-1.5 text-sm">{t('practiceNow')}</Link>
                </div>

                <ModuleSubmit cohortId={cohort.id} week={w.week} kind="prework" label={t('preworkLabel')}
                  initial={p?.prework_response ?? null} checked={Boolean(p?.manager_checked_at)} />
                <ModuleSubmit cohortId={cohort.id} week={w.week} kind="field" label={t('fieldLabel')}
                  initial={p?.field_evidence ?? null} checked={Boolean(p?.manager_checked_at)} />

                {p?.manager_note && (
                  <div className="rounded-lg border-l-4 border-gold-500 bg-gold-300/10 px-3 py-2">
                    <h4>{t('managerNote')}</h4>
                    <p className="whitespace-pre-wrap">{p.manager_note}</p>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>

      <section className="card mt-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">{t('certification')}</h2>
        {cert?.certified ? (
          <div className="mt-2">
            <p className="text-lg font-black text-go">{t('certified')}</p>
            <p className="mt-1 font-semibold">{t('credential', { code: cert.credential_code ?? '' })}</p>
            <p className="mt-1 text-sm text-ink-600">
              {t('verify')} <Link className="underline" href={`/verify/${cert.credential_code}`}>/verify/{cert.credential_code}</Link>
            </p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm font-semibold">{t('criteria')}</p>
            <ul className="mt-2 grid gap-1.5 text-sm">
              {[
                [cert?.modules_completed === 8, `${criteria.modules} (${cert?.modules_completed ?? 0}/8)`],
                [cert?.rubric_met, `${criteria.rubric}${cert?.latest_weighted != null ? ` (${cert.latest_weighted})` : ''}`],
                [cert?.final_two_clean, criteria.finalTwo],
                [cert?.field_behavior_shown, criteria.field],
                [false, criteria.routing],
                [false, criteria.evidence],
              ].map(([ok, text], i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden style={{ color: ok ? 'var(--color-go)' : 'var(--color-ink-400)' }}>{ok ? '✓' : '○'}</span>
                  <span>{text as string}<span className="sr-only"> — {ok ? t('met') : t('notYet')}</span></span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="team-note mt-3">{CERTIFICATION_DISCLAIMER[locale]}</p>
      </section>

      <p className="mt-4 text-center text-sm">
        <Link href="/field" className="font-semibold underline">{tNav('field')}</Link>
      </p>
    </div>
  );
}
