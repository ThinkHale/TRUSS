'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvitation, switchCompany } from '@/app/actions/people';

/** Invitations waiting for the signed-in person, from my_invitations() (0021). */
export function PendingInvitations({
  invitations,
}: {
  invitations: { invitation_id: string; org_name: string; role: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!invitations.length) return null;

  return (
    <section className="card mt-4 border-l-4" style={{ borderLeftColor: 'var(--color-gold-500)' }}>
      <h2 className="text-xs font-bold uppercase tracking-widest text-ink-500">Invitations</h2>
      <ul className="mt-3 space-y-2">
        {invitations.map((i) => (
          <li key={i.invitation_id} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <b>{i.org_name}</b> invited you as {i.role === 'rep' ? 'a rep' : `a${i.role === 'admin' || i.role === 'owner' ? 'n' : ''} ${i.role}`}.
            </span>
            <button type="button" className="btn-primary !min-h-0 !py-2" disabled={pending}
              onClick={() => start(async () => {
                const r = await acceptInvitation(i.invitation_id);
                if (r.ok) router.push('/coach');
                else setError(r.message);
              })}>
              Join
            </button>
          </li>
        ))}
      </ul>
      <p className="team-note mt-3">
        Joining lets that company&apos;s managers see your practice scores and field reviews there. Your Coach
        conversations stay private to you.
      </p>
      {error && <p role="alert" className="team-result-bad mt-2">{error}</p>}
    </section>
  );
}

export function CompanySwitcher({
  current,
  companies,
}: {
  current: string;
  companies: { org_id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (companies.length < 2) return null;
  return (
    <div className="mt-3">
      <label className="label" htmlFor="org-switch">Switch company</label>
      <select id="org-switch" className="field" value={current} disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          start(async () => {
            const r = await switchCompany(next);
            if (r.ok) router.refresh();
          });
        }}>
        {companies.map((c) => <option key={c.org_id} value={c.org_id}>{c.name}</option>)}
      </select>
    </div>
  );
}
