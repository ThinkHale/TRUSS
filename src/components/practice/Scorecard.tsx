'use client';

import { useTranslations } from 'next-intl';
import { STAGES, getStage, type StageId } from '@/lib/truss/methodology';
import { MAX_STAGE_SCORE, MAX_TOTAL_SCORE } from '@/lib/truss/scoring';
import { STAGE_COLOR, scoreColor, cx } from '@/lib/truss/ui';

export interface ScorecardData {
  trust: number;
  relate: number;
  understand: number;
  solve: number;
  secure: number;
  total_score: number;
  outcome: 'signed' | 'next-step-set' | 'no-commitment' | 'lost';
  headline: string;
  summary: string;
  stages: {
    stage: StageId;
    score: number;
    evidence: string;
    wentWell: string[];
    improve: string;
    betterLine: string | null;
  }[];
}

/**
 * The scorecard.
 *
 * Ordered so a rep reads it the way it is useful: the one thing to fix, then
 * the shape of the whole conversation, then stage detail. Evidence is always a
 * quote of what they actually said — that is what makes the feedback stick.
 */
export function Scorecard({
  data,
  transcript,
}: {
  data: ScorecardData;
  transcript?: { role: 'rep' | 'character'; text: string }[];
}) {
  const t = useTranslations('scorecard');
  const tPractice = useTranslations('practice');
  const scores: Record<StageId, number> = {
    trust: data.trust,
    relate: data.relate,
    understand: data.understand,
    solve: data.solve,
    secure: data.secure,
  };

  return (
    <div className="space-y-5">
      {/* Headline first. If a rep reads one thing, it is this. */}
      <section className="card border-l-4" style={{ borderLeftColor: 'var(--color-signal-500)' }}>
        <h2 className="text-xs font-bold uppercase tracking-widest text-signal-400">
          {t('headline')}
        </h2>
        <p className="mt-2 text-lg font-bold leading-snug">{data.headline}</p>
        <p className="mt-3 text-sm leading-relaxed text-steel-300">{data.summary}</p>
      </section>

      {/* The whole conversation at a glance. */}
      <section className="card">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-steel-400">
            {t('title')}
          </h2>
          <div className="text-right">
            <span className="text-3xl font-black">{data.total_score}</span>
            <span className="text-steel-500">/{MAX_TOTAL_SCORE}</span>
          </div>
        </div>

        <ul className="mt-4 space-y-3">
          {STAGES.map((stage) => (
            <li key={stage.id}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-semibold" style={{ color: STAGE_COLOR[stage.id] }}>
                  {stage.name}
                </span>
                <span className="font-bold" style={{ color: scoreColor(scores[stage.id]) }}>
                  {scores[stage.id]}/{MAX_STAGE_SCORE}
                </span>
              </div>
              {/* Bar plus number, so the reading does not depend on color alone. */}
              <div className="h-2.5 overflow-hidden rounded-full bg-steel-800">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(scores[stage.id] / MAX_STAGE_SCORE) * 100}%`,
                    backgroundColor: scoreColor(scores[stage.id]),
                  }}
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between border-t border-steel-800 pt-4">
          <span className="text-sm text-steel-400">{t('outcome')}</span>
          <OutcomeBadge outcome={data.outcome} />
        </div>
      </section>

      {/* Stage-by-stage detail. */}
      {data.stages.map((detail) => {
        const stage = getStage(detail.stage);
        return (
          <section key={detail.stage} className="card">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-bold" style={{ color: STAGE_COLOR[detail.stage] }}>
                {stage.name}
              </h3>
              <span className="font-bold" style={{ color: scoreColor(detail.score) }}>
                {detail.score}/{MAX_STAGE_SCORE}
              </span>
            </div>

            {detail.evidence && (
              <blockquote className="mt-3 border-l-2 border-steel-700 pl-3 text-sm italic text-steel-300">
                <span className="not-italic font-semibold text-steel-400">{t('evidence')}: </span>
                “{detail.evidence}”
              </blockquote>
            )}

            {detail.wentWell.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-go">
                  {t('wentWell')}
                </h4>
                <ul className="mt-1.5 space-y-1 text-sm text-steel-200">
                  {detail.wentWell.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden style={{ color: 'var(--color-go)' }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-marginal">
                {t('improve')}
              </h4>
              <p className="mt-1.5 text-sm text-steel-200">{detail.improve}</p>
            </div>

            {detail.betterLine && (
              <div className="mt-4 rounded-xl bg-steel-800/70 p-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-steel-400">
                  {t('betterLine')}
                </h4>
                <p className="mt-1.5 text-sm font-medium text-steel-100">“{detail.betterLine}”</p>
              </div>
            )}
          </section>
        );
      })}

      {transcript && transcript.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer text-sm font-bold text-steel-300">
            {tPractice('transcript')}
          </summary>
          <ul className="mt-3 space-y-2">
            {transcript.map((turn, i) => (
              <li
                key={i}
                className={cx(
                  'rounded-lg px-3 py-2 text-sm',
                  turn.role === 'rep'
                    ? 'ml-6 bg-signal-500/15'
                    : 'mr-6 bg-steel-800',
                )}
              >
                {turn.text}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: ScorecardData['outcome'] }) {
  const t = useTranslations('scorecard.outcomes');
  const color =
    outcome === 'signed'
      ? 'var(--color-go)'
      : outcome === 'next-step-set'
        ? 'var(--color-stage-relate)'
        : outcome === 'no-commitment'
          ? 'var(--color-marginal)'
          : 'var(--color-nogo)';

  return (
    <span
      className="rounded-full px-3 py-1 text-sm font-bold text-steel-950"
      style={{ backgroundColor: color }}
    >
      {t(outcome)}
    </span>
  );
}
