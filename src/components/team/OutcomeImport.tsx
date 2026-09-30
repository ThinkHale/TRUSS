'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { importOutcomesCsv, type OutcomesResult } from '@/app/actions/outcomes';
import {
  OUTCOME_FIELDS,
  OUTCOME_FIELD_LABELS,
  guessColumnMap,
  parseCsv,
  type OutcomeField,
} from '@/lib/outcomes/normalize';

/**
 * Importing deal outcomes from a CRM export. The file is parsed in the browser
 * so the manager can see and correct which column feeds which field before
 * anything is written; the server parses it again and does the writing.
 */
export function OutcomeImport() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [source, setSource] = useState('');
  const [map, setMap] = useState<Partial<Record<OutcomeField, number>>>({});
  const [result, setResult] = useState<OutcomesResult | null>(null);

  const rows = useMemo(() => (csv ? parseCsv(csv) : []), [csv]);
  const headers = rows[0] ?? [];

  return (
    <div className="team-form">
      <div className="team-form-row">
        <div>
          <label className="label" htmlFor="oc-file">CSV or tab-separated export</label>
          <input id="oc-file" type="file" accept=".csv,.tsv,.txt,text/csv" className="field"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              setResult(null);
              if (!file) return;
              if (file.size > 2_000_000) {
                setResult({ ok: false, message: 'That file is over 2 MB. Export a date range at a time.' });
                return;
              }
              const text = await file.text();
              setCsv(text);
              setFileName(file.name);
              setMap(guessColumnMap(parseCsv(text)[0] ?? []));
              if (!source) setSource(file.name.replace(/\.[a-z]+$/i, '').split(/[\s_-]/)[0].toLowerCase());
            }} />
        </div>
        <div>
          <label className="label" htmlFor="oc-source">Which system it came from</label>
          <input id="oc-source" className="field" value={source} maxLength={40} placeholder="jobnimbus"
            onChange={(e) => setSource(e.target.value)} />
          <p className="team-note mt-1">Re-importing from the same system updates jobs instead of duplicating them.</p>
        </div>
      </div>

      {csv && (
        <>
          <p className="team-note">
            <b>{fileName}</b>: {Math.max(0, rows.length - 1)} rows. Check the column for each field — TRUSS guessed from
            the headers.
          </p>
          <div className="team-form-row">
            {OUTCOME_FIELDS.map((field) => (
              <div key={field}>
                <label className="label" htmlFor={`oc-map-${field}`}>
                  {OUTCOME_FIELD_LABELS[field]}{field === 'external_id' && ' *'}
                </label>
                <select id={`oc-map-${field}`} className="field" value={map[field] ?? ''}
                  onChange={(e) => setMap({ ...map, [field]: e.target.value === '' ? undefined : Number(e.target.value) })}>
                  <option value="">— not in this file —</option>
                  {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                </select>
              </div>
            ))}
          </div>

          {rows.length > 1 && (
            <div className="team-table-wrap">
              <table className="team-table">
                <thead>
                  <tr>{(['external_id', 'name', 'status', 'contract_value', 'signed_at', 'rep_email'] as OutcomeField[]).map((f) => <th key={f}>{OUTCOME_FIELD_LABELS[f]}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(1, 6).map((row, i) => (
                    <tr key={i}>
                      {(['external_id', 'name', 'status', 'contract_value', 'signed_at', 'rep_email'] as OutcomeField[]).map((f) => (
                        <td key={f}>{map[f] != null ? row[map[f]!] : <span className="text-ink-400">—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-primary" disabled={pending || map.external_id == null}
              onClick={() => start(async () => {
                const r = await importOutcomesCsv({ csv, source: source || 'csv', map });
                setResult(r);
                if (r.ok) router.refresh();
              })}>
              {pending ? 'Importing…' : `Import ${Math.max(0, rows.length - 1)} rows`}
            </button>
          </div>
        </>
      )}

      {result && (
        <div role="status" className={result.ok ? 'team-result-ok' : 'team-result-bad'}>
          {result.ok && result.summary ? (
            <>
              {result.summary.created} created · {result.summary.updated} updated · {result.summary.unchanged} unchanged ·{' '}
              {result.summary.rejected} rejected
              {result.rejectedSample?.length ? (
                <ul className="mt-1 list-disc pl-5 font-normal text-ink-600">
                  {result.rejectedSample.map((r) => <li key={r}>{r}</li>)}
                </ul>
              ) : null}
              {result.unmatchedReps?.length ? (
                <p className="mt-1 font-normal text-ink-600">
                  No one in the company has these rep emails, so those jobs are not credited to anyone yet:{' '}
                  {result.unmatchedReps.join(', ')}
                </p>
              ) : null}
            </>
          ) : !result.ok ? result.message : 'Done.'}
        </div>
      )}
    </div>
  );
}
