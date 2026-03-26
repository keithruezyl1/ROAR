'use client';

import * as React from 'react';
import Link from 'next/link';

import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { Button } from '@/components/shared/Button';

type RefundRequest = {
  id: string;
  case_id: string;
  case_reference_number: string;
  case_status: string;
  order_id: string;
  amount: number;
  reason: string;
  status: 'pending' | 'processed' | 'failed';
  created_at: string;
};

export default function HistoryPage() {
  const [items, setItems] = React.useState<RefundRequest[]>([]);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await api.get<{ refund_requests: RefundRequest[] }>(
      `/refund_requests?status=pending`
    );
    setItems(res.refund_requests ?? []);
  }, []);

  React.useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(id);
  }, [load]);

  const approve = async (refundRequestId: string) => {
    setLoadingId(refundRequestId);
    try {
      await api.post(`/refund_requests/${refundRequestId}/approve`, {});
      await load();
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <AppShell role="approver" title="History">
      <div className="flex items-center justify-between">
        <div className="text-[24px] font-bold">History</div>
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <div className="rounded-card border border-border-default bg-bg-surface p-8 text-center">
            <div className="text-[16px] font-semibold">No pending requests</div>
            <div className="mt-1 text-[13px] text-text-muted">
              Refund requests waiting for approval will appear here.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((r) => (
              <div
                key={r.id}
                className="rounded-card border border-border-default bg-bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-mono text-[12px] text-text-secondary">
                        {r.case_reference_number}
                      </div>
                      <div className="font-mono text-[12px] text-text-muted">{r.order_id}</div>
                      <div className="text-[12px] text-text-muted">THB {r.amount.toFixed(2)}</div>
                      <div className="text-[12px] text-text-muted">status: {r.case_status}</div>
                    </div>
                    <div className="mt-2 line-clamp-2 text-[13px] text-text-secondary">
                      {r.reason}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[12px] text-text-muted">
                      <span className="font-mono">refund_request: {r.id}</span>
                      <Link
                        href={`/approver/${r.case_id}/chat`}
                        className="hover:underline"
                      >
                        Open chat
                      </Link>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="primary"
                      loading={loadingId === r.id}
                      onClick={() => void approve(r.id)}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
