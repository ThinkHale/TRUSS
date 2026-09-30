'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createCohort } from '@/app/actions/program';

export function CohortCreate({
  people,
  branches,
}: {
  people: { user_id: string; full_name: string | null; email: string; role: string; branch_id: string | null }[];
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState('');
  const [startsOn, setStartsOn] = useState(() => {
    // Next Monday, which is when most crews start a program.
    const d = new Date();
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    return d.toISOString().slice(0, 10);
  });
  const [branch, setBranch] = useState('');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const visible = people.filter((p) => !branch || p.branch_id === branch);

  return (
    <form
      className="team-form"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createCohort({ name, startsOn, branchId: branch || null, memberIds: [...chosen] });
          if (r.ok && r.id) router.push(`/team/program/${r.id}`);
          else if (!r.ok) setError(r.message);
        });
      }}
    >
      <div className="team-form-row">
        <div>
          <label className="label" htmlFor="co-name">Cohort name</label>
          <input id="co-name" className="field" value={name} maxLength={120} placeholder="Spring 2027 — new hires"
            onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="co-start">Starts</label>
          <input id="co-start" type="date" className="field" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </div>
        {branches.length > 0 && (
          <div>
            <label className="label" htmlFor="co-branch">Branch</label>
            <select id="co-branch" className="field" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">Whole company</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <fieldset>
        <div className="mb-2 flex items-center justify-between">
          <legend className="label !mb-0">Who is in it ({chosen.size})</legend>
          <button type="button" className="text-sm font-semibold underline"
            onClick={() => setChosen(new Set(visible.filter((p) => p.role === 'rep').map((p) => p.user_id)))}>
            All reps{branch ? ' in this branch' : ''}
          </button>
        </div>
        <div className="grid max-h-64 gap-1 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
          {visible.map((p) => (
            <label key={p.user_id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-paper-200">
              <input type="checkbox" checked={chosen.has(p.user_id)}
                onChange={(e) => {
                  const next = new Set(chosen);
                  if (e.target.checked) next.add(p.user_id);
                  else next.delete(p.user_id);
                  setChosen(next);
                }} />
              <span className="font-semibold">{p.full_name || p.email}</span>
              <span className="text-ink-400">{p.role}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending || !name.trim()}>
          {pending ? 'Creating…' : 'Start the cohort'}
        </button>
        {error && <span className="team-result-bad">{error}</span>}
      </div>
    </form>
  );
}
