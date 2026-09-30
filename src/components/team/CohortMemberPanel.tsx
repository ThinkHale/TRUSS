'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { issueCertification, recordManagerCheck, setCohortMembers, type ProgramResult } from '@/app/actions/program';
import { CERTIFICATION_CRITERIA, CERTIFICATION_DISCLAIMER, PROGRAM, type CertificationStatus } from '@/lib/truss/curriculum';

export interface WeekProgress {
  week: number;
  prework_response: string | null;
  prework_submitted_at: string | null;
  field_evidence: string | null;
  field_submitted_at: string | null;
  manager_note: string | null;
  manager_checked_at: string | null;
}

/**
 * One person in a cohort, opened: every week's submissions, the manager's
 * check for each, and certification when the criteria are met. The checks and
 * the credential are enforced in SQL; this is the form in front of them.
 */
export function CohortMemberPanel({
  cohortId,
  userId,
  name,
  isSelf,
  weeks,
  practiceByWeek,
  status,
}: {
  cohortId: string;
  userId: string;
  name: string;
  isSelf: boolean;
  weeks: WeekProgress[];
  practiceByWeek: number[];
  status: CertificationStatus | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [result, setResult] = useState<ProgramResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [evidence, setEvidence] = useState(false);

  const run = (fn: () => Promise<ProgramResult>) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) router.refresh();
    });

  const byWeek = new Map(weeks.map((w) => [w.week, w]));
  const c = CERTIFICATION_CRITERIA.en;

  return (
    <div className="mt-3 grid gap-3">
      {PROGRAM.map((week) => {
        const w = byWeek.get(week.week);
        const ready = Boolean(w?.prework_submitted_at && w?.field_submitted_at);
        return (
          <details key={week.week} className="program-week" data-state={w?.manager_checked_at ? 'done' : undefined}>
            <summary>
              <span className="program-week-num">{week.week}</span>
              <span className="flex-1 font-semibold">{week.title.en}</span>
              <span className="team-note">
                {practiceByWeek[week.week - 1] ?? 0} practice ·{' '}
                {w?.manager_checked_at ? 'checked' : ready ? 'ready to check' : w?.prework_submitted_at || w?.field_submitted_at ? 'in progress' : 'not started'}
              </span>
            </summary>
            <div className="program-week-body">
              <div>
                <h4>Pre-work</h4>
                <p className="whitespace-pre-wrap">{w?.prework_response ?? <span className="text-ink-400">Not submitted.</span>}</p>
              </div>
              <div>
                <h4>Field evidence</h4>
                <p className="whitespace-pre-wrap">{w?.field_evidence ?? <span className="text-ink-400">Not submitted.</span>}</p>
              </div>
              {w?.manager_note && (
                <div>
                  <h4>Your note</h4>
                  <p className="whitespace-pre-wrap">{w.manager_note}</p>
                </div>
              )}
              {!isSelf && (
                <div className="grid gap-2">
                  <textarea className="field min-h-20" placeholder="One behavior, one practice, one field target, and a date to review. (Optional)"
                    value={notes[week.week] ?? ''} onChange={(e) => setNotes({ ...notes, [week.week]: e.target.value })} />
                  <div className="flex flex-wrap gap-2">
                    {!w?.manager_checked_at ? (
                      <button type="button" className="btn-primary" disabled={pending || !ready}
                        title={ready ? undefined : 'Both pre-work and field evidence are needed first'}
                        onClick={() => run(() => recordManagerCheck({ cohortId, userId, week: week.week, note: notes[week.week] || null }))}>
                        Check week {week.week}
                      </button>
                    ) : (
                      <button type="button" className="btn-ghost" disabled={pending}
                        onClick={() => run(() => recordManagerCheck({ cohortId, userId, week: week.week, note: notes[week.week] || null, clear: true }))}>
                        Reopen week {week.week}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </details>
        );
      })}

      <section className="card">
        <h4 className="mb-2 font-bold">Certification</h4>
        {status?.certified ? (
          <p className="team-result-ok">
            Certified {status.issued_at ? new Date(status.issued_at).toLocaleDateString() : ''} · credential{' '}
            <code>{status.credential_code}</code>
          </p>
        ) : status ? (
          <>
            <ul className="grid gap-1 text-sm">
              <Criterion ok={status.modules_completed === 8} text={`${c.modules} (${status.modules_completed}/8)`} />
              <Criterion ok={status.rubric_met} text={`${c.rubric} (latest: ${status.latest_weighted ?? '—'})`} />
              <Criterion ok={status.final_two_clean} text={c.finalTwo} />
              <Criterion ok={status.field_behavior_shown} text={c.field} />
            </ul>
            {isSelf ? (
              <p className="team-note mt-3">Another manager has to certify you.</p>
            ) : (
              <div className="mt-3 grid gap-2 text-sm">
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={routing} onChange={(e) => setRouting(e.target.checked)} />
                  <span>I confirm {name} routes sales situations with at least 80% accuracy.</span>
                </label>
                <label className="flex items-start gap-2">
                  <input type="checkbox" checked={evidence} onChange={(e) => setEvidence(e.target.checked)} />
                  <span>I confirm {name} uses evidence, limitations, and next steps accurately.</span>
                </label>
                <div>
                  <button type="button" className="btn-primary" disabled={pending || !status.eligible || !routing || !evidence}
                    onClick={() => run(() => issueCertification({ cohortId, userId, routingAttested: routing, evidenceAttested: evidence }))}>
                    Issue the credential
                  </button>
                </div>
                <p className="team-note">{CERTIFICATION_DISCLAIMER.en}</p>
              </div>
            )}
          </>
        ) : (
          <p className="team-note">Status unavailable.</p>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="text-sm font-semibold text-nogo hover:underline" disabled={pending}
          onClick={() => {
            if (confirm(`Remove ${name} from this cohort? Their submissions for it are deleted.`)) {
              run(() => setCohortMembers({ cohortId, add: [], remove: [userId] }));
            }
          }}>
          Remove from cohort
        </button>
        {result && (
          <span role="status" className={result.ok ? 'team-result-ok' : 'team-result-bad'}>
            {result.ok ? (result.code ? `Issued ${result.code}` : 'Saved.') : result.message}
          </span>
        )}
      </div>
    </div>
  );
}

function Criterion({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden style={{ color: ok ? 'var(--color-go)' : 'var(--color-ink-400)' }}>{ok ? '✓' : '○'}</span>
      <span className={ok ? '' : 'text-ink-600'}>{text}<span className="sr-only">{ok ? ' — met' : ' — not yet'}</span></span>
    </li>
  );
}

export function AddToCohort({
  cohortId,
  candidates,
}: {
  cohortId: string;
  candidates: { user_id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState('');
  if (!candidates.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <select className="field max-w-xs" value={chosen} onChange={(e) => setChosen(e.target.value)} aria-label="Person to add">
        <option value="">Add someone…</option>
        {candidates.map((c) => <option key={c.user_id} value={c.user_id}>{c.label}</option>)}
      </select>
      <button type="button" className="btn-ghost" disabled={pending || !chosen}
        onClick={() => start(async () => {
          const r = await setCohortMembers({ cohortId, add: [chosen], remove: [] });
          if (r.ok) {
            setChosen('');
            router.refresh();
          }
        })}>
        Add
      </button>
    </div>
  );
}
