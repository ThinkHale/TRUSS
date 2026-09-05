'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  adminAddMember,
  adminRemoveMember,
  adminSetActiveOrg,
  adminDeleteUser,
  type ActionResult,
} from '@/app/actions/admin';
import { PLANS, type PlanId } from '@/lib/billing/plans';
import { Result } from './OrgPlanForm';

/**
 * One person's companies, from their side.
 *
 * The org page answers "who is at this company"; this answers "which company is
 * this person with", which is the direction an operator asks when a support
 * email arrives from an address they do not recognise.
 *
 * Someone can hold membership in several. The one marked active is where they
 * land when they sign in, and it is the only one their session reads — so a
 * person whose active org was deleted needs moving here or they arrive at
 * onboarding instead of the Coach.
 */

const ROLES = ['owner', 'admin', 'manager', 'rep'] as const;
type Role = (typeof ROLES)[number];

export interface UserOrg {
  org_id: string;
  org_name: string;
  org_slug: string;
  plan: PlanId;
  effective: PlanId;
  role: Role;
  is_active: boolean;
  joined_at: string;
}

export function UserOrgs({
  userId,
  email,
  isOperator,
  orgs,
}: {
  userId: string;
  email: string;
  isOperator: boolean;
  orgs: UserOrg[];
}) {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const [addOrg, setAddOrg] = useState('');
  const [addRole, setAddRole] = useState<Role>('rep');

  const [armed, setArmed] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  function run(fn: () => Promise<ActionResult>) {
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  return (
    <>
      <section className="admin-card">
        <h2>Companies</h2>
        <p className="admin-sub">
          {orgs.length === 0
            ? 'Not a member of any company. They will be sent to onboarding when they sign in.'
            : `In ${orgs.length} ${orgs.length === 1 ? 'company' : 'companies'}. The active one is where they land.`}
        </p>

        <ul className="admin-members">
          {orgs.map((org) => (
            <li key={org.org_id}>
              <div>
                <b>
                  <Link href={`/admin/orgs/${org.org_id}`}>{org.org_name}</Link>
                </b>
                <small>
                  {org.org_slug} · {PLANS[org.effective].name} · joined{' '}
                  {new Date(org.joined_at).toLocaleDateString()}
                </small>
              </div>

              <span className="admin-tag">{org.role}</span>

              {org.is_active ? (
                <span className="admin-tag admin-tag-good">active</span>
              ) : (
                <button
                  type="button"
                  className="admin-btn"
                  disabled={pending}
                  onClick={() => run(() => adminSetActiveOrg({ userId, orgId: org.org_id }))}
                >
                  Make active
                </button>
              )}

              <button
                type="button"
                className="admin-btn admin-btn-danger"
                disabled={pending}
                onClick={() => run(() => adminRemoveMember({ orgId: org.org_id, userId }))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <h3 className="admin-h3">Add to a company</h3>
        <div className="admin-row">
          <label className="admin-grow">
            Company id
            <input
              type="text"
              value={addOrg}
              onChange={(e) => setAddOrg(e.target.value)}
              placeholder="Paste the id from the company page URL"
            />
          </label>
          <label>
            Role
            <select value={addRole} onChange={(e) => setAddRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={pending || !addOrg.trim()}
            onClick={() => {
              run(() => adminAddMember({ orgId: addOrg.trim(), email, role: addRole }));
              setAddOrg('');
            }}
          >
            Add
          </button>
        </div>
        <p className="admin-sub">
          Adding from the company page is usually easier — it has the roster and the seat count
          in front of you.
        </p>

        <Result result={result} success="Done." />
      </section>

      <section className="admin-card admin-danger">
        <h2>Delete this account</h2>
        <p className="admin-sub">
          Removes the login and their memberships everywhere. Work they created inside a company
          stays with that company. <b>There is no undo.</b>
          {isOperator && <> This person is a platform operator — revoke that first.</>}
        </p>

        {!armed ? (
          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              disabled={isOperator}
              onClick={() => setArmed(true)}
            >
              Delete account…
            </button>
          </div>
        ) : (
          <>
            <label className="admin-field">
              Type <b>{email}</b> to confirm
              <input
                type="text"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={email}
                autoComplete="off"
              />
            </label>
            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                disabled={
                  pending || confirmEmail.trim().toLowerCase() !== email.toLowerCase()
                }
                onClick={() =>
                  start(async () => {
                    const r = await adminDeleteUser({ userId, confirmEmail });
                    setResult(r);
                    if (r.ok) router.push('/admin/users');
                  })
                }
              >
                {pending ? 'Deleting…' : 'Delete permanently'}
              </button>
              <button
                type="button"
                className="admin-btn"
                disabled={pending}
                onClick={() => {
                  setArmed(false);
                  setConfirmEmail('');
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
