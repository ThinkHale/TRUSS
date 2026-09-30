'use client';

import { useState } from 'react';
import { EMPTY_SCENARIO, ScenarioEditor, type ScenarioDraft } from './ScenarioEditor';

/** The company's scenarios, each opening into the editor in place. */
export function ScenarioList({ scenarios }: { scenarios: ScenarioDraft[] }) {
  const [open, setOpen] = useState<string | 'new' | null>(scenarios.length ? null : 'new');

  return (
    <div className="space-y-3">
      {open === 'new' ? (
        <section className="card">
          <h3 className="mb-4 text-lg font-bold">New scenario</h3>
          <ScenarioEditor initial={EMPTY_SCENARIO} onDone={() => setOpen(null)} />
        </section>
      ) : (
        <button type="button" className="btn-primary" onClick={() => setOpen('new')}>
          New scenario
        </button>
      )}

      {scenarios.map((s) => (
        <section key={s.id} className="card">
          <button
            type="button"
            className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
            aria-expanded={open === s.id}
            onClick={() => setOpen(open === s.id ? null : s.id)}
          >
            <span className="font-bold">{s.title}</span>
            <span className="flex gap-1.5">
              <span className="team-pill">{s.difficulty}</span>
              <span className="team-pill">{s.language === 'es' ? 'Spanish' : 'English'}</span>
              <span className={s.isPublished ? 'team-pill team-pill-good' : 'team-pill'}>
                {s.isPublished ? 'Published' : 'Draft'}
              </span>
            </span>
          </button>
          {open === s.id && (
            <div className="mt-4 border-t border-line pt-4">
              <ScenarioEditor initial={s} onDone={() => setOpen(null)} />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
