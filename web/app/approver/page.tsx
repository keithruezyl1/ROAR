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
  customer_name: string;
  order_id: string;
  created_at: string;
};

export default function ApproverDashboardPage() {
  const [cases, setCases] = React.useState<Case[]>([]);
  const [filters, setFilters] = React.useState<Filters>({
    search: '',
    dispute_type: '',
    status: '',
  });

  const load = React.useCallback(async () => {
    const params = new URLSearchParams();
    params.set('status', filters.status || 'awaiting_approval');

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
    <AppShell role="approver" title="Approval Queue">
      <SearchFilterBar
        value={filters}
        onChange={setFilters}
        statusOptions={[
          { value: 'awaiting_approval', label: 'Awaiting approval' },
          { value: 'approved_executing', label: 'Approved' },
          { value: 'rejected_human_required', label: 'Rejected' },
        ]}
      />

      <div className="mt-6">
        <DashboardGrid
          variant="approval"
          cases={cases}
          emptyTitle="No cases awaiting approval"
          emptyDescription="When triage completes, cases will appear here for review."
        />
      </div>
    </AppShell>
  );
}
