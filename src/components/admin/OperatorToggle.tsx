'use client';

import { useState, useTransition } from 'react';
import { adminSetPlatformAdmin, type ActionResult } from '@/app/actions/admin';
import { Result } from './OrgPlanForm';

/**
 * Promotes or demotes another operator.
 *
 * The database refuses to remove the last one, so this cannot lock everybody
 * out of the console. Granting operator access is the widest permission in the
 * system — it reads across every tenant — so the button says so rather than
 * being a quiet toggle.
 */
export function OperatorToggle({
  userId,
  email,
  isOperator,
  isSelf,
}: {
  userId: string;
  email: string;
  isOperator: boolean;
  isSelf: boolean;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        className={isOperator ? 'admin-btn admin-btn-danger' : 'admin-btn'}
        disabled={pending || isSelf}
        title={isSelf ? 'You cannot change your own operator access.' : undefined}
        onClick={() =>
          start(async () => {
            setResult(
              await adminSetPlatformAdmin({
                userId,
                isAdmin: !isOperator,
                note: isOperator ? null : `Granted from the console for ${email}`,
              }),
            );
          })
        }
      >
        {pending ? '…' : isOperator ? 'Revoke operator' : 'Make operator'}
      </button>
      <Result result={result} success="Updated." />
    </>
  );
}
