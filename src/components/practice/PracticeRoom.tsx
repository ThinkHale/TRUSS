'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRealtimeRoleplay } from '@/lib/voice/useRealtimeRoleplay';
import { usePushToTalk } from '@/lib/voice/usePushToTalk';
import { Scorecard, type ScorecardData } from './Scorecard';
import { STAGE_COLOR, cx } from '@/lib/truss/ui';
import type { StageId } from '@/lib/truss/methodology';

export interface ScenarioSummary {
  id: string;
  title: string;
  setup: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  language: 'en' | 'es';
  persona: string;
  focusStages: StageId[];
}

type Phase = 'choosing' | 'live' | 'scoring' | 'scored';

/**
 * The practice surface.
 *
 * A rep picks a scenario, talks to the character out loud, ends the call, and
 * reads a TRUSS scorecard built from what they actually said. If WebRTC will
 * not hold, the room falls back to hold-to-talk without losing the session.
 */
export function PracticeRoom({
  scenarios,
  customScenarios,
}: {
  scenarios: ScenarioSummary[];
  customScenarios: ScenarioSummary[];
}) {
  const t = useTranslations('practice');
  const tc = useTranslations('common');
  const tScore = useTranslations('scorecard');

  const [phase, setPhase] = useState<Phase>('choosing');
  const [scenario, setScenario] = useState<ScenarioSummary | null>(null);
  const [scorecard, setScorecard] = useState<ScorecardData | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);

  const sessionIdRef = useRef<string | null>(null);

  const realtime = useRealtimeRoleplay({
    onError: (message) => {
      // A lost connection is not a dead end — drop to hold-to-talk.
      if (message === 'connection-lost' || message === 'connection-failed') {
        setFallback(true);
      }
    },
  });

  const ptt = usePushToTalk(sessionIdRef.current);

  const begin = useCallback(
    async (chosen: ScenarioSummary) => {
      setScenario(chosen);
      setScorecard(null);
      setScoreError(null);
      setFallback(false);
      setPhase('live');

      const sessionId = await realtime.start(chosen.id);
      sessionIdRef.current = sessionId;
    },
    [realtime],
  );

  /** Starts a text-only session, for a rep who cannot talk out loud right now. */
  const beginText = useCallback(async (chosen: ScenarioSummary) => {
    setScenario(chosen);
    setScorecard(null);
    setScoreError(null);
    setPhase('live');
    setFallback(true);

    const res = await fetch('/api/practice/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: chosen.id, mode: 'text' }),
    });
    const data = await res.json();
    sessionIdRef.current = data.sessionId ?? null;
  }, []);

  const finish = useCallback(async () => {
    realtime.stop();
    const sessionId = sessionIdRef.current;
    if (!sessionId) {
      setPhase('choosing');
      return;
    }

    setPhase('scoring');
    setScoreError(null);

    // Give the last buffered turns a moment to reach the server before scoring.
    await new Promise((resolve) => setTimeout(resolve, 700));

    try {
      const res = await fetch('/api/practice/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setScoreError(data.error === 'too_short' ? t('tooShort') : (data.message ?? tc('retry')));
        setPhase('scored');
        return;
      }

      setScorecard(data.scorecard);
      setPhase('scored');
    } catch {
      setScoreError(tc('retry'));
      setPhase('scored');
    }
  }, [realtime, t, tc]);

  if (phase === 'choosing') {
    return (
      <ScenarioPicker
        scenarios={scenarios}
        customScenarios={customScenarios}
        onStart={begin}
        onStartText={beginText}
      />
    );
  }

  if (phase === 'scoring') {
    return (
      <div className="py-20 text-center">
        <div className="animate-truss-pulse text-3xl">•••</div>
        <p className="mt-4 font-semibold text-ink-800">{t('scoring')}</p>
      </div>
    );
  }

  if (phase === 'scored') {
    return (
      <div className="mt-6">
        {scoreError ? (
          <div className="card border-nogo/40 bg-nogo/10">
            <p className="font-semibold text-nogo">{scoreError}</p>
          </div>
        ) : scorecard ? (
          <Scorecard data={scorecard} transcript={realtime.turns} />
        ) : null}

        <div className="mt-5 flex gap-2">
          <button type="button" className="btn-primary" onClick={() => scenario && begin(scenario)}>
            {tScore('practiceAgain')}
          </button>
          <button type="button" className="btn-ghost" onClick={() => setPhase('choosing')}>
            {tc('back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveSession
      scenario={scenario!}
      realtime={realtime}
      ptt={ptt}
      fallback={fallback}
      onFinish={finish}
    />
  );
}

// ─── Scenario picker ──────────────────────────────────────────────────────────

function ScenarioPicker({
  scenarios,
  customScenarios,
  onStart,
  onStartText,
}: {
  scenarios: ScenarioSummary[];
  customScenarios: ScenarioSummary[];
  onStart: (s: ScenarioSummary) => void;
  onStartText: (s: ScenarioSummary) => void;
}) {
  const t = useTranslations('practice');
  const all = [...customScenarios, ...scenarios];

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      {all.map((scenario) => (
        <article key={scenario.id} className="card flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold leading-snug">{scenario.title}</h2>
            <DifficultyBadge difficulty={scenario.difficulty} />
          </div>

          {scenario.language === 'es' && (
            <span className="mt-2 w-fit rounded-full bg-paper-200 px-2.5 py-0.5 text-xs font-bold text-ink-600">
              Español
            </span>
          )}

          <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-600">{scenario.setup}</p>

          {scenario.focusStages.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {scenario.focusStages.map((stage) => (
                <span
                  key={stage}
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundColor: STAGE_COLOR[stage] }}
                >
                  {stage}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button type="button" className="btn-primary flex-1" onClick={() => onStart(scenario)}>
              <MicIcon /> {t('start')}
            </button>
            <button type="button" className="btn-ghost px-4" onClick={() => onStartText(scenario)}>
              {t('startText')}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: 'easy' | 'moderate' | 'hard' }) {
  const t = useTranslations('practice.difficulty');
  const color =
    difficulty === 'easy'
      ? 'var(--color-go)'
      : difficulty === 'moderate'
        ? 'var(--color-marginal)'
        : 'var(--color-nogo)';

  return (
    <span
      className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold"
      style={{ borderColor: color, color }}
    >
      {t(difficulty)}
    </span>
  );
}

// ─── Live session ─────────────────────────────────────────────────────────────

function LiveSession({
  scenario,
  realtime,
  ptt,
  fallback,
  onFinish,
}: {
  scenario: ScenarioSummary;
  realtime: ReturnType<typeof useRealtimeRoleplay>;
  ptt: ReturnType<typeof usePushToTalk>;
  fallback: boolean;
  onFinish: () => void;
}) {
  const t = useTranslations('practice');
  const [typed, setTyped] = useState('');

  const micDenied = realtime.error === 'mic-denied';
  const speaking = realtime.state === 'speaking';
  const connecting = realtime.state === 'connecting' || realtime.state === 'requesting-mic';
  // Anything that failed for a reason the rep cannot act on. Without this the
  // screen falls through to "your turn" and invites them to talk to nothing.
  const failed = realtime.state === 'error' && !micDenied && !fallback;

  const turns = fallback ? ptt.turns : realtime.turns;

  return (
    <div className="mt-5">
      {/* Character audio. Controls stay available in case autoplay is blocked. */}
      <audio ref={realtime.audioRef} autoPlay playsInline className="sr-only" />

      <section className="card">
        <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">
          {t('scenarioSetup')}
        </h2>
        <p className="mt-2 font-semibold">{scenario.title}</p>
        <p className="mt-1 text-sm text-ink-600">{scenario.setup}</p>
      </section>

      {micDenied && (
        <div role="alert" className="card mt-4 border-marginal/40 bg-marginal/10">
          <p className="text-sm text-marginal">{t('micDenied')}</p>
        </div>
      )}

      {fallback && !micDenied && (
        <div role="status" className="card mt-4 border-line-strong bg-surface">
          <p className="text-sm text-ink-600">{t('connectionLost')}</p>
        </div>
      )}

      {failed && (
        <div role="alert" className="card mt-4 border-nogo/40 bg-nogo/10">
          <p className="text-sm text-nogo">{t('connectFailed')}</p>
        </div>
      )}

      {/* The talking indicator: the single most important thing on screen. */}
      <div className="mt-6 flex flex-col items-center py-8">
        <div className="relative">
          {speaking && (
            <span
              className="absolute inset-0 rounded-full border-2 border-gold-500 animate-truss-ring"
              aria-hidden
            />
          )}
          <div
            className={cx(
              'flex h-28 w-28 items-center justify-center rounded-full border-4 transition-colors',
              failed
                ? 'border-nogo bg-nogo/10'
                : speaking
                  ? 'border-gold-500 bg-gold-500/15'
                  : connecting
                    ? 'border-line-strong bg-paper-200'
                    : 'border-go bg-go/10',
            )}
          >
            <MicIcon size={40} />
          </div>
        </div>

        <p className="mt-5 text-center text-lg font-bold">
          {failed
            ? t('connectFailedShort')
            : connecting
              ? t('connecting')
              : speaking
                ? t('speaking')
                : fallback
                  ? t('holdToTalk')
                  : t('yourTurn')}
        </p>
        {/* Level meter. The one thing that tells a rep whether the room can
            actually hear them, rather than leaving silence ambiguous. */}
        {!fallback && !failed && !micDenied && (
          <div className="mt-4 w-full max-w-xs">
            <div
              className="h-2 overflow-hidden rounded-full bg-paper-300"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={realtime.micGated ? 0 : Math.round(realtime.inputLevel * 100)}
              aria-label={t('micLevel')}
            >
              <div
                className="h-full rounded-full transition-[width] duration-100"
                style={{
                  width: realtime.micGated
                    ? '100%'
                    : `${Math.min(100, Math.round(realtime.inputLevel * 180))}%`,
                  backgroundColor: realtime.micGated
                    ? 'var(--color-gold-500)'
                    : realtime.inputLevel > 0.04
                      ? 'var(--color-go)'
                      : 'var(--color-ink-400)',
                }}
              />
            </div>
            <p className="mt-1.5 text-center text-xs text-ink-400">
              {/* While the gate is shut the meter reads zero by design, so say
                  so rather than let it look like a dead microphone. */}
              {realtime.micGated
                ? t('micHeld')
                : realtime.muted
                  ? t('muted')
                  : realtime.inputLevel > 0.04
                    ? t('micLive')
                    : t('micQuiet')}
            </p>
          </div>
        )}

        {realtime.audioBlocked && (
          <button type="button" className="btn-ghost mt-4" onClick={realtime.resumeAudio}>
            {t('tapToHear')}
          </button>
        )}

        <p className="mt-3 max-w-xs text-center text-xs text-ink-400">{t('micHelp')}</p>
      </div>

      {/* Hold-to-talk controls, shown only on the fallback path. */}
      {fallback && (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            className={cx(
              'btn h-20 w-full max-w-xs rounded-2xl text-lg font-extrabold',
              ptt.state === 'recording'
                ? 'bg-nogo text-white'
                : 'bg-gold-500 text-navy-900',
            )}
            disabled={ptt.state === 'sending' || ptt.state === 'playing'}
            onPointerDown={() => void ptt.startRecording()}
            onPointerUp={() => ptt.stopRecording()}
            onPointerLeave={() => ptt.stopRecording()}
          >
            {ptt.state === 'recording'
              ? t('listening')
              : ptt.state === 'sending'
                ? t('connecting')
                : ptt.state === 'playing'
                  ? t('speaking')
                  : t('holdToTalk')}
          </button>

          <form
            className="flex w-full max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!typed.trim()) return;
              void ptt.sendText(typed);
              setTyped('');
            }}
          >
            <input
              className="field flex-1"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="…"
              aria-label={t('startText')}
            />
            <button type="submit" className="btn-secondary px-5" disabled={!typed.trim()}>
              →
            </button>
          </form>
        </div>
      )}

      {/* Live transcript. Reps learn from seeing their own words. */}
      {turns.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">
            {t('transcript')}
          </h2>
          <ul className="mt-3 space-y-2">
            {turns.map((turn, i) => (
              <li
                key={i}
                className={cx(
                  'rounded-xl px-4 py-2.5 text-sm',
                  turn.role === 'rep'
                    ? 'ml-8 bg-gold-500/15 text-ink-900'
                    : 'mr-8 border border-line bg-surface text-ink-800',
                )}
              >
                {turn.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="sticky bottom-24 mt-8 md:bottom-6">
        <button type="button" className="btn-secondary w-full text-base" onClick={onFinish}>
          {t('end')}
        </button>
      </div>
    </div>
  );
}

function MicIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
