'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteKnowledge, uploadKnowledge, type TeamResult } from '@/app/actions/team';
import { STAGES } from '@/lib/truss/methodology';

/**
 * Loading company material into the Coach: a file (PDF, Word, text) or pasted
 * text. The same ingestion the API runs, from a form a manager can use.
 */
export function KnowledgeUpload({ configured }: { configured: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [result, setResult] = useState<TeamResult | null>(null);
  const [pending, start] = useTransition();

  if (!configured) {
    return <p className="team-note">Knowledge loading needs an OpenAI key on this deployment.</p>;
  }

  return (
    <form
      ref={formRef}
      className="team-form"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => {
          const r = await uploadKnowledge(data);
          setResult(r);
          if (r.ok) {
            formRef.current?.reset();
            router.refresh();
          }
        });
      }}
    >
      <div className="flex gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'file'}
          className={mode === 'file' ? 'btn-secondary' : 'btn-ghost'} onClick={() => setMode('file')}>
          Upload a file
        </button>
        <button type="button" role="tab" aria-selected={mode === 'paste'}
          className={mode === 'paste' ? 'btn-secondary' : 'btn-ghost'} onClick={() => setMode('paste')}>
          Paste text
        </button>
      </div>

      {mode === 'file' ? (
        <div>
          <label className="label" htmlFor="kn-file">PDF, Word (.docx), text, Markdown, or CSV — up to 4 MB</label>
          <input id="kn-file" name="file" type="file" className="field"
            accept=".pdf,.docx,.txt,.md,.markdown,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*" />
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="kn-content">Text</label>
          <textarea id="kn-content" name="content" className="field min-h-48" placeholder="Paste the playbook, policy, or transcript here." />
        </div>
      )}

      <div className="team-form-row">
        <div>
          <label className="label" htmlFor="kn-title">Title {mode === 'file' && <span className="font-normal text-ink-400">(defaults to the file name)</span>}</label>
          <input id="kn-title" name="title" className="field" maxLength={200} placeholder="2026 Sales Playbook" />
        </div>
        <div>
          <label className="label" htmlFor="kn-cite">How the Coach cites it</label>
          <input id="kn-cite" name="citationLabel" className="field" maxLength={200} placeholder="Sales Playbook, 2026 edition" />
        </div>
        <div>
          <label className="label" htmlFor="kn-type">What it is</label>
          <select id="kn-type" name="sourceType" className="field" defaultValue="training">
            <option value="training">Training material</option>
            <option value="policy">Policy</option>
            <option value="pricing">Pricing rules</option>
            <option value="transcript">Call transcript</option>
            <option value="upload">Other</option>
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="label">Beams it informs <span className="font-normal text-ink-400">(leave blank for all)</span></legend>
        <div className="flex flex-wrap gap-3 text-sm">
          {STAGES.map((s) => (
            <label key={s.id} className="flex items-center gap-1.5">
              <input type="checkbox" name="stageTags" value={s.id} /> {s.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Reading and loading…' : 'Load into the Coach'}
        </button>
        {result && (
          <span role="status" className={result.ok ? 'team-result-ok' : 'team-result-bad'}>
            {result.ok ? result.message ?? 'Loaded.' : result.message}
          </span>
        )}
      </div>
    </form>
  );
}

export function DeleteKnowledgeButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className="text-sm font-semibold text-nogo hover:underline"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Remove "${title}"? The Coach stops citing it immediately.`)) return;
          start(async () => {
            const r = await deleteKnowledge(id);
            if (r.ok) router.refresh();
            else setError(r.message);
          });
        }}
      >
        {pending ? 'Removing…' : 'Remove'}
      </button>
      {error && <span className="team-result-bad ml-2">{error}</span>}
    </>
  );
}
