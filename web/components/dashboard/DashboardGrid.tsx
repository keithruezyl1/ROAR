import { EmptyState } from '@/components/shared/EmptyState';

import { CaseCard, type CaseCardModel, type CaseCardVariant } from './CaseCard';

function EmptyQueueIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden>
      <rect x="10" y="8" width="36" height="40" rx="9" stroke="currentColor" strokeWidth="2.5" />
      <path d="M18 20h20M18 28h20M18 36h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function DashboardGrid({
  variant,
  cases,
  emptyTitle,
  emptyDescription,
}: {
  variant: CaseCardVariant;
  cases: CaseCardModel[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (cases.length === 0) {
    return (
      <EmptyState
        icon={<EmptyQueueIcon />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {cases.map((c) => (
        <CaseCard key={c.id} variant={variant} c={c} />
      ))}
    </div>
  );
}
