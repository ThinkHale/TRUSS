import { PageSkeleton } from '@/components/PageSkeleton';

export default function Loading() {
  return (
    <div className="app-settings-page">
      <PageSkeleton cards={3} />
    </div>
  );
}
