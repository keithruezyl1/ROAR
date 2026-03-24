'use client';

import * as React from 'react';

import { api } from '@/lib/api';
import { CaseStatusTracker } from '@/components/chat/CaseStatusTracker';

type PublicCaseStatus = {
  reference_number?: string;
  status: string;
  updated_at?: string;
};

export default function PublicCasePage({ params }: { params: { id: string } }) {
  const caseId = params.id;
  const [data, setData] = React.useState<PublicCaseStatus | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      const res = await api.get<PublicCaseStatus>(`/cases/${caseId}`);
      if (mounted) setData(res);
    };

    void load();
    const t = window.setInterval(() => void load(), 4000);

    return () => {
      mounted = false;
      window.clearInterval(t);
    };
  }, [caseId]);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <div className="mx-auto max-w-[880px] px-6 py-8">
        <div className="text-[24px] font-bold">Case status</div>
        <div className="mt-2 text-[13px] text-text-secondary">Public status for your case.</div>

        {data ? (
          <div className="mt-6 overflow-hidden rounded-card border border-border-default bg-bg-surface">
            <div className="p-6">
              <div className="text-[13px] text-text-secondary">Reference</div>
              <div className="mt-1 font-mono text-[12px]">{data.reference_number ?? ''}</div>
              <div className="mt-4">
                <CaseStatusTracker status={data.status} updatedAt={data.updated_at} defaultExpanded />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 text-[13px] text-text-muted">Loading…</div>
        )}
      </div>
    </div>
  );
}