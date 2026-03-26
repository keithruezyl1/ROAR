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

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  if (normalized === 'closed' || normalized === 'resolved') {
    return 'border border-success bg-success-bg text-success';
  }
  if (normalized === 'awaiting_approval' || normalized === 'pending_approval') {
    return 'border border-warning bg-warning-bg text-warning';
  }
  if (normalized === 'rejected_human_required' || normalized === 'escalated_human_required') {
    return 'border border-info bg-info-bg text-info';
  }
  return 'border border-border-default bg-bg-sunken text-text-secondary';
}

function formatStatusLabel(status: string) {
  return status.replaceAll('_', ' ').replaceAll('-', ' ');
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-TH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-TH', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function HistoryPage() {
  const [items, setItems] = React.useState<RefundRequest[]>([]);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const res = await api.get<{ refund_requests: RefundRequest[] }>(`/refund_requests?status=pending`);
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
      <div className="mb-4 rounded-card border border-border-default bg-bg-surface px-4 py-3 text-[13px] text-text-secondary">
        Review previously submitted refund requests and open the linked customer chat when context is needed.
      </div>

      {items.length === 0 ? (
        <div className="rounded-card border border-border-default bg-bg-surface p-8 text-center">
          <div className="text-[16px] font-semibold">No pending requests</div>
          <div className="mt-1 text-[13px] text-text-muted">
            Refund requests waiting for approval will appear here.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((r) => {
            const normalizedCaseStatus = (r.case_status ?? '')
              .toLowerCase()
              .replaceAll('-', '_')
              .replaceAll(' ', '_');
            const canApprove =
              normalizedCaseStatus === 'awaiting_approval' ||
              normalizedCaseStatus === 'pending_approval';

            return (
              <article
                key={r.id}
                className="rounded-card border border-border-default bg-bg-surface p-4 transition-colors hover:border-border-focus"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-[13px] font-semibold text-text-primary">{r.case_reference_number}</span>
                      <span className={`rounded-pill px-2.5 py-[3px] text-[11px] font-semibold capitalize ${statusBadgeClass(r.case_status)}`}>
                        {formatStatusLabel(r.case_status)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="rounded-btn border border-border-default bg-bg-elevated px-2.5 py-1 text-text-secondary">
                        <span className="mr-1 text-text-muted">Date</span>
                        <span className="font-semibold text-text-primary">{formatDate(r.created_at)}</span>
                      </span>
                      <span className="rounded-btn border border-border-default bg-bg-elevated px-2.5 py-1 text-text-secondary">
                        <span className="mr-1 text-text-muted">Time</span>
                        <span className="font-semibold text-text-primary">{formatTime(r.created_at)}</span>
                      </span>
                      <span className="rounded-btn border border-border-default bg-bg-elevated px-2.5 py-1 text-text-secondary">
                        <span className="mr-1 text-text-muted">Order</span>
                        <span className="font-mono font-semibold text-text-primary">{r.order_id}</span>
                      </span>
                      <span className="rounded-btn border border-border-default bg-bg-elevated px-2.5 py-1 text-text-secondary">
                        <span className="mr-1 text-text-muted">Amount</span>
                        <span className="font-semibold text-text-primary">THB {r.amount.toFixed(2)}</span>
                      </span>
                    </div>

                    <div className="mt-3">
                      <Link href={`/approver/${r.case_id}/chat`} className="text-[13px] font-medium text-primary hover:underline">
                        Open chat
                      </Link>
                    </div>
                  </div>

                  {canApprove ? (
                    <Button
                      variant="primary"
                      loading={loadingId === r.id}
                      onClick={() => void approve(r.id)}
                      className="shrink-0"
                    >
                      Approve
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
