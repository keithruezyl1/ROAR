'use client';

import * as React from 'react';
import Link from 'next/link';

import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/shared/Button';
import { api } from '@/lib/api';

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

type ReturnRequest = {
  id: string;
  case_id: string;
  case_reference_number: string;
  case_status: string;
  order_id: string;
  item_ids: string[];
  return_reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

type ReplacementRequest = {
  id: string;
  case_id: string;
  order_id: string;
  status: 'pending' | 'approved' | 'executing' | 'completed' | 'rejected' | 'cancelled';
  reason: string;
  eligible_amount: number | null;
  replacement_items: Array<{ product_name?: string | null; item_id?: string | null }>;
  created_at: string;
};

function LiveQueueMeta() {
  return (
    <div className="inline-flex items-center gap-2 rounded-pill border border-border-default bg-bg-surface px-2.5 py-1 text-[12px] text-text-secondary">
      <span className="h-2 w-2 animate-pulse rounded-pill bg-success" aria-hidden />
      <span>Live</span>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-TH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  if (normalized === 'awaiting_approval' || normalized === 'pending') {
    return 'border border-warning bg-warning-bg text-warning';
  }
  if (normalized === 'approved_executing' || normalized === 'approved' || normalized === 'executing') {
    return 'border border-info bg-info-bg text-info';
  }
  if (normalized === 'resolved' || normalized === 'completed' || normalized === 'closed' || normalized === 'processed') {
    return 'border border-success bg-success-bg text-success';
  }
  return 'border border-danger bg-danger-bg text-danger';
}

function statusDotClass(status: string) {
  const normalized = status.toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  if (normalized === 'awaiting_approval' || normalized === 'pending') {
    return 'bg-warning';
  }
  if (normalized === 'approved_executing' || normalized === 'approved' || normalized === 'executing') {
    return 'bg-info';
  }
  if (normalized === 'resolved' || normalized === 'completed' || normalized === 'closed' || normalized === 'processed') {
    return 'bg-success';
  }
  return 'bg-danger';
}

function QueueColumn({
  title,
  subtitle,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-[480px] flex-col rounded-card border border-border-default bg-bg-surface">
      <div className="border-b border-border-default px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[18px] font-semibold text-text-primary">{title}</div>
            <div className="mt-1 text-[13px] text-text-muted">{subtitle}</div>
          </div>
          <div className="rounded-pill border border-border-default bg-bg-elevated px-2.5 py-1 text-[12px] font-semibold text-text-secondary">
            {count}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">{children}</div>
    </section>
  );
}

function EmptyColumn({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-card border border-dashed border-border-default bg-bg-base px-6 py-10 text-center text-[14px] text-text-muted">
      {message}
    </div>
  );
}

export default function ApproverDashboardPage() {
  const [refunds, setRefunds] = React.useState<RefundRequest[]>([]);
  const [returns, setReturns] = React.useState<ReturnRequest[]>([]);
  const [replacements, setReplacements] = React.useState<ReplacementRequest[]>([]);
  const [loadingKey, setLoadingKey] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const [refundRes, returnRes, replacementRes] = await Promise.all([
      api.get<{ refund_requests: RefundRequest[] }>('/refund_requests?status=pending'),
      api.get<{ return_requests: ReturnRequest[] }>('/return_requests?status=pending'),
      api.get<{ replacement_requests: ReplacementRequest[] }>('/replacement-requests?status=pending'),
    ]);

    setRefunds(refundRes.refund_requests ?? []);
    setReturns(returnRes.return_requests ?? []);
    setReplacements(replacementRes.replacement_requests ?? []);
  }, []);

  React.useEffect(() => {
    void load();
    const intervalId = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(intervalId);
  }, [load]);

  const approveRefund = async (refundRequestId: string) => {
    setLoadingKey(`${refundRequestId}:approve-refund`);
    try {
      await api.post(`/refund_requests/${refundRequestId}/approve`, {});
      await load();
    } finally {
      setLoadingKey(null);
    }
  };

  const updateReturn = async (returnRequestId: string, status: 'approved' | 'rejected') => {
    let reason: string | undefined;
    if (status === 'rejected') {
      const input = window.prompt('Enter a rejection reason for this return request.');
      if (input == null) return;
      if (!input.trim()) {
        window.alert('A rejection reason is required.');
        return;
      }
      reason = input.trim();
    }

    setLoadingKey(`${returnRequestId}:${status}`);
    try {
      await api.patch(`/return_requests/${returnRequestId}`, { status, reason });
      await load();
    } finally {
      setLoadingKey(null);
    }
  };

  const updateReplacement = async (
    replacementRequestId: string,
    status: ReplacementRequest['status']
  ) => {
    let reason: string | undefined;
    if (status === 'rejected') {
      const input = window.prompt('Enter an optional rejection reason for this replacement request.');
      if (input == null) return;
      reason = input.trim() || undefined;
    }

    setLoadingKey(`${replacementRequestId}:${status}`);
    try {
      await api.patch(`/replacement-requests/${replacementRequestId}`, { status, reason });
      await load();
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <AppShell role="approver" title="Cases Queue" titleMeta={<LiveQueueMeta />}>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <QueueColumn
          title="Refund Requests"
          subtitle="Pending refund records created by the workflow."
          count={refunds.length}
        >
          {refunds.length === 0 ? (
            <EmptyColumn message="No pending refund requests right now." />
          ) : (
            refunds.map((item) => {
              const normalizedCaseStatus = item.case_status.toLowerCase().replaceAll('-', '_');
              const canApprove = normalizedCaseStatus === 'awaiting_approval' || normalizedCaseStatus === 'pending_approval';

              return (
                <article key={item.id} className="rounded-card border border-border-default bg-bg-elevated p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-[12px] text-text-muted">{item.case_reference_number}</div>
                      <div className="mt-1 text-[17px] font-semibold text-text-primary">Order {item.order_id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-pill ${statusDotClass(item.case_status)}`} aria-hidden />
                      <span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(item.case_status)}`}>
                        {item.case_status.replaceAll('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-[14px] text-text-primary">THB {item.amount.toFixed(2)}</div>
                  <div className="mt-2 text-[13px] text-text-muted">{item.reason}</div>
                  <div className="mt-2 text-[12px] text-text-muted">{formatDateTime(item.created_at)}</div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Link href={`/approver/${item.case_id}/chat`} className="text-[13px] font-medium text-primary hover:underline">
                      Open chat
                    </Link>
                    {canApprove ? (
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          loading={loadingKey === `${item.id}:approve-refund`}
                          onClick={() => void approveRefund(item.id)}
                        >
                          Approve
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </QueueColumn>

        <QueueColumn
          title="Return Requests"
          subtitle="Pending return records linked to customer cases."
          count={returns.length}
        >
          {returns.length === 0 ? (
            <EmptyColumn message="No pending return requests right now." />
          ) : (
            returns.map((item) => (
              <article key={item.id} className="rounded-card border border-border-default bg-bg-elevated p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[12px] text-text-muted">{item.case_reference_number}</div>
                    <div className="mt-1 text-[17px] font-semibold text-text-primary">Order {item.order_id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-pill ${statusDotClass(item.status)}`} aria-hidden />
                    <span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(item.case_status)}`}>
                      {item.case_status.replaceAll('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[13px] text-text-primary">{item.return_reason}</div>
                <div className="mt-2 text-[12px] text-text-muted">
                  {item.item_ids.length > 0 ? `${item.item_ids.length} item(s)` : 'No item ids attached'}
                </div>
                <div className="mt-2 text-[12px] text-text-muted">{formatDateTime(item.created_at)}</div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <Link href={`/approver/${item.case_id}/chat`} className="text-[13px] font-medium text-primary hover:underline">
                    Open chat
                  </Link>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      loading={loadingKey === `${item.id}:approved`}
                      onClick={() => void updateReturn(item.id, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={loadingKey === `${item.id}:rejected`}
                      onClick={() => void updateReturn(item.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </QueueColumn>

        <QueueColumn
          title="Replacement Requests"
          subtitle="Pending replacement requests waiting for next action."
          count={replacements.length}
        >
          {replacements.length === 0 ? (
            <EmptyColumn message="No pending replacement requests right now." />
          ) : (
            replacements.map((item) => (
              <article key={item.id} className="rounded-card border border-border-default bg-bg-elevated p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-[12px] text-text-muted">{item.id}</div>
                    <div className="mt-1 text-[17px] font-semibold text-text-primary">Order {item.order_id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-pill ${statusDotClass(item.status)}`} aria-hidden />
                    <span className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(item.status)}`}>
                      {item.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[13px] text-text-primary">{item.reason}</div>
                <div className="mt-2 text-[12px] text-text-muted">
                  {item.replacement_items.length > 0
                    ? `${item.replacement_items.length} replacement item(s)`
                    : 'No replacement items attached'}
                </div>
                <div className="mt-2 text-[12px] text-text-muted">
                  {item.eligible_amount != null ? `THB ${item.eligible_amount.toFixed(2)}` : 'Eligible amount not set'}
                </div>
                <div className="mt-2 text-[12px] text-text-muted">{formatDateTime(item.created_at)}</div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <Link href={`/approver/${item.case_id}/chat`} className="text-[13px] font-medium text-primary hover:underline">
                    Open chat
                  </Link>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      loading={loadingKey === `${item.id}:approved`}
                      onClick={() => void updateReplacement(item.id, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={loadingKey === `${item.id}:rejected`}
                      onClick={() => void updateReplacement(item.id, 'rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </QueueColumn>
      </div>
    </AppShell>
  );
}
