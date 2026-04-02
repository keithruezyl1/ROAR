'use client';

import * as React from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { SearchFilterBar, type Filters } from '@/components/dashboard/SearchFilterBar';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';

type Case = {
  id: string;
  reference_number: string;
  status: string;
  dispute_type: 'refund' | 'delivery';
  resolution_preference?: 'refund' | 'replacement' | 'return' | null;
  customer_name: string;
  order_id: string;
  created_at: string;
};

function LiveMeta() {
  return (
    <div className="inline-flex items-center gap-2 rounded-pill border border-border-default bg-bg-surface px-2.5 py-1 text-[12px] text-text-secondary">
      <span className="h-2 w-2 rounded-pill bg-success animate-pulse" aria-hidden />
      <span>Live</span>
    </div>
  );
}

export default function EscalationDashboardPage() {
  const [cases, setCases] = React.useState<Case[]>([]);
  const [filters, setFilters] = React.useState<Filters>({
    search: '',
    dispute_type: '',
    status: 'escalated_human_required',
  });

  const load = React.useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);

    if (filters.search) params.set('search', filters.search);
    if (filters.dispute_type) params.set('dispute_type', filters.dispute_type);

    const res = await api.get<{ cases: Case[]; total: number }>(`/cases?${params.toString()}`);
    setCases(
      [...res.cases].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    );
  }, [filters]);

  React.useEffect(() => {
    void load();
    const intervalId = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(intervalId);
  }, [load]);

  return (
    <AppShell role="escalation" title="Escalation Queue" titleMeta={<LiveMeta />}>
      <SearchFilterBar
        value={filters}
        onChange={setFilters}
        statusOptions={[
          { value: 'escalated_human_required', label: 'Escalated' },
          { value: 'approved_executing', label: 'Attended / In progress' },
          { value: 'resolved', label: 'Finished (Resolved)' },
          { value: 'closed', label: 'Closed' },
        ]}
      />

      <div className="mt-6">
        <DashboardGrid
          variant="escalation"
          cases={cases}
          emptyTitle={filters.status ? 'No cases in this status' : 'No cases found'}
          emptyDescription={
            filters.status
              ? 'Try another status or clear filters to see all escalation cases.'
              : 'No matching cases for the selected filters.'
          }
        />
      </div>
    </AppShell>
  );
}
