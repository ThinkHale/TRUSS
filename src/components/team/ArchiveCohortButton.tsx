'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { archiveCohort } from '@/app/actions/program';

export function ArchiveCohortButton({ cohortId, archived }: { cohortId: string; archived: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await archiveCohort(cohortId, !archived);
          if (r.ok) router.refresh();
        })
      }
    >
      {archived ? 'Restore' : 'Archive'}
    </button>
  );
}
