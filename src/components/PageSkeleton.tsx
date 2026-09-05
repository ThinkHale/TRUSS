/**
 * Placeholder shown while a section renders on the server.
 *
 * Next.js paints this the instant a nav item is tapped, so the shell stays put
 * and only the work area changes. The shapes deliberately match the real page
 * — a title, a subtitle, then cards — so the swap is not a visible jump.
 */

export function Skeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`truss-skeleton ${className}`} style={style} aria-hidden />;
}

export function PageSkeleton({
  cards = 3,
  action = false,
}: {
  cards?: number;
  action?: boolean;
}) {
  return (
    <div className="app-page" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      <header className="app-page-head">
        <div className="w-full">
          <Skeleton className="h-9 w-52 rounded-lg" />
          <Skeleton className="mt-3 h-4 w-72 rounded" />
        </div>
        {action && <Skeleton className="h-12 w-36 rounded-lg" />}
      </header>

      <div className="space-y-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="card">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="mt-3 h-5 w-3/5 rounded" />
            <Skeleton className="mt-2.5 h-4 w-4/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
