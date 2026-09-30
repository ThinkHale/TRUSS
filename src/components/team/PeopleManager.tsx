'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  cancelInvitation,
  createBranch,
  deleteBranch,
  inviteMembers,
  removeMembers,
  setMember,
  type InviteOutcome,
  type PeopleResult,
} from '@/app/actions/people';

type Role = 'owner' | 'admin' | 'manager' | 'rep';

export interface DirectoryRow {
  user_id: string;
  email: string;
  full_name: string | null;
  role: Role;
  branch_id: string | null;
  joined_at: string;
  last_sign_in_at: string | null;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: Role;
  expires_at: string;
}

export interface Branch {
  id: string;
  name: string;
}

const ROLE_HELP: Record<Role, string> = {
  rep: 'Coach, practice, research, campaigns, accounts',
  manager: '+ team dashboard, program, scenarios, knowledge',
  admin: '+ people, integrations, exports, audit log',
  owner: 'Everything, including billing',
};

export function PeopleManager({
  canManage,
  callerRole,
  callerId,
  people,
  invites,
  branches,
}: {
  canManage: boolean;
  callerRole: Role;
  callerId: string;
  people: DirectoryRow[];
  invites: PendingInvite[];
  branches: Branch[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<Role>('rep');
  const [branch, setBranch] = useState<string>('');
  const [newBranch, setNewBranch] = useState('');
  const [result, setResult] = useState<PeopleResult | null>(null);
  const [inviteResults, setInviteResults] = useState<InviteOutcome[] | null>(null);

  const run = (fn: () => Promise<PeopleResult>) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) router.refresh();
    });

  const roles: Role[] = callerRole === 'owner' ? ['rep', 'manager', 'admin', 'owner'] : ['rep', 'manager', 'admin'];

  return (
    <div>
      {canManage && (
        <section className="card">
          <h2 className="mb-1 text-lg font-bold">Invite people</h2>
          <p className="team-note mb-3">
            Paste addresses — one per line, separated by commas, or a whole column copied from a spreadsheet.
            New people get an email to set a password. Anyone who already has a TRUSS account sees the invitation
            next time they sign in and accepts it themselves.
          </p>
          <div className="team-form">
            <textarea className="field min-h-28" value={emails} onChange={(e) => setEmails(e.target.value)}
              placeholder={'maria@apexroofing.com\njon@apexroofing.com'} aria-label="Email addresses" />
            <div className="team-form-row">
              <div>
                <label className="label" htmlFor="inv-role">As</label>
                <select id="inv-role" className="field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {roles.map((r) => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
                </select>
                <p className="team-note mt-1">{ROLE_HELP[role]}</p>
              </div>
              {branches.length > 0 && (
                <div>
                  <label className="label" htmlFor="inv-branch">Branch</label>
                  <select id="inv-branch" className="field" value={branch} onChange={(e) => setBranch(e.target.value)}>
                    <option value="">None</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary" disabled={pending || !emails.trim()}
                onClick={() =>
                  start(async () => {
                    const r = await inviteMembers({ emails, role, branchId: branch || null });
                    setResult(r);
                    setInviteResults(r.ok ? r.results ?? null : null);
                    if (r.ok) {
                      setEmails('');
                      router.refresh();
                    }
                  })
                }>
                {pending ? 'Inviting…' : 'Send invitations'}
              </button>
            </div>
            {inviteResults && (
              <ul className="space-y-1 text-sm">
                {inviteResults.map((r) => (
                  <li key={r.email} className="flex flex-wrap gap-2">
                    <span className="font-semibold">{r.email}</span>
                    <span className={r.status === 'failed' ? 'team-result-bad' : 'team-result-ok'}>
                      {r.status === 'emailed' && 'Email sent'}
                      {r.status === 'invited' && 'Has an account — will see the invitation on sign-in'}
                      {r.status === 'already-member' && 'Already in the company'}
                      {r.status === 'failed' && (r.message ?? 'Failed')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {result && !inviteResults && (
        <p role="status" className={`mt-3 ${result.ok ? 'team-result-ok' : 'team-result-bad'}`}>
          {result.ok ? result.message ?? 'Saved.' : result.message}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="team-section-title !m-0">People ({people.length})</h2>
        {canManage && selected.size > 0 && (
          <button type="button" className="btn-ghost text-nogo" disabled={pending}
            onClick={() => {
              if (!confirm(`Remove ${selected.size} ${selected.size === 1 ? 'person' : 'people'} from the company? Their practice history stays with the company; their access ends now.`)) return;
              run(async () => {
                const r = await removeMembers([...selected]);
                if (r.ok) setSelected(new Set());
                return r;
              });
            }}>
            Remove {selected.size} selected
          </button>
        )}
      </div>

      <div className="team-table-wrap mt-3">
        <table className="team-table">
          <thead>
            <tr>
              {canManage && <th aria-label="Select" />}
              <th>Name</th><th>Email</th><th>Role</th>{branches.length > 0 && <th>Branch</th>}<th>Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const self = p.user_id === callerId;
              const locked = !canManage || self || (p.role === 'owner' && callerRole !== 'owner');
              return (
                <tr key={p.user_id}>
                  {canManage && (
                    <td>
                      <input type="checkbox" aria-label={`Select ${p.full_name || p.email}`} disabled={locked}
                        checked={selected.has(p.user_id)}
                        onChange={(e) => {
                          const next = new Set(selected);
                          if (e.target.checked) next.add(p.user_id);
                          else next.delete(p.user_id);
                          setSelected(next);
                        }} />
                    </td>
                  )}
                  <td><b>{p.full_name || '—'}</b>{self && <span className="team-pill ml-1">you</span>}</td>
                  <td>{p.email}</td>
                  <td>
                    {locked ? p.role : (
                      <select className="rounded border border-line-strong bg-surface px-2 py-1" value={p.role} disabled={pending}
                        onChange={(e) => run(() => setMember({ userId: p.user_id, role: e.target.value as Role, branchId: p.branch_id }))}>
                        {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    )}
                  </td>
                  {branches.length > 0 && (
                    <td>
                      {!canManage ? (branches.find((b) => b.id === p.branch_id)?.name ?? '—') : (
                        <select className="rounded border border-line-strong bg-surface px-2 py-1" value={p.branch_id ?? ''} disabled={pending}
                          onChange={(e) => run(() => setMember({ userId: p.user_id, role: p.role, branchId: e.target.value || null }))}>
                          <option value="">—</option>
                          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      )}
                    </td>
                  )}
                  <td>{p.last_sign_in_at ? new Date(p.last_sign_in_at).toLocaleDateString() : 'Never'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canManage && invites.length > 0 && (
        <>
          <h2 className="team-section-title">Waiting to accept ({invites.length})</h2>
          <div className="team-table-wrap">
            <table className="team-table">
              <thead><tr><th>Email</th><th>Role</th><th>Expires</th><th /></tr></thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id}>
                    <td>{i.email}</td>
                    <td>{i.role}</td>
                    <td>{new Date(i.expires_at).toLocaleDateString()}</td>
                    <td>
                      <button type="button" className="text-sm font-semibold text-nogo hover:underline" disabled={pending}
                        onClick={() => run(() => cancelInvitation(i.id))}>
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canManage && (
        <>
          <h2 className="team-section-title">Branches</h2>
          <div className="card">
            <p className="team-note mb-3">
              Group people by location, region, or sales team to filter the dashboard. Branches organize; they do
              not restrict what managers can see.
            </p>
            <div className="flex flex-wrap gap-2">
              {branches.map((b) => (
                <span key={b.id} className="team-pill">
                  {b.name}
                  <button type="button" aria-label={`Remove branch ${b.name}`} className="text-nogo" disabled={pending}
                    onClick={() => {
                      if (confirm(`Remove the ${b.name} branch? People in it stay in the company.`)) run(() => deleteBranch(b.id));
                    }}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input className="field max-w-xs" value={newBranch} maxLength={80} placeholder="Tulsa"
                onChange={(e) => setNewBranch(e.target.value)} aria-label="New branch name" />
              <button type="button" className="btn-ghost" disabled={pending || !newBranch.trim()}
                onClick={() => run(async () => {
                  const r = await createBranch(newBranch);
                  if (r.ok) setNewBranch('');
                  return r;
                })}>
                Add branch
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
