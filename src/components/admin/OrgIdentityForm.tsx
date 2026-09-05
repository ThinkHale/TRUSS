'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminUpdateOrganization,
  adminDeleteOrganization,
  type ActionResult,
} from '@/app/actions/admin';
import { Result } from './OrgPlanForm';

/**
 * Renaming a company, and deleting one.
 *
 * The delete is deliberately awkward. Every tenant table cascades from
 * organizations, so this takes their accounts, conversations, scorecards,
 * knowledge base and usage history with it, and there is no undo. Retyping the
 * name is checked in SQL rather than here, so an operator on the wrong tab
 * cannot delete the wrong tenant by clicking, and a bug in this component
 * cannot skip the check.
 */
export function OrgIdentityForm({
  orgId,
  name,
  slug,
  hasLiveBilling,
}: {
  orgId: string;
  name: string;
  slug: string;
  hasLiveBilling: boolean;
}) {
  const router = useRouter();

  const [nextName, setNextName] = useState(name);
  const [nextSlug, setNextSlug] = useState(slug);
  const [saveResult, setSaveResult] = useState<ActionResult | null>(null);
  const [savePending, startSave] = useTransition();

  const [armed, setArmed] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleteResult, setDeleteResult] = useState<ActionResult | null>(null);
  const [deletePending, startDelete] = useTransition();

  return (
    <>
      <section className="admin-card">
        <h2>Identity</h2>
        <p className="admin-sub">
          The name reps see in their own Settings, and the slug the company is addressed by.
        </p>

        <div className="admin-row">
          <label className="admin-grow">
            Company name
            <input
              type="text"
              value={nextName}
              maxLength={200}
              onChange={(e) => setNextName(e.target.value)}
            />
          </label>
          <label className="admin-grow">
            Slug
            <input
              type="text"
              value={nextSlug}
              maxLength={60}
              onChange={(e) => setNextSlug(e.target.value)}
            />
          </label>
        </div>

        <div className="admin-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={savePending || !nextName.trim()}
            onClick={() =>
              startSave(async () => {
                const r = await adminUpdateOrganization({
                  orgId,
                  name: nextName.trim(),
                  slug: nextSlug.trim() === slug ? null : nextSlug.trim() || null,
                });
                setSaveResult(r);
                if (r.ok) router.refresh();
              })
            }
          >
            {savePending ? 'Saving…' : 'Save'}
          </button>
        </div>

        <Result result={saveResult} success="Saved." />
      </section>

      <section className="admin-card admin-danger">
        <h2>Delete this company</h2>
        <p className="admin-sub">
          Removes the company and everything in it — people, accounts, Coach history, practice
          sessions, scorecards, knowledge base, and usage. <b>There is no undo.</b>
          {hasLiveBilling && (
            <>
              {' '}
              This company has a live Stripe subscription, so the delete will be refused until
              you cancel it in Stripe. Otherwise the card keeps getting charged for an account
              that no longer exists.
            </>
          )}
        </p>

        {!armed ? (
          <div className="admin-actions">
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              onClick={() => setArmed(true)}
            >
              Delete company…
            </button>
          </div>
        ) : (
          <>
            <label className="admin-field">
              Type <b>{name}</b> to confirm
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={name}
                autoComplete="off"
              />
            </label>

            <div className="admin-actions">
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                disabled={deletePending || confirmName.trim().toLowerCase() !== name.toLowerCase()}
                onClick={() =>
                  startDelete(async () => {
                    const r = await adminDeleteOrganization({ orgId, confirmName });
                    setDeleteResult(r);
                    if (r.ok) router.push('/admin/orgs');
                  })
                }
              >
                {deletePending ? 'Deleting…' : 'Delete permanently'}
              </button>
              <button
                type="button"
                className="admin-btn"
                disabled={deletePending}
                onClick={() => {
                  setArmed(false);
                  setConfirmName('');
                  setDeleteResult(null);
                }}
              >
                Cancel
              </button>
            </div>
          </>
        )}

        <Result result={deleteResult} success="Deleted." />
      </section>
    </>
  );
}
