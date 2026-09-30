'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createIntegration, revokeIntegration } from '@/app/actions/outcomes';

export interface Endpoint {
  id: string;
  name: string;
  provider: string;
  token_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

const PROVIDERS: [string, string][] = [
  ['zapier', 'Zapier'],
  ['make', 'Make'],
  ['jobnimbus', 'JobNimbus'],
  ['acculynx', 'AccuLynx'],
  ['servicetitan', 'ServiceTitan'],
  ['leap', 'Leap'],
  ['hubspot', 'HubSpot'],
  ['salesforce', 'Salesforce'],
  ['other', 'Something else'],
];

/**
 * Connections a CRM posts outcomes to. The token is shown exactly once, at
 * creation; TRUSS keeps only its hash (migration 0022).
 */
export function IntegrationManager({
  endpoints,
  canManage,
  webhookUrl,
}: {
  endpoints: Endpoint[];
  canManage: boolean;
  webhookUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('zapier');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="team-form">
      {token && (
        <div className="rounded-xl border border-gold-500 bg-gold-300/10 p-4">
          <p className="font-bold">Copy this token now. It will not be shown again.</p>
          <code className="team-secret mt-2">{token}</code>
          <p className="team-note mt-3">Send each record to:</p>
          <code className="team-secret mt-1">POST {webhookUrl}</code>
          <p className="team-note mt-2">with the header <code>Authorization: Bearer {token.slice(0, 10)}…</code> and a JSON body like:</p>
          <code className="team-secret mt-1 whitespace-pre">{`{ "external_id": "J-1042", "name": "Smith residence", "status": "Sold",
  "contract_value": "18450", "signed_at": "2026-09-14", "rep_email": "maria@yourco.com" }`}</code>
          <button type="button" className="btn-ghost mt-3" onClick={() => setToken(null)}>I have saved it</button>
        </div>
      )}

      {canManage && !token && (
        <div className="team-form-row">
          <div>
            <label className="label" htmlFor="in-name">Name</label>
            <input id="in-name" className="field" value={name} maxLength={80} placeholder="JobNimbus via Zapier"
              onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="in-provider">Coming from</label>
            <select id="in-provider" className="field" value={provider} onChange={(e) => setProvider(e.target.value)}>
              {PROVIDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" className="btn-primary w-full" disabled={pending || !name.trim()}
              onClick={() => start(async () => {
                const r = await createIntegration({ name, provider });
                if (r.ok && r.token) {
                  setToken(r.token);
                  setName('');
                  setError(null);
                  router.refresh();
                } else if (!r.ok) setError(r.message);
              })}>
              Create connection
            </button>
          </div>
        </div>
      )}
      {error && <p className="team-result-bad">{error}</p>}

      {endpoints.length > 0 && (
        <div className="team-table-wrap">
          <table className="team-table">
            <thead><tr><th>Name</th><th>From</th><th>Token</th><th>Last delivery</th><th /></tr></thead>
            <tbody>
              {endpoints.map((e) => (
                <tr key={e.id}>
                  <td><b>{e.name}</b></td>
                  <td>{PROVIDERS.find(([v]) => v === e.provider)?.[1] ?? e.provider}</td>
                  <td><code>{e.token_prefix}…</code></td>
                  <td>{e.revoked_at ? <span className="team-pill">revoked</span> : e.last_used_at ? new Date(e.last_used_at).toLocaleString() : 'Never'}</td>
                  <td>
                    {canManage && !e.revoked_at && (
                      <button type="button" className="text-sm font-semibold text-nogo hover:underline" disabled={pending}
                        onClick={() => {
                          if (!confirm(`Revoke "${e.name}"? Deliveries using its token stop working immediately.`)) return;
                          start(async () => {
                            const r = await revokeIntegration(e.id);
                            if (r.ok) router.refresh();
                          });
                        }}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
