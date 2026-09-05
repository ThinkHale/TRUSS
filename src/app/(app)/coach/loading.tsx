import { Skeleton } from '@/components/PageSkeleton';

/**
 * Coach is a full-height work area rather than a scrolling page, so its
 * placeholder mirrors that frame — heading, stage filters, then the composer
 * pinned to the bottom — and the real screen drops straight into it.
 */
export default function Loading() {
  return (
    <div className="coach-page flex flex-col" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="app-page-heading">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Skeleton className="mt-3 h-4 w-80 rounded" />
      </div>

      <div className="flex gap-2.5 overflow-x-auto px-11 py-4">
        {[72, 60, 68, 96, 64, 72].map((w, i) => (
          <Skeleton key={i} className="h-10 shrink-0 rounded-full" style={{ width: w }} />
        ))}
      </div>

      <div className="min-h-0 flex-1" />

      <div className="px-11 pb-6 pt-4">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
