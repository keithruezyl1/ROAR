import { EmptyState } from '@/components/shared/EmptyState';

import { CaseCard, type CaseCardModel, type CaseCardVariant } from './CaseCard';

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
        icon={<span className="text-[24px]">No cases</span>}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {cases.map((c) => (
        <CaseCard key={c.id} variant={variant} c={c} />
      ))}
    </div>
  );
}
