'use client';

import { useState, useTransition } from 'react';
import {
  adminAddMember,
  adminRemoveMember,
  adminInviteUser,
  type ActionResult,
} from '@/app/actions/admin';
import { Result } from './OrgPlanForm';

/**
 * Who is in a tenant, and their role.
 *
 * Two ways in, because they solve different problems: adding an existing
 * account is instant and needs nothing configured, while inviting sends mail
 * through Supabase Auth and therefore needs SMTP set up. The invite path says
 * so in its own error rather than reporting a success nobody receives.
 */

const ROLES = ['owner', 'admin', 'manager', 'rep'] as const;
type Role = (typeof ROLES)[number];

export interface Member {
  user_id: string;
  email: string;
  full_name: string | null;
  role: Role;
  joined_at: string;
}

export function OrgMembers({
  orgId,
  members,
  seatLimit,
}: {
  orgId: string;
  members: Member[];
  seatLimit: number | null;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('rep');
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const full = seatLimit !== null && members.length >= seatLimit;

  return (
    <section className="admin-card">
      <h2>People</h2>
      <p className="admin-sub">
        {members.length}
        {seatLimit ? ` of ${seatLimit} seats` : ' people, no seat limit'} in this company.
        {full && <b> Every seat is taken — raise the seat limit to add more.</b>}
      </p>

      <ul className="admin-members">
        {members.map((member) => (
          <li key={member.user_id}>
            <div>
              <b>{member.full_name || member.email}</b>
              <small>{member.email}</small>
            </div>
            <span className="admin-tag">{member.role}</span>
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setResult(await adminRemoveMember({ orgId, userId: member.user_id }));
                })
              }
            >
              Remove
            </button>
          </li>
        ))}
        {members.length === 0 && (
          <li className="admin-empty">
            Nobody yet. An Enterprise tenant created here has no owner until you add one.
          </li>
        )}
      </ul>

      <div className="admin-row">
        <label className="admin-grow">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rep@company.com"
          />
        </label>

        <label>
          Role
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-actions">
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={pending || !email.trim()}
          onClick={() =>
            start(async () => {
              const r = await adminAddMember({ orgId, email: email.trim(), role });
              setResult(r);
              if (r.ok) setEmail('');
            })
          }
        >
          {pending ? 'Working…' : 'Add existing account'}
        </button>

        <button
          type="button"
          className="admin-btn"
          disabled={pending || !email.trim()}
          onClick={() =>
            start(async () => {
              const r = await adminInviteUser({ orgId, email: email.trim(), role });
              setResult(r);
              if (r.ok) setEmail('');
            })
          }
        >
          Invite by email
        </button>
      </div>

      <Result result={result} success="Done." />
    </section>
  );
}
