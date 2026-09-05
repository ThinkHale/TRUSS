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

      {/* One row, matching the real bar, so the swap is not a visible jump. */}
      <div className="app-page-heading">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>

      {/* Same containers as the real screen, so the chips land in one row on a
          desktop and in the 3x2 grid on a phone without the layout jumping. */}
      <div className="coach-stages">
        {[72, 60, 68, 96, 64, 72].map((w, i) => (
          <Skeleton key={i} className="h-10 rounded-full" style={{ minWidth: w }} />
        ))}
      </div>

      <div className="min-h-0 flex-1" />

      <div className="coach-composer">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
