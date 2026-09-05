'use client';

import { useState, useTransition } from 'react';
import { adminInviteUser, type ActionResult } from '@/app/actions/admin';
import { Result } from './OrgPlanForm';

/**
 * Creates an account for someone who has never signed up.
 *
 * No org attached — this is the "get them an account" step. Putting them in a
 * company happens on that company's page, where the seat limit and the role are
 * in front of you.
 *
 * Sends through Supabase Auth, so it needs SMTP configured there. Without it
 * the action reports the failure rather than claiming a mail was sent.
 */
export function InviteUserForm() {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="admin-card">
      <h2>Invite someone</h2>
      <p className="admin-sub">
        Sends a Supabase Auth invite email. Requires SMTP to be configured on the Supabase
        project.
      </p>

      <div className="admin-row">
        <label className="admin-grow">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="someone@company.com"
          />
        </label>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={pending || !email.trim()}
          onClick={() =>
            start(async () => {
              const r = await adminInviteUser({ email: email.trim(), orgId: null, role: 'rep' });
              setResult(r);
              if (r.ok) setEmail('');
            })
          }
        >
          {pending ? 'Sending…' : 'Send invite'}
        </button>
      </div>

      <Result result={result} success="Invite sent." />
    </div>
  );
}
