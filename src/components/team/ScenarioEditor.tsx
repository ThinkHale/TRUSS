'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteScenario, saveScenario, type TeamResult } from '@/app/actions/team';
import { STAGES, type StageId } from '@/lib/truss/methodology';

export interface ScenarioDraft {
  id: string | null;
  title: string;
  setup: string;
  characterBrief: string;
  objections: string[];
  difficulty: 'easy' | 'moderate' | 'hard';
  focusStages: StageId[];
  persona: 'homeowner' | 'adjuster' | 'property-manager' | 'business-owner';
  voice: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
  language: 'en' | 'es';
  isPublished: boolean;
}

export const EMPTY_SCENARIO: ScenarioDraft = {
  id: null,
  title: '',
  setup: '',
  characterBrief: '',
  objections: [],
  difficulty: 'moderate',
  focusStages: [],
  persona: 'homeowner',
  voice: 'ash',
  language: 'en',
  isPublished: false,
};

const VOICES: ScenarioDraft['voice'][] = ['ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'alloy'];

/**
 * Authoring a roleplay character from the company's real market.
 *
 * The guidance here is the same as ENTERPRISE.md §4: give the character
 * private facts they guard until the rep earns them, and say how they react to
 * pressure versus good treatment. The brief is never shown to reps; only the
 * setup is.
 */
export function ScenarioEditor({ initial, onDone }: { initial: ScenarioDraft; onDone?: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [objectionsText, setObjectionsText] = useState(initial.objections.join('\n'));
  const [result, setResult] = useState<TeamResult | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof ScenarioDraft>(key: K, value: ScenarioDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function save(publish?: boolean) {
    start(async () => {
      const r = await saveScenario({
        ...draft,
        isPublished: publish ?? draft.isPublished,
        objections: objectionsText.split('\n').map((l) => l.trim()).filter(Boolean),
      });
      setResult(r);
      if (r.ok) {
        router.refresh();
        onDone?.();
      }
    });
  }

  return (
    <form
      className="team-form"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div>
        <label className="label" htmlFor="sc-title">Title</label>
        <input id="sc-title" className="field" value={draft.title} maxLength={120}
          placeholder="Oklahoma hail, prior claim denied" onChange={(e) => set('title', e.target.value)} />
      </div>

      <div>
        <label className="label" htmlFor="sc-setup">Setup — what the rep reads before starting</label>
        <textarea id="sc-setup" className="field min-h-24" value={draft.setup} maxLength={1500}
          placeholder="This homeowner filed after the 2024 storm and was denied. They are hostile to the whole process."
          onChange={(e) => set('setup', e.target.value)} />
      </div>

      <div>
        <label className="label" htmlFor="sc-brief">Character brief — never shown to the rep</label>
        <textarea id="sc-brief" className="field min-h-48" value={draft.characterBrief} maxLength={6000}
          placeholder="You are Curtis Ballard, 61. You filed a claim in 2024 and the adjuster called it wear and tear. You only mention the denial letter if the rep asks what happened last time…"
          onChange={(e) => set('characterBrief', e.target.value)} />
        <p className="team-note mt-1.5">
          Give the character private facts they guard until the rep earns them, and say plainly how they react to
          pressure versus being treated well. A character who folds on the first good sentence teaches nothing.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="sc-obj">Objections they bring — one per line</label>
        <textarea id="sc-obj" className="field min-h-24" value={objectionsText}
          placeholder={'I already tried this and they denied me.\nInsurance is a scam.'}
          onChange={(e) => setObjectionsText(e.target.value)} />
      </div>

      <div className="team-form-row">
        <div>
          <label className="label" htmlFor="sc-persona">Who they are</label>
          <select id="sc-persona" className="field" value={draft.persona}
            onChange={(e) => set('persona', e.target.value as ScenarioDraft['persona'])}>
            <option value="homeowner">Homeowner</option>
            <option value="adjuster">Insurance adjuster</option>
            <option value="property-manager">Property manager</option>
            <option value="business-owner">Business owner</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sc-diff">Difficulty</label>
          <select id="sc-diff" className="field" value={draft.difficulty}
            onChange={(e) => set('difficulty', e.target.value as ScenarioDraft['difficulty'])}>
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sc-lang">Language they speak</label>
          <select id="sc-lang" className="field" value={draft.language}
            onChange={(e) => set('language', e.target.value as ScenarioDraft['language'])}>
            <option value="en">English</option>
            <option value="es">Spanish</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sc-voice">Voice</label>
          <select id="sc-voice" className="field" value={draft.voice}
            onChange={(e) => set('voice', e.target.value as ScenarioDraft['voice'])}>
            {VOICES.map((v) => (
              <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="label">Beams this scenario exercises</legend>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => {
            const on = draft.focusStages.includes(s.id);
            return (
              <label key={s.id} className={on ? 'team-pill team-pill-gold cursor-pointer' : 'team-pill cursor-pointer'}>
                <input type="checkbox" className="sr-only" checked={on}
                  onChange={() => set('focusStages', on ? draft.focusStages.filter((x) => x !== s.id) : [...draft.focusStages, s.id])} />
                {s.name}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn-ghost" disabled={pending}>
          {pending ? 'Saving…' : draft.isPublished ? 'Save' : 'Save draft'}
        </button>
        {!draft.isPublished ? (
          <button type="button" className="btn-primary" disabled={pending} onClick={() => save(true)}>
            Save and publish to reps
          </button>
        ) : (
          <button type="button" className="btn-ghost" disabled={pending} onClick={() => save(false)}>
            Unpublish
          </button>
        )}
        {draft.id && (
          <button
            type="button"
            className="btn-ghost text-nogo"
            disabled={pending}
            onClick={() => {
              if (!confirm('Delete this scenario? Sessions already played keep their scorecards.')) return;
              start(async () => {
                const r = await deleteScenario(draft.id!);
                setResult(r);
                if (r.ok) {
                  router.refresh();
                  onDone?.();
                }
              });
            }}
          >
            Delete
          </button>
        )}
        {result && (
          <span role="status" className={result.ok ? 'team-result-ok' : 'team-result-bad'}>
            {result.ok ? 'Saved.' : result.message}
          </span>
        )}
      </div>
    </form>
  );
}
